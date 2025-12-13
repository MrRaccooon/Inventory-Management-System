/**
 * Invoice service.
 * Migrated from app/services/invoice_service.py
 */
const { v4: uuidv4 } = require('uuid');
const { Invoice, Sale, SaleItem, Product } = require('../models');
const config = require('../config');

/**
 * Generate invoice number.
 */
const generateInvoiceNumber = async (_shopId) => {
  const today = new Date();
  const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const lastInvoice = await Invoice.findOne({
    where: { invoice_number: { [require('sequelize').Op.like]: `${prefix}%` } },
    order: [['invoice_number', 'DESC']],
  });
  
  let sequence = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoice_number.split('-').pop(), 10);
    sequence = lastSeq + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(5, '0')}`;
};

/**
 * Create invoice for a sale.
 */
const createInvoice = async (saleId, shopId, userId) => {
  const sale = await Sale.findOne({
    where: { id: saleId, shop_id: shopId },
    include: [{
      model: SaleItem,
      as: 'items',
      include: [{ model: Product, as: 'product' }],
    }],
  });
  
  if (!sale) {
    throw new Error('Sale not found');
  }
  
  // Check if invoice already exists
  const existingInvoice = await Invoice.findOne({
    where: { sale_id: saleId },
  });
  
  if (existingInvoice) {
    throw new Error('Invoice already exists for this sale');
  }
  
  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(shopId);
  
  // Calculate GST breakup
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  
  const itemDetails = sale.items.map(item => {
    const gstRate = parseFloat(item.product?.gst_rate || config.gst.defaultRate);
    const itemTotal = parseFloat(item.total_price);
    const taxAmount = itemTotal * (gstRate / (100 + gstRate));
    const cgst = taxAmount / 2;
    const sgst = taxAmount / 2;
    
    totalCGST += cgst;
    totalSGST += sgst;
    
    return {
      product_id: item.product_id,
      product_name: item.product?.name || 'Unknown',
      hsn_code: item.product?.hsn_code || '',
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price),
      discount_percent: parseFloat(item.discount_percent),
      total_price: itemTotal,
      gst_rate: gstRate,
      cgst: cgst,
      sgst: sgst,
    };
  });
  
  // Create invoice
  const invoice = await Invoice.create({
    id: uuidv4(),
    sale_id: saleId,
    invoice_number: invoiceNumber,
    invoice_date: new Date(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    customer_info: sale.customer_info,
    item_details: itemDetails,
    subtotal: parseFloat(sale.subtotal),
    discount_amount: parseFloat(sale.discount_amount),
    cgst_amount: totalCGST,
    sgst_amount: totalSGST,
    igst_amount: totalIGST,
    total_tax: totalCGST + totalSGST + totalIGST,
    total_amount: parseFloat(sale.total_amount),
    amount_paid: parseFloat(sale.total_amount),
    amount_due: 0,
    payment_status: 'paid',
    notes: sale.notes,
    created_by: userId,
  });
  
  return invoice;
};

/**
 * Get invoice details.
 */
const getInvoiceDetails = async (invoiceId, shopId) => {
  const invoice = await Invoice.findOne({
    where: { id: invoiceId },
    include: [{
      model: Sale,
      as: 'sale',
      where: { shop_id: shopId },
    }],
  });
  
  return invoice;
};

/**
 * List invoices for a shop.
 */
const listInvoices = async (shopId, options = {}) => {
  const {
    startDate,
    endDate,
    paymentStatus,
    skip = 0,
    limit = 100,
  } = options;
  
  const where = {};
  
  if (paymentStatus) {
    where.payment_status = paymentStatus;
  }
  
  if (startDate) {
    where.invoice_date = {
      ...where.invoice_date,
      [require('sequelize').Op.gte]: new Date(startDate),
    };
  }
  
  if (endDate) {
    where.invoice_date = {
      ...where.invoice_date,
      [require('sequelize').Op.lte]: new Date(endDate),
    };
  }
  
  const { count, rows } = await Invoice.findAndCountAll({
    where,
    include: [{
      model: Sale,
      as: 'sale',
      where: { shop_id: shopId },
    }],
    order: [['invoice_date', 'DESC']],
    offset: skip,
    limit,
  });
  
  return { invoices: rows, total: count };
};

module.exports = {
  generateInvoiceNumber,
  createInvoice,
  getInvoiceDetails,
  listInvoices,
};

