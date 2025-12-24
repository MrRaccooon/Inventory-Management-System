/**
Product catalog 
File: products.schema.js
Purpose: Defines products table with Cloudinary images, pricing, inventory triggers, and tenant isolation
Layer: DB
Notes: 
- CASCADE delete on tenant_id ensures tenant data isolation
- Cloudinary image storage (image_url, image_id) for product photos
- SKU unique within tenant (composite constraint)
- NO computed fields stored - margin_percentage calculated at query time in services
- Reorder thresholds for automated inventory alerts
- Indexes optimized for tenant filtering, SKU lookup, category grouping, status filtering
*/

import { pgTable, serial, integer, varchar, decimal, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema.js';
import { categories } from './categories.schema.js';

/** Define product status enum */
export const productStatusEnum = pgEnum('product_status', ['active', 'inactive', 'discontinued']);

/** Products table schema */
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal('selling_price', { precision: 10, scale: 2 }).notNull(),
  // Cloudinary product image
  imageUrl: varchar('image_url', { length: 500 }),
  imageId: varchar('image_id', { length: 255 }),
  status: productStatusEnum('status').default('active'),
  reorderPoint: integer('reorder_point').default(10),
  reorderQuantity: integer('reorder_quantity').default(50),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // Composite unique constraint: SKU unique within tenant
  uniqueTenantSku: unique().on(table.tenantId, table.sku),
}));

/** Indexes for performance */
export const idxProductsTenantId = index('idx_products_tenant_id').on(products.tenantId);
export const idxProductsSku = index('idx_products_sku').on(products.tenantId, products.sku);
export const idxProductsCategoryId = index('idx_products_category_id').on(products.categoryId);
export const idxProductsStatus = index('idx_products_status').on(products.status);
