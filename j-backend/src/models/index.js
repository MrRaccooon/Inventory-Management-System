/**
 * Database models package.
 * Imports all models and sets up associations.
 */
const Shop = require('./Shop');
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const StockMovement = require('./StockMovement');
const Invoice = require('./Invoice');
const Forecast = require('./Forecast');
const AIInsightsCache = require('./AIInsightsCache');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const EmployeeAttendance = require('./EmployeeAttendance');
const RefreshToken = require('./RefreshToken');
const Customer = require('./Customer');
const Supplier = require('./Supplier');

// Define associations

// Shop associations
Shop.hasMany(User, { foreignKey: 'shop_id', as: 'users' });
Shop.hasMany(Category, { foreignKey: 'shop_id', as: 'categories' });
Shop.hasMany(Product, { foreignKey: 'shop_id', as: 'products' });
Shop.hasMany(Sale, { foreignKey: 'shop_id', as: 'sales' });
Shop.hasMany(StockMovement, { foreignKey: 'shop_id', as: 'stockMovements' });
Shop.hasMany(Forecast, { foreignKey: 'shop_id', as: 'forecasts' });
Shop.hasMany(AIInsightsCache, { foreignKey: 'shop_id', as: 'aiInsights' });
Shop.hasMany(Notification, { foreignKey: 'shop_id', as: 'notifications' });
Shop.hasMany(Invoice, { foreignKey: 'shop_id', as: 'invoices' });
Shop.hasMany(EmployeeAttendance, { foreignKey: 'shop_id', as: 'employeeAttendance' });
Shop.hasMany(AuditLog, { foreignKey: 'shop_id', as: 'auditLogs' });
Shop.hasMany(Customer, { foreignKey: 'shop_id', as: 'customers' });
Shop.hasMany(Supplier, { foreignKey: 'shop_id', as: 'suppliers' });

// User associations
User.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
User.hasMany(Sale, { foreignKey: 'created_by', as: 'sales' });
User.hasMany(StockMovement, { foreignKey: 'created_by', as: 'stockMovements' });
User.hasMany(EmployeeAttendance, { foreignKey: 'employee_id', as: 'attendance' });
User.hasMany(Notification, { foreignKey: 'target_user_id', as: 'notifications' });
User.hasMany(Invoice, { foreignKey: 'issued_by', as: 'invoicesIssued' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });

// Category associations
Category.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parent' });
Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' });
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });

// Product associations
Product.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'saleItems' });
Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'stockMovements' });
Product.hasMany(Forecast, { foreignKey: 'product_id', as: 'forecasts' });

// Sale associations
Sale.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Sale.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
Sale.hasMany(Invoice, { foreignKey: 'sale_id', as: 'invoices' });

// SaleItem associations
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// StockMovement associations
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
StockMovement.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
StockMovement.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

// Invoice associations
Invoice.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
Invoice.belongsTo(User, { foreignKey: 'issued_by', as: 'issuedByUser' });

// Forecast associations
Forecast.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Forecast.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });

// AIInsightsCache associations
AIInsightsCache.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });

// Notification associations
Notification.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Notification.belongsTo(User, { foreignKey: 'target_user_id', as: 'targetUser' });

// AuditLog associations
AuditLog.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// EmployeeAttendance associations
EmployeeAttendance.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });
EmployeeAttendance.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });

// RefreshToken associations
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Customer associations
Customer.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });

// Supplier associations
Supplier.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });

module.exports = {
  Shop,
  User,
  Category,
  Product,
  Sale,
  SaleItem,
  StockMovement,
  Invoice,
  Forecast,
  AIInsightsCache,
  Notification,
  AuditLog,
  EmployeeAttendance,
  RefreshToken,
  Customer,
  Supplier,
};

