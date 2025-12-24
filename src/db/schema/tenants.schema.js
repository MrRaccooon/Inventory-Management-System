/**
Organizations/stores
File: tenants.schema.js
Purpose: Defines the tenants table schema with multi-tenant structure, subscription management, and GST compliance fields
Layer: DB
Notes: 
- Follows PostgreSQL naming conventions (snake_case columns)
- Includes subscription lifecycle tracking (plan_started_at, plan_expires_at)
- GST number is UNIQUE across tenants for compliance
- Default timezone Asia/Kolkata for Indian businesses
- Indexes on gst_number and status for query performance
*/

import { pgTable, serial, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

/** Define status enum for tenant lifecycle */
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'inactive', 'suspended']);

/** Tenants table schema */
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  gstNumber: varchar('gst_number', { length: 15 }).unique(),
  subscriptionPlan: varchar('subscription_plan', { length: 50 }).default('free'),
  planStartedAt: timestamp('plan_started_at'),
  planExpiresAt: timestamp('plan_expires_at'),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Kolkata'),
  status: tenantStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Indexes for performance */
export const idxTenantsGstNumber = index('idx_tenants_gst_number').on(tenants.gstNumber);
export const idxTenantsStatus = index('idx_tenants_status').on(tenants.status);
