/**
Inventory movements log 
File: stock_transactions.schema.js
Purpose: Records all stock movements for audit, reporting, and inventory reconciliation
Layer: DB
Notes:
- Every stock change must create a transaction row (IMS rule)
- Linked to tenant, product, warehouse, and optionally user
- Type enum defines business reason for movement (purchase, sale, etc.)
- Indexed for common reporting filters (tenant, product, type, created_at)
*/

import {
  pgTable,
  serial,
  integer,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema.js';
import { products } from './products.schema.js';
import { warehouses } from './warehouses.schema.js';
import { users } from './users.schema.js';

/** Stock transaction type enum */
export const stockTransactionTypeEnum = pgEnum('stock_transaction_type', [
  'purchase',
  'sale',
  'adjustment',
  'return',
  'damage',
  'correction',
]);

/** Stock transactions table schema */
export const stockTransactions = pgTable('stock_transactions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  warehouseId: integer('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  type: stockTransactionTypeEnum('type').notNull(),
  quantityChange: integer('quantity_change').notNull(),
  referenceId: varchar('reference_id', { length: 100 }),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

/** Indexes */
export const idxStockTransactionsTenantId = index(
  'idx_stock_transactions_tenant_id',
).on(stockTransactions.tenantId);

export const idxStockTransactionsProductId = index(
  'idx_stock_transactions_product_id',
).on(stockTransactions.productId);

export const idxStockTransactionsCreatedAt = index(
  'idx_stock_transactions_created_at',
).on(stockTransactions.createdAt);

export const idxStockTransactionsType = index(
  'idx_stock_transactions_type',
).on(stockTransactions.type);
