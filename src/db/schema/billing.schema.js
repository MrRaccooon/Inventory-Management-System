/**
GST & billing records
File: billing.schema.js
Purpose: Defines monthly GST and sales aggregates per tenant with generated gst_payable
Layer: DB
Notes:
- One row per tenant per period (YYYY-MM) via composite UNIQUE
- Stored generated column gst_payable = total_gst_collected - input_credit
- Status enum tracks GST filing lifecycle
*/

import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  timestamp,
  pgEnum,
  index,
  unique,
  generatedAlwaysAs,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants.schema.js';

/** Billing status enum */
export const billingStatusEnum = pgEnum('billing_status', [
  'draft',
  'pending',
  'filed',
]);

/** Billing table schema */
export const billing = pgTable(
  'billing',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // Period in format YYYY-MM
    period: varchar('period', { length: 7 }).notNull(),
    totalSales: decimal('total_sales', { precision: 12, scale: 2 }).default(
      '0',
    ),
    totalGstCollected: decimal('total_gst_collected', {
      precision: 12,
      scale: 2,
    }).default('0'),
    totalPurchases: decimal('total_purchases', {
      precision: 12,
      scale: 2,
    }).default('0'),
    totalGstPaid: decimal('total_gst_paid', {
      precision: 12,
      scale: 2,
    }).default('0'),
    inputCredit: decimal('input_credit', {
      precision: 12,
      scale: 2,
    }).default('0'),
    // Stored generated column: gst_payable = total_gst_collected - input_credit
    gstPayable: decimal('gst_payable', { precision: 12, scale: 2 }).generatedAlwaysAs(
      sql`"total_gst_collected" - "input_credit"`,
    ),
    status: billingStatusEnum('status').default('draft'),
    filedAt: timestamp('filed_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    // Ensure single billing row per tenant+period
    uniqueTenantPeriod: unique('billing_tenant_period_unique').on(
      table.tenantId,
      table.period,
    ),
  }),
);

/** Indexes */
export const idxBillingTenantId = index('idx_billing_tenant_id').on(
  billing.tenantId,
);

export const idxBillingPeriod = index('idx_billing_period').on(
  billing.tenantId,
  billing.period,
);
