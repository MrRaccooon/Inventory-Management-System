/**
 * StockMovement model - Tracks all inventory changes (ledger).
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const STOCK_MOVEMENT_REASONS = ['sale', 'purchase', 'adjustment', 'return', 'correction', 'transfer'];

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  shop_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'shops',
      key: 'id',
    },
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id',
    },
  },
  change_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reason: {
    type: DataTypes.ENUM(...STOCK_MOVEMENT_REASONS),
    allowNull: false,
  },
  reference_type: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reference_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  meta_data: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  tableName: 'stock_movements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

StockMovement.STOCK_MOVEMENT_REASONS = STOCK_MOVEMENT_REASONS;

module.exports = StockMovement;

