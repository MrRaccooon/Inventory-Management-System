/**
 * Forecast worker using Bull queue.
 * Replaces Celery forecast_worker.py
 */
const Queue = require('bull');
const config = require('../config');
const { Product, Forecast, sequelize } = require('../models');
// const { Op } = require('sequelize');

// Create queue
const forecastQueue = new Queue('forecast', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

/**
 * Generate demand forecast for a product.
 */
const generateForecast = async (productId, shopId, lookbackDays = 180, forecastDays = 30) => {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
  
  // Get historical sales data
  const salesData = await sequelize.query(
    `
    SELECT DATE(s.created_at) as sale_date, SUM(si.quantity) as total_quantity
    FROM sales s
    JOIN sale_items si ON s.id = si.sale_id
    WHERE si.product_id = :productId
      AND s.shop_id = :shopId
      AND s.created_at >= :lookbackDate
      AND s.status = 'completed'
    GROUP BY DATE(s.created_at)
    ORDER BY sale_date
    `,
    {
      replacements: { productId, shopId, lookbackDate },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  
  if (salesData.length < 7) {
    // Not enough data for forecasting
    return null;
  }
  
  // Simple moving average forecast
  const quantities = salesData.map(d => parseInt(d.total_quantity, 10));
  const avgDailySales = quantities.reduce((a, b) => a + b, 0) / quantities.length;
  
  // Calculate trend (simple linear regression)
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < quantities.length; i++) {
    sumX += i;
    sumY += quantities[i];
    sumXY += i * quantities[i];
    sumX2 += i * i;
  }
  const n = quantities.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Calculate seasonality factor (day of week)
  const dayOfWeekAvg = new Array(7).fill(0);
  const dayOfWeekCount = new Array(7).fill(0);
  salesData.forEach(d => {
    const dayOfWeek = new Date(d.sale_date).getDay();
    dayOfWeekAvg[dayOfWeek] += parseInt(d.total_quantity, 10);
    dayOfWeekCount[dayOfWeek]++;
  });
  for (let i = 0; i < 7; i++) {
    if (dayOfWeekCount[i] > 0) {
      dayOfWeekAvg[i] /= dayOfWeekCount[i];
    } else {
      dayOfWeekAvg[i] = avgDailySales;
    }
  }
  
  // Generate forecast
  const forecasts = [];
  const today = new Date();
  for (let i = 1; i <= forecastDays; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i);
    const dayOfWeek = forecastDate.getDay();
    
    // Combine trend and seasonality
    const trendValue = avgDailySales + slope * (quantities.length + i);
    const seasonalFactor = dayOfWeekAvg[dayOfWeek] / avgDailySales || 1;
    const forecastedQuantity = Math.max(0, Math.round(trendValue * seasonalFactor));
    
    // Confidence based on data quality
    const confidence = Math.min(0.95, 0.5 + (quantities.length / lookbackDays) * 0.5);
    
    forecasts.push({
      date: forecastDate.toISOString().split('T')[0],
      quantity: forecastedQuantity,
      confidence,
    });
  }
  
  return {
    product_id: productId,
    average_daily_sales: avgDailySales,
    trend_direction: slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'stable',
    forecasts,
  };
};

/**
 * Process forecast job.
 */
forecastQueue.process(async (job) => {
  const { productId, shopId, lookbackDays, forecastDays } = job.data;
  
  console.log(`Processing forecast for product ${productId}`);
  
  const forecast = await generateForecast(productId, shopId, lookbackDays, forecastDays);
  
  if (forecast) {
    // Store forecast in database
    await Forecast.upsert({
      id: `${productId}-${new Date().toISOString().split('T')[0]}`,
      product_id: productId,
      shop_id: shopId,
      forecast_data: forecast,
      generated_at: new Date(),
    });
  }
  
  return forecast;
});

/**
 * Queue a forecast job.
 */
const queueForecastJob = async (productId, shopId, options = {}) => {
  const job = await forecastQueue.add({
    productId,
    shopId,
    lookbackDays: options.lookbackDays || config.ai.forecastLookbackDays,
    forecastDays: options.forecastDays || 30,
  }, {
    priority: options.priority || 10,
  });
  
  return job.id;
};

/**
 * Queue forecasts for all products in a shop.
 */
const queueAllProductForecasts = async (shopId) => {
  const products = await Product.findAll({
    where: { shop_id: shopId, is_active: true },
    attributes: ['id'],
  });
  
  const jobs = await Promise.all(
    products.map(p => queueForecastJob(p.id, shopId, { priority: 20 })),
  );
  
  return jobs;
};

// Event handlers
forecastQueue.on('completed', (job, _result) => {
  console.log(`Forecast job ${job.id} completed`);
});

forecastQueue.on('failed', (job, err) => {
  console.error(`Forecast job ${job.id} failed:`, err.message);
});

module.exports = {
  forecastQueue,
  generateForecast,
  queueForecastJob,
  queueAllProductForecasts,
};

