/**
 * Product categories
 * File: categories.schema.js
 * Purpose: Defines hierarchical product categories per tenant with self-referencing parent-child relationships
 * Layer: DB
 */

const { pgTable, serial, integer, varchar, text, timestamp, index, unique } = require('drizzle-orm/pg-core');
const { tenants } = require('./tenants.schema.js');

/** Categories table schema - supports hierarchical product organization */
const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  parent_category_id: integer('parent_category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueTenantNameParent: unique('categories_tenant_name_parent_unique').on(
    table.tenant_id,
    table.name,
    table.parent_category_id
  ),
  tenantIdIdx: index('idx_categories_tenant_id').on(table.tenant_id),
  parentIdIdx: index('idx_categories_parent_id').on(table.parent_category_id)
}));

module.exports = { categories };
