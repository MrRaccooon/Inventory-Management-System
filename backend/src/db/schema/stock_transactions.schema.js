/**
 * Inventory movements log
 * File: stock_transactions.schema.js
 * Purpose: Records all stock movements for audit, reporting, and inventory reconciliation
 * Layer: DB
 */

const {
  pgTable,
  serial,
  integer,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} = require('drizzle-orm/pg-core');
const { tenants } = require('./tenants.schema.js');
const { products } = require('./products.schema.js');
const { warehouses } = require('./warehouses.schema.js');
const { users } = require('./users.schema.js');

/** Stock transaction type enum */
const stockTransactionTypeEnum = pgEnum('stock_transaction_type', [
  'purchase',
  'sale',
  'adjustment',
  'return',
  'damage',
  'correction',
]);

/** Stock transactions table schema */
const stockTransactions = pgTable('stock_transactions', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  product_id: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  warehouse_id: integer('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  type: stockTransactionTypeEnum('type').notNull(),
  quantity_change: integer('quantity_change').notNull(),
  reference_id: varchar('reference_id', { length: 100 }),
  notes: text('notes'),
  created_by: uuid('created_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_stock_transactions_tenant_id').on(table.tenant_id),
  productIdIdx: index('idx_stock_transactions_product_id').on(table.product_id),
  createdAtIdx: index('idx_stock_transactions_created_at').on(table.created_at),
  typeIdx: index('idx_stock_transactions_type').on(table.type)
}));

module.exports = { stockTransactions, stockTransactionTypeEnum };
