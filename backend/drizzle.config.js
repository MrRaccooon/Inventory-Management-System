/**
 * File: drizzle.config.js
 * Purpose: Drizzle Kit configuration for migrations
 * Layer: Config
 */

require('dotenv').config();

module.exports = {
  schema: './src/db/schema/**/*.schema.js',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
};
