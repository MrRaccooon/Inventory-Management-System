/**
 * Notification service for automated alerts.
 */
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { Notification, Product } = require('../models');

/**
 * Create a low stock alert notification.
 */
const createLowStockAlert = async (shopId, product, targetUserId = null) => {
  const notification = await Notification.create({
    id: uuidv4(),
    shop_id: shopId,
    target_user_id: targetUserId,
    type: 'warning',
    title: 'Low Stock Alert',
    message: `Product '${product.name}' (SKU: ${product.sku}) is running low. Current stock: ${product.current_stock}, Reorder point: ${product.min_stock_threshold}`,
    is_read: false,
  });
  
  return notification;
};

/**
 * Check all products for low stock and create alerts.
 */
const checkAndAlertLowStock = async (shopId) => {
  const { getCurrentStock } = require('../utils/ledger');
  
  const products = await Product.findAll({
    where: { shop_id: shopId },
  });
  
  const notifications = [];
  
  for (const product of products) {
    const currentStock = await getCurrentStock(product.id, shopId);
    
    if (currentStock <= product.min_stock_threshold) {
      // Check if alert already exists
      const existingAlert = await Notification.findOne({
        where: {
          shop_id: shopId,
          type: 'warning',
          title: 'Low Stock Alert',
          message: { [Op.like]: `%${product.sku}%` },
          is_read: false,
        },
      });
      
      if (!existingAlert) {
        product.current_stock = currentStock;
        const notification = await createLowStockAlert(shopId, product);
        notifications.push(notification);
      }
    }
  }
  
  return notifications;
};

module.exports = {
  createLowStockAlert,
  checkAndAlertLowStock,
};

