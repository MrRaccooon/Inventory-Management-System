/**
 * Inventory management service.
 * Handles product CRUD, stock management, and inventory operations.
 */
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { Product, Category } = require('../models');
const { recordStockMovement, getCurrentStock, adjustStock } = require('../utils/ledger');
const { logAction } = require('../utils/audit');

/**
 * Create a new product.
 */
const createProduct = async (shopId, productData, createdBy = null) => {
  const product = await Product.create({
    id: uuidv4(),
    shop_id: shopId,
    sku: productData.sku,
    name: productData.name,
    description: productData.description,
    category_id: productData.category_id,
    price_mrp: productData.price_mrp,
    cost_price: productData.cost_price,
    min_stock_threshold: productData.min_stock_threshold || 0,
    barcode: productData.barcode,
    reorder_qty: productData.reorder_qty || 0,
    lead_time_days: productData.lead_time_days || 0,
    attributes: productData.attributes || {},
    is_active: productData.is_active !== false,
  });
  
  // Set initial stock if provided
  if (productData.initial_stock > 0) {
    await recordStockMovement({
      shopId,
      productId: product.id,
      changeQty: productData.initial_stock,
      reason: 'purchase',
      createdBy,
      referenceType: 'initial_stock',
      metaData: { initial_setup: true },
    });
  }
  
  await logAction({
    action: 'create_product',
    userId: createdBy,
    shopId,
    objectType: 'product',
    objectId: product.id,
    payload: { sku: productData.sku, name: productData.name },
  });
  
  return product;
};

/**
 * Get a single product by ID.
 */
const getProduct = async (productId, shopId) => {
  const product = await Product.findOne({
    where: { id: productId, shop_id: shopId },
    include: [{ model: Category, as: 'category' }],
  });
  
  if (product) {
    product.current_stock = await getCurrentStock(productId, shopId);
  }
  
  return product;
};

/**
 * List products with filtering and pagination.
 */
const listProducts = async (shopId, options = {}) => {
  const {
    skip = 0,
    limit = 100,
    categoryId = null,
    search = null,
    isActive = null,
    lowStockOnly = false,
  } = options;
  
  const where = { shop_id: shopId };
  
  if (categoryId) {
    where.category_id = categoryId;
  }
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { sku: { [Op.iLike]: `%${search}%` } },
      { barcode: { [Op.iLike]: `%${search}%` } },
    ];
  }
  
  if (isActive !== null) {
    where.is_active = isActive;
  }
  
  if (lowStockOnly) {
    where.current_stock = { [Op.lte]: { [Op.col]: 'min_stock_threshold' } };
  }
  
  const { count, rows } = await Product.findAndCountAll({
    where,
    include: [{ model: Category, as: 'category' }],
    order: [['created_at', 'DESC']],
    offset: skip,
    limit,
  });
  
  // Update current_stock from ledger
  for (const product of rows) {
    product.current_stock = await getCurrentStock(product.id, shopId);
  }
  
  return { products: rows, total: count };
};

/**
 * Update a product.
 */
const updateProduct = async (productId, shopId, productData, updatedBy = null) => {
  const product = await getProduct(productId, shopId);
  if (!product) return null;
  
  const updateFields = {};
  const allowedFields = [
    'name', 'description', 'category_id', 'price_mrp', 'cost_price',
    'min_stock_threshold', 'barcode', 'reorder_qty', 'lead_time_days',
    'attributes', 'is_active',
  ];
  
  for (const field of allowedFields) {
    if (productData[field] !== undefined) {
      updateFields[field] = productData[field];
    }
  }
  
  await product.update(updateFields);
  
  await logAction({
    action: 'update_product',
    userId: updatedBy,
    shopId,
    objectType: 'product',
    objectId: productId,
    payload: updateFields,
  });
  
  return product;
};

/**
 * Adjust product stock to a specific quantity.
 */
const adjustProductStock = async (productId, shopId, newQuantity, reason, createdBy = null) => {
  const product = await getProduct(productId, shopId);
  if (!product) return null;
  
  await adjustStock({
    shopId,
    productId,
    newQuantity,
    createdBy,
    reason,
  });
  
  await logAction({
    action: 'adjust_stock',
    userId: createdBy,
    shopId,
    objectType: 'product',
    objectId: productId,
    payload: { new_quantity: newQuantity, reason },
  });
  
  product.current_stock = await getCurrentStock(productId, shopId);
  return product;
};

/**
 * Get inventory summary statistics.
 */
const getInventorySummary = async (shopId) => {
  const products = await Product.findAll({ where: { shop_id: shopId } });
  
  let totalProducts = products.length;
  let itemsInStock = 0;
  let lowStockCount = 0;
  let outOfStock = 0;
  let totalStockValue = 0;
  
  for (const product of products) {
    const stock = await getCurrentStock(product.id, shopId);
    
    if (stock > 0) {
      itemsInStock++;
      totalStockValue += stock * parseFloat(product.cost_price);
    }
    
    if (stock <= product.min_stock_threshold && stock > 0) {
      lowStockCount++;
    }
    
    if (stock <= 0) {
      outOfStock++;
    }
  }
  
  // New products this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const newThisMonth = await Product.count({
    where: {
      shop_id: shopId,
      created_at: { [Op.gte]: monthStart },
    },
  });
  
  return {
    total_products: totalProducts,
    items_in_stock: itemsInStock,
    low_stock_count: lowStockCount,
    out_of_stock: outOfStock,
    total_stock_value: totalStockValue,
    new_this_month: newThisMonth,
  };
};

module.exports = {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
  adjustProductStock,
  getInventorySummary,
};

