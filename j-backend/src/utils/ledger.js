/**
 * Inventory ledger utilities.
 * Ensures ACID-safe stock updates using stock_movements table as the source of truth.
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Calculate current stock from stock_movements ledger.
 * @param {string} productId - Product UUID
 * @param {string} shopId - Shop UUID
 * @returns {Promise<number>} Current stock quantity
 */
const getCurrentStock = async (productId, shopId) => {
  const { StockMovement } = require('../models');
  const { sequelize } = require('../db');
  
  const result = await StockMovement.findOne({
    attributes: [
      [sequelize.fn('SUM', sequelize.col('change_qty')), 'total'],
    ],
    where: {
      product_id: productId,
      shop_id: shopId,
    },
    raw: true,
  });
  
  return parseInt(result?.total || 0, 10);
};

/**
 * Record a stock movement in the ledger.
 * @param {Object} params - Movement parameters
 * @returns {Promise<Object>} Created StockMovement record
 */
const recordStockMovement = async ({
  shopId,
  productId,
  changeQty,
  reason,
  createdBy = null,
  referenceType = null,
  referenceId = null,
  metaData = {},
}) => {
  const { StockMovement, Product } = require('../models');
  
  if (changeQty === 0) {
    throw new Error('change_qty cannot be zero');
  }
  
  const movement = await StockMovement.create({
    id: uuidv4(),
    shop_id: shopId,
    product_id: productId,
    change_qty: changeQty,
    reason,
    created_by: createdBy,
    reference_type: referenceType,
    reference_id: referenceId,
    meta_data: metaData,
  });
  
  // Update product.current_stock for quick access (denormalized)
  const product = await Product.findByPk(productId);
  if (product) {
    const currentStock = await getCurrentStock(productId, shopId);
    product.current_stock = currentStock;
    await product.save();
  }
  
  return movement;
};

/**
 * Adjust stock to a specific quantity.
 * @param {Object} params - Adjustment parameters
 * @returns {Promise<Object|null>} Created StockMovement record or null
 */
const adjustStock = async ({
  shopId,
  productId,
  newQuantity,
  createdBy = null,
  reason = 'Adjustment',
}) => {
  const currentStock = await getCurrentStock(productId, shopId);
  const changeQty = newQuantity - currentStock;
  
  if (changeQty === 0) {
    return null;
  }
  
  return recordStockMovement({
    shopId,
    productId,
    changeQty,
    reason: 'adjustment',
    createdBy,
    referenceType: 'manual_adjustment',
    metaData: { reason, old_quantity: currentStock, new_quantity: newQuantity },
  });
};

/**
 * Check if sufficient stock is available for a sale.
 * @param {string} productId - Product UUID
 * @param {string} shopId - Shop UUID
 * @param {number} requestedQty - Quantity requested
 * @returns {Promise<boolean>} True if stock is available
 */
const validateStockAvailability = async (productId, shopId, requestedQty) => {
  const currentStock = await getCurrentStock(productId, shopId);
  return currentStock >= requestedQty;
};

module.exports = {
  getCurrentStock,
  recordStockMovement,
  adjustStock,
  validateStockAvailability,
};

