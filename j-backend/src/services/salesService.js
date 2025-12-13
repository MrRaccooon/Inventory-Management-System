/**
 * Sales management service.
 * Handles sale creation, processing, and stock updates with ACID safety.
 */
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { Sale, SaleItem, Product } = require('../models');
const { sequelize } = require('../db');
const { recordStockMovement, validateStockAvailability, getCurrentStock } = require('../utils/ledger');
const { calculateLineItemGST, aggregateGSTBreakdown } = require('../utils/gst');
const { logAction } = require('../utils/audit');
const { format } = require('date-fns');

/**
 * Generate a unique invoice number.
 */
const generateInvoiceNumber = async (shopId) => {
  const today = new Date();
  const datePrefix = format(today, 'yyyyMMdd');
  
  const lastSale = await Sale.findOne({
    where: {
      shop_id: shopId,
      invoice_no: { [Op.like]: `INV-${datePrefix}-%` },
    },
    order: [['created_at', 'DESC']],
  });
  
  let sequence = 1;
  if (lastSale) {
    const parts = lastSale.invoice_no.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }
  
  return `INV-${datePrefix}-${String(sequence).padStart(4, '0')}`;
};

/**
 * Create a new sale with items.
 */
const createSale = async (shopId, saleData, createdBy = null) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validate stock availability for all items
    for (const item of saleData.items) {
      const available = await validateStockAvailability(item.product_id, shopId, item.quantity);
      if (!available) {
        const product = await Product.findByPk(item.product_id);
        const currentStock = await getCurrentStock(item.product_id, shopId);
        throw new Error(
          `Insufficient stock for product ${product?.name || item.product_id}. ` +
          `Requested: ${item.quantity}, Available: ${currentStock}`,
        );
      }
    }
    
    // Generate invoice number
    const invoiceNo = await generateInvoiceNumber(shopId);
    
    // Create sale record
    const sale = await Sale.create({
      id: uuidv4(),
      shop_id: shopId,
      invoice_no: invoiceNo,
      payment_type: saleData.payment_type || 'cash',
      customer_info: saleData.customer_info || {},
      notes: saleData.notes,
      status: 'paid',
      created_by: createdBy,
    }, { transaction });
    
    // Process each item
    let totalAmount = 0;
    let totalCost = 0;
    const lineItemsGst = [];
    
    for (const itemData of saleData.items) {
      const product = await Product.findByPk(itemData.product_id);
      if (!product) {
        throw new Error(`Product ${itemData.product_id} not found`);
      }
      
      const gstBreakdown = calculateLineItemGST(
        itemData.quantity,
        parseFloat(itemData.unit_price),
        parseFloat(itemData.discount || 0),
        itemData.gst_rate || 18.0,
      );
      
      await SaleItem.create({
        id: uuidv4(),
        sale_id: sale.id,
        product_id: itemData.product_id,
        quantity: itemData.quantity,
        unit_price: itemData.unit_price,
        unit_cost: product.cost_price,
        discount: itemData.discount || 0,
        tax_breakdown: gstBreakdown,
        line_total: gstBreakdown.line_total,
      }, { transaction });
      
      // Record stock movement
      await recordStockMovement({
        shopId,
        productId: itemData.product_id,
        changeQty: -itemData.quantity,
        reason: 'sale',
        createdBy,
        referenceType: 'sale',
        referenceId: sale.id,
        metaData: {
          invoice_no: invoiceNo,
          quantity: itemData.quantity,
          unit_price: parseFloat(itemData.unit_price),
        },
      });
      
      totalAmount += gstBreakdown.line_total;
      totalCost += itemData.quantity * parseFloat(product.cost_price);
      lineItemsGst.push(gstBreakdown);
    }
    
    // Aggregate GST breakdown
    const aggregatedGst = aggregateGSTBreakdown(lineItemsGst);
    const profit = totalAmount - totalCost;
    
    // Update sale totals
    await sale.update({
      total_amount: totalAmount,
      total_cost: totalCost,
      profit,
      gst_breakdown: aggregatedGst,
    }, { transaction });
    
    await logAction({
      action: 'create_sale',
      userId: createdBy,
      shopId,
      objectType: 'sale',
      objectId: sale.id,
      payload: {
        invoice_no: invoiceNo,
        total_amount: totalAmount,
        item_count: saleData.items.length,
      },
    });
    
    await transaction.commit();
    
    // Reload with associations
    return Sale.findByPk(sale.id, {
      include: [{
        model: SaleItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }],
      }],
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get a single sale by ID.
 */
const getSale = async (saleId, shopId) => {
  return Sale.findOne({
    where: { id: saleId, shop_id: shopId },
    include: [{
      model: SaleItem,
      as: 'items',
      include: [{ model: Product, as: 'product' }],
    }],
  });
};

/**
 * List sales with filtering and pagination.
 */
const listSales = async (shopId, options = {}) => {
  const {
    skip = 0,
    limit = 100,
    startDate = null,
    endDate = null,
    paymentType = null,
    status = null,
    search = null,
  } = options;
  
  const where = { shop_id: shopId };
  
  if (startDate) {
    where.created_at = { ...where.created_at, [Op.gte]: new Date(startDate) };
  }
  if (endDate) {
    where.created_at = { ...where.created_at, [Op.lte]: new Date(endDate) };
  }
  if (paymentType) {
    where.payment_type = paymentType;
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where.invoice_no = { [Op.iLike]: `%${search}%` };
  }
  
  const { count, rows } = await Sale.findAndCountAll({
    where,
    include: [{
      model: SaleItem,
      as: 'items',
      include: [{ model: Product, as: 'product' }],
    }],
    order: [['created_at', 'DESC']],
    offset: skip,
    limit,
  });
  
  return { sales: rows, total: count };
};

/**
 * Update a sale.
 */
const updateSale = async (saleId, shopId, saleData, updatedBy = null) => {
  const sale = await getSale(saleId, shopId);
  if (!sale) return null;
  
  const updateFields = {};
  const allowedFields = ['payment_type', 'customer_info', 'notes', 'status'];
  
  for (const field of allowedFields) {
    if (saleData[field] !== undefined) {
      updateFields[field] = saleData[field];
    }
  }
  
  await sale.update(updateFields);
  
  await logAction({
    action: 'update_sale',
    userId: updatedBy,
    shopId,
    objectType: 'sale',
    objectId: saleId,
    payload: updateFields,
  });
  
  return sale;
};

/**
 * Void a sale and restore stock.
 */
const voidSale = async (saleId, shopId, voidedBy = null) => {
  const sale = await getSale(saleId, shopId);
  if (!sale) return null;
  
  if (sale.status === 'void') {
    return sale;
  }
  
  // Restore stock for each item
  for (const item of sale.items) {
    await recordStockMovement({
      shopId,
      productId: item.product_id,
      changeQty: item.quantity,
      reason: 'return',
      createdBy: voidedBy,
      referenceType: 'sale_void',
      referenceId: sale.id,
      metaData: { original_invoice_no: sale.invoice_no },
    });
  }
  
  await sale.update({ status: 'void' });
  
  await logAction({
    action: 'void_sale',
    userId: voidedBy,
    shopId,
    objectType: 'sale',
    objectId: saleId,
    payload: { invoice_no: sale.invoice_no },
  });
  
  return sale;
};

module.exports = {
  generateInvoiceNumber,
  createSale,
  getSale,
  listSales,
  updateSale,
  voidSale,
};

