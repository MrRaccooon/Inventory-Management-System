/**
 * Organizations/stores
 * File: tenants.schema.js
 * Purpose: Defines the tenants table schema with multi-tenant structure, subscription management, and GST compliance fields
 * Layer: DB
 * Notes:
 * - Follows PostgreSQL naming conventions (snake_case columns)
 * - Includes subscription lifecycle tracking (plan_started_at, plan_expires_at)
 * - GST number is UNIQUE across tenants for compliance
 * - Default timezone Asia/Kolkata for Indian businesses
 * - Indexes on gst_number and status for query performance
 */

const { pgTable, serial, varchar, text, timestamp, pgEnum, index } = require('drizzle-orm/pg-core');

/** Define status enum for tenant lifecycle */
const tenantStatusEnum = pgEnum('tenant_status', ['active', 'inactive', 'suspended']);

/** Tenants table schema */
const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  gst_number: varchar('gst_number', { length: 15 }).unique(),
  subscription_plan: varchar('subscription_plan', { length: 50 }).default('free'),
  plan_started_at: timestamp('plan_started_at'),
  plan_expires_at: timestamp('plan_expires_at'),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Kolkata'),
  status: tenantStatusEnum('status').default('active'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // ✅ New syntax for indexes
  gstNumberIdx: index('idx_tenants_gst_number').on(table.gst_number),
  statusIdx: index('idx_tenants_status').on(table.status)
}));

module.exports = { tenants, tenantStatusEnum };
