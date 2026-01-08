/**
 * Sale line items
 * File: sale_items.schema.js
 * Purpose: Defines line items for each sale with product, quantity, and pricing details
 * Layer: DB
 */

const { pgTable, serial, integer, decimal, index } = require('drizzle-orm/pg-core');
const { sales } = require('./sales.schema.js');
const { products } = require('./products.schema.js');

/** Sale items table schema */
const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  sale_id: integer('sale_id')
    .notNull()
    .references(() => sales.id, { onDelete: 'cascade' }),
  product_id: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  unit_price: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  unit_cost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  line_total: decimal('line_total', { precision: 10, scale: 2 }).notNull(),
}, (table) => ({
  saleIdIdx: index('idx_sale_items_sale_id').on(table.sale_id),
  productIdIdx: index('idx_sale_items_product_id').on(table.product_id)
}));

module.exports = { saleItems };
