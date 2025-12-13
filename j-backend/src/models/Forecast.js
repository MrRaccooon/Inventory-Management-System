/**
 * Forecast model - Demand forecasting data.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Forecast = sequelize.define('Forecast', {
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
    allowNull: true,
    references: {
      model: 'products',
      key: 'id',
    },
  },
  for_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  forecast_qty: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  },
  lower_bound: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: true,
  },
  upper_bound: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: true,
  },
  model_version: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'forecasts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = Forecast;

