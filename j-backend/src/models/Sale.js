/**
 * Sale model - Sales transactions.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const PAYMENT_TYPES = ['cash', 'card', 'upi', 'credit', 'other'];
const INVOICE_STATUSES = ['draft', 'paid', 'pending', 'void', 'refunded'];

const Sale = sequelize.define('Sale', {
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
  invoice_no: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_cost: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  profit: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  payment_type: {
    type: DataTypes.ENUM(...PAYMENT_TYPES),
    allowNull: false,
    defaultValue: 'cash',
  },
  customer_info: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(...INVOICE_STATUSES),
    allowNull: false,
    defaultValue: 'paid',
  },
  gst_breakdown: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  rounding_adjustment: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  tableName: 'sales',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

Sale.PAYMENT_TYPES = PAYMENT_TYPES;
Sale.INVOICE_STATUSES = INVOICE_STATUSES;

module.exports = Sale;

