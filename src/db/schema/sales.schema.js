/**
Sales/invoices
File: sales.schema.js
Purpose: Defines sales invoices per tenant with tax breakdown, payment info, and employee linkage
Layer: DB
Notes:
- CASCADE delete on tenant_id keeps tenant data isolated
- Invoice number unique per tenant via composite UNIQUE
- JSONB tax_breakdown for flexible GST/other tax components
- Enums for payment method, payment status, and sale status
*/

import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  timestamp,
  uuid,
  jsonb,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema.js';
import { customers } from './customers.schema.js';
import { users } from './users.schema.js';
import { warehouses } from './warehouses.schema.js';

/** Enums */
export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'card',
  'upi',
  'cheque',
  'credit',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'paid',
  'pending',
  'partial',
]);

export const saleStatusEnum = pgEnum('sale_status', ['completed', 'cancelled']);

/** Sales table schema */
export const sales = pgTable(
  'sales',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
    customerId: integer('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => users.id),
    warehouseId: integer('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
    taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
    taxBreakdown: jsonb('tax_breakdown'),
    discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').default('cash'),
    paymentStatus: paymentStatusEnum('payment_status').default('paid'),
    status: saleStatusEnum('status').default('completed'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    // Invoice number must be unique per tenant
    uniqueTenantInvoice: unique('sales_tenant_invoice_unique').on(
      table.tenantId,
      table.invoiceNumber,
    ),
  }),
);

/** Indexes */
export const idxSalesTenantId = index('idx_sales_tenant_id').on(sales.tenantId);

export const idxSalesInvoiceNumber = index('idx_sales_invoice_number').on(
  sales.tenantId,
  sales.invoiceNumber,
);

export const idxSalesCustomerId = index('idx_sales_customer_id').on(
  sales.customerId,
);

export const idxSalesEmployeeId = index('idx_sales_employee_id').on(
  sales.employeeId,
);

export const idxSalesCreatedAt = index('idx_sales_created_at').on(
  sales.createdAt,
);
