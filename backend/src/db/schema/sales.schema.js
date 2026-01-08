/**
 * Sales/invoices
 * File: sales.schema.js
 * Purpose: Defines sales invoices per tenant with tax breakdown, payment info, and employee linkage
 * Layer: DB
 */

const {
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
} = require('drizzle-orm/pg-core');
const { tenants } = require('./tenants.schema.js');
const { customers } = require('./customers.schema.js');
const { users } = require('./users.schema.js');
const { warehouses } = require('./warehouses.schema.js');

/** Enums */
const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'upi', 'cheque', 'credit']);
const paymentStatusEnum = pgEnum('payment_status', ['paid', 'pending', 'partial']);
const saleStatusEnum = pgEnum('sale_status', ['completed', 'cancelled']);

/** Sales table schema */
const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  invoice_number: varchar('invoice_number', { length: 100 }).notNull(),
  customer_id: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  employee_id: uuid('employee_id')
    .notNull()
    .references(() => users.id),
  warehouse_id: integer('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax_amount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  tax_breakdown: jsonb('tax_breakdown'),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
  total_amount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').default('cash'),
  payment_status: paymentStatusEnum('payment_status').default('paid'),
  status: saleStatusEnum('status').default('completed'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueTenantInvoice: unique('sales_tenant_invoice_unique').on(table.tenant_id, table.invoice_number),
  tenantIdIdx: index('idx_sales_tenant_id').on(table.tenant_id),
  invoiceNumberIdx: index('idx_sales_invoice_number').on(table.tenant_id, table.invoice_number),
  customerIdIdx: index('idx_sales_customer_id').on(table.customer_id),
  employeeIdIdx: index('idx_sales_employee_id').on(table.employee_id),
  createdAtIdx: index('idx_sales_created_at').on(table.created_at)
}));

module.exports = { sales, paymentMethodEnum, paymentStatusEnum, saleStatusEnum };
