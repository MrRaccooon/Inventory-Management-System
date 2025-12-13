/**
 * Shop model - Represents a business/store in the system.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  owner_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  timezone: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'UTC',
  },
  currency: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'INR',
  },
  gst_number: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'shops',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Shop;

