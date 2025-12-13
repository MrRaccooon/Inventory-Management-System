/**
 * AI Analytics service.
 * Handles forecasting, predictions, and AI-powered insights.
 */
const { v4: uuidv4 } = require('uuid');
const { Op, fn, col } = require('sequelize');
const { Forecast, AIInsightsCache, Sale, SaleItem, Product } = require('../models');
const { getCurrentStock } = require('../utils/ledger');
const config = require('../config');
const { subDays, addDays } = require('date-fns');

/**
 * Get cached AI insights or generate new ones.
 */
const getOrCreateAIInsights = async (shopId, forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = await AIInsightsCache.findOne({
      where: {
        shop_id: shopId,
        insight_key: 'main_insights',
        expires_at: { [Op.gt]: new Date() },
      },
    });
    
    if (cached) {
      return cached.payload;
    }
  }
  
  const insights = await generateAIInsights(shopId);
  
  await AIInsightsCache.create({
    id: uuidv4(),
    shop_id: shopId,
    insight_key: 'main_insights',
    payload: insights,
    model_version: config.FORECAST_MODEL_VERSION,
    expires_at: new Date(Date.now() + config.AI_CACHE_TTL_HOURS * 60 * 60 * 1000),
  });
  
  return insights;
};

/**
 * Generate AI insights based on sales data.
 */
const generateAIInsights = async (shopId) => {
  const lookbackDate = subDays(new Date(), config.FORECAST_LOOKBACK_DAYS);
  
  // Get total items sold
  const salesData = await SaleItem.findOne({
    attributes: [[fn('SUM', col('quantity')), 'total']],
    include: [{
      model: Sale,
      as: 'sale',
      where: {
        shop_id: shopId,
        created_at: { [Op.gte]: lookbackDate },
        status: { [Op.ne]: 'void' },
      },
      attributes: [],
    }],
    raw: true,
  });
  
  const totalItemsSold = parseInt(salesData?.total || 0, 10);
  const daysInPeriod = config.FORECAST_LOOKBACK_DAYS;
  const avgDailyDemand = daysInPeriod > 0 ? totalItemsSold / daysInPeriod : 0;
  const predictedDemand = avgDailyDemand * 30;
  
  // Get revenue
  const sales = await Sale.findAll({
    where: {
      shop_id: shopId,
      created_at: { [Op.gte]: lookbackDate },
      status: { [Op.ne]: 'void' },
    },
  });
  
  const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
  const monthsInPeriod = daysInPeriod / 30;
  const expectedRevenue = monthsInPeriod > 0 ? totalRevenue / monthsInPeriod : 0;
  
  // Get products for restock recommendations
  const products = await Product.findAll({ where: { shop_id: shopId } });
  const restockRecommendations = [];
  
  for (const product of products) {
    const currentStock = await getCurrentStock(product.id, shopId);
    
    if (currentStock <= product.min_stock_threshold) {
      const urgency = currentStock === 0 ? 'critical' : 'high';
      restockRecommendations.push({
        product_id: product.id,
        product_name: product.name,
        current_stock: currentStock,
        recommended_qty: Math.max(Math.round(avgDailyDemand * 1.5 * 30), product.reorder_qty || 10),
        urgency,
        reason: `Stock below threshold (${product.min_stock_threshold})`,
      });
    }
  }
  
  const expectedStockOuts = restockRecommendations.filter(r => r.urgency === 'critical').length;
  
  return {
    predicted_demand: predictedDemand,
    expected_revenue: expectedRevenue,
    expected_stock_outs: expectedStockOuts,
    slow_moving_items: 0,
    high_risk_items: 0,
    restock_recommendations: restockRecommendations,
    seasonal_insights: [],
    price_optimizations: [],
    declining_interest: [],
    model_version: config.FORECAST_MODEL_VERSION,
    last_updated: new Date().toISOString(),
  };
};

/**
 * Generate demand forecast for products.
 */
const generateForecast = async (shopId, productId = null, forecastDate = null) => {
  const targetDate = forecastDate ? new Date(forecastDate) : addDays(new Date(), 30);
  const lookbackDate = subDays(new Date(), config.FORECAST_LOOKBACK_DAYS);
  
  let products;
  if (productId) {
    const product = await Product.findByPk(productId);
    products = product ? [product] : [];
  } else {
    products = await Product.findAll({ where: { shop_id: shopId } });
  }
  
  const forecasts = [];
  const daysInPeriod = config.FORECAST_LOOKBACK_DAYS;
  
  for (const product of products) {
    const salesData = await SaleItem.findOne({
      attributes: [[fn('SUM', col('quantity')), 'total']],
      include: [{
        model: Sale,
        as: 'sale',
        where: {
          shop_id: shopId,
          created_at: { [Op.gte]: lookbackDate },
          status: { [Op.ne]: 'void' },
        },
        attributes: [],
      }],
      where: { product_id: product.id },
      raw: true,
    });
    
    const totalSold = parseInt(salesData?.total || 0, 10);
    const avgDaily = daysInPeriod > 0 ? totalSold / daysInPeriod : 0;
    const daysUntil = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24));
    const forecastQty = avgDaily * daysUntil;
    
    const forecast = await Forecast.create({
      id: uuidv4(),
      shop_id: shopId,
      product_id: product.id,
      for_date: targetDate,
      forecast_qty: forecastQty,
      lower_bound: forecastQty * 0.8,
      upper_bound: forecastQty * 1.2,
      model_version: config.FORECAST_MODEL_VERSION,
    });
    
    forecasts.push(forecast);
  }
  
  return forecasts;
};

module.exports = {
  getOrCreateAIInsights,
  generateAIInsights,
  generateForecast,
};

