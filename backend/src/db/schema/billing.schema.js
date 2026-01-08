/**
 * GST & billing records
 * File: billing.schema.js
 * Purpose: Defines monthly GST and sales aggregates per tenant with generated gst_payable
 * Layer: DB
 */

const {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  timestamp,
  pgEnum,
  index,
  unique,
} = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { tenants } = require('./tenants.schema.js');

/** Billing status enum */
const billingStatusEnum = pgEnum('billing_status', ['draft', 'pending', 'filed']);

/** Billing table schema */
const billing = pgTable('billing', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  period: varchar('period', { length: 7 }).notNull(),
  total_sales: decimal('total_sales', { precision: 12, scale: 2 }).default('0'),
  total_gst_collected: decimal('total_gst_collected', { precision: 12, scale: 2 }).default('0'),
  total_purchases: decimal('total_purchases', { precision: 12, scale: 2 }).default('0'),
  total_gst_paid: decimal('total_gst_paid', { precision: 12, scale: 2 }).default('0'),
  input_credit: decimal('input_credit', { precision: 12, scale: 2 }).default('0'),
  gst_payable: decimal('gst_payable', { precision: 12, scale: 2 }).generatedAlwaysAs(
    sql`total_gst_collected - input_credit`
  ),
  status: billingStatusEnum('status').default('draft'),
  filed_at: timestamp('filed_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueTenantPeriod: unique('billing_tenant_period_unique').on(table.tenant_id, table.period),
  tenantIdIdx: index('idx_billing_tenant_id').on(table.tenant_id),
  periodIdx: index('idx_billing_period').on(table.tenant_id, table.period)
}));

module.exports = { billing, billingStatusEnum };
