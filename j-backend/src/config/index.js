/**
 * Application configuration settings.
 * Loads environment variables and sets up configuration for the Express application.
 */
require('dotenv').config();

const config = {
  // Application
  APP_NAME: process.env.APP_NAME || 'InventoryLedger CRM',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  DEBUG: process.env.DEBUG === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8000', 10),

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/inventory_ledger',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379/0',

  // JWT Authentication
  SECRET_KEY: process.env.SECRET_KEY || 'your-secret-key-change-in-production',
  ALGORITHM: 'HS256',
  ACCESS_TOKEN_EXPIRE_MINUTES: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '1440', 10), // 24 hours

  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173',

  get corsOriginsList() {
    return this.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
  },

  // File Upload
  MAX_UPLOAD_SIZE: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10), // 10MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',

  // GST Configuration (India)
  DEFAULT_GST_RATE: parseFloat(process.env.DEFAULT_GST_RATE || '18.0'),

  // AI/ML Configuration
  FORECAST_MODEL_VERSION: process.env.FORECAST_MODEL_VERSION || '1.0',
  FORECAST_LOOKBACK_DAYS: parseInt(process.env.FORECAST_LOOKBACK_DAYS || '180', 10), // 6 months
  AI_CACHE_TTL_HOURS: parseInt(process.env.AI_CACHE_TTL_HOURS || '24', 10),

  // Background Workers
  CELERY_BROKER_URL: process.env.CELERY_BROKER_URL || null,
  CELERY_RESULT_BACKEND: process.env.CELERY_RESULT_BACKEND || null,

  // Invoice/PDF Generation
  INVOICE_PDF_DIR: process.env.INVOICE_PDF_DIR || './invoices',
};

module.exports = config;

