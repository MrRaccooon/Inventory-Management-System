/**
 * Product catalog
 * File: products.schema.js
 * Purpose: Defines products table with Cloudinary images, pricing, inventory triggers, and tenant isolation
 * Layer: DB
 */

const { pgTable, serial, integer, varchar, text, decimal, timestamp, pgEnum, index, unique } = require('drizzle-orm/pg-core');
const { tenants } = require('./tenants.schema.js');
const { categories } = require('./categories.schema.js');

/** Define product status enum */
const productStatusEnum = pgEnum('product_status', ['active', 'inactive', 'discontinued']);

/** Products table schema */
const products = pgTable('products', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category_id: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  cost_price: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  selling_price: decimal('selling_price', { precision: 10, scale: 2 }).notNull(),
  image_url: varchar('image_url', { length: 500 }),
  image_id: varchar('image_id', { length: 255 }),
  status: productStatusEnum('status').default('active'),
  reorder_point: integer('reorder_point').default(10),
  reorder_quantity: integer('reorder_quantity').default(50),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueTenantSku: unique('products_tenant_sku_unique').on(table.tenant_id, table.sku),
  tenantIdIdx: index('idx_products_tenant_id').on(table.tenant_id),
  skuIdx: index('idx_products_sku').on(table.tenant_id, table.sku),
  categoryIdIdx: index('idx_products_category_id').on(table.category_id),
  statusIdx: index('idx_products_status').on(table.status)
}));

module.exports = { products, productStatusEnum };
