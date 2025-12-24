/**
Sale line items
File: sale_items.schema.js
Purpose: Defines line items for each sale with product, quantity, and pricing details
Layer: DB
Notes:
- One row per product in a sale
- ON DELETE CASCADE on sale_id to remove items when a sale is deleted
- ON DELETE RESTRICT on product_id to protect historical sale data from product deletion
- line_total is stored as entered for audit; higher-level aggregates still computed in services
*/

import {
  pgTable,
  serial,
  integer,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { sales } from './sales.schema.js';
import { products } from './products.schema.js';

/** Sale items table schema */
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id')
    .notNull()
    .references(() => sales.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 10, scale: 2 }).notNull(),
});

/** Indexes */
export const idxSaleItemsSaleId = index('idx_sale_items_sale_id').on(
  saleItems.saleId,
);

export const idxSaleItemsProductId = index('idx_sale_items_product_id').on(
  saleItems.productId,
);
