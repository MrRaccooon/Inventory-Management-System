/**
 * File: database.config.js
 * Purpose: Initialize Supabase and Drizzle ORM connection
 * Layer: Config
 * Notes:
 * - Database connection setup
 * - Used by all services and schemas
 * - Follows project coding standards
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
require('dotenv').config();

// Validate required environment variable
if (!process.env.DATABASE_URL) {
  throw new Error('Missing required environment variable: DATABASE_URL');
}

// Create postgres connection
const connectionString = process.env.DATABASE_URL;

// Connection client
const client = postgres(connectionString, {
  max: 10, // Maximum number of connections
  idle_timeout: 20,
  connect_timeout: 10
});

// Initialize Drizzle ORM
const db = drizzle(client);

module.exports = { db, client };
