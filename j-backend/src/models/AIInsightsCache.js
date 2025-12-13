/**
 * AIInsightsCache model - Caches AI-generated insights.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const AIInsightsCache = sequelize.define('AIInsightsCache', {
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
  insight_key: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  model_version: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'ai_insights_cache',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = AIInsightsCache;

