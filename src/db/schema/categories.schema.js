/**
Product categories 
File: categories.schema.js
Purpose: Defines hierarchical product categories per tenant with self-referencing parent-child relationships
Layer: DB
Notes: 
- CASCADE delete on tenant_id ensures tenant data isolation
- Self-referencing FK for nested category hierarchy (parent_category_id)
- Composite UNIQUE constraint prevents duplicate names within tenant hierarchy
- Indexes optimized for tenant filtering and parent-child traversal
*/

import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema.js';

/** Categories table schema - supports hierarchical product organization */
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  parentCategoryId: integer('parent_category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  // Composite unique constraint: no duplicate names within same tenant/parent
  uniqueTenantNameParent: unique().on(table.tenantId, table.name, table.parentCategoryId),
}));

/** Indexes for performance */
export const idxCategoriesTenantId = index('idx_categories_tenant_id').on(categories.tenantId);
export const idxCategoriesParentId = index('idx_categories_parent_id').on(categories.parentCategoryId);
