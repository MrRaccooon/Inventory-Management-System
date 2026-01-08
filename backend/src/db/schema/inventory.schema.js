/**
 * Stock levels & locations
 * File: inventory.schema.js
 * Purpose: Defines per-warehouse product stock levels for each tenant
 * Layer: DB
 */

const { pgTable, serial, integer, timestamp, index, unique } = require('drizzle-orm/pg-core');
const { tenants } = require('./tenants.schema.js');
const { products } = require('./products.schema.js');
const { warehouses } = require('./warehouses.schema.js');

/** Inventory table schema */
const inventory = pgTable('inventory', {
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
  quantity_on_hand: integer('quantity_on_hand').default(0),
  quantity_reserved: integer('quantity_reserved').default(0),
  last_counted: timestamp('last_counted'),
  last_movement: timestamp('last_movement'),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueTenantProductWarehouse: unique('inventory_tenant_product_warehouse_unique').on(
    table.tenant_id,
    table.product_id,
    table.warehouse_id
  ),
  tenantIdIdx: index('idx_inventory_tenant_id').on(table.tenant_id),
  productIdIdx: index('idx_inventory_product_id').on(table.product_id),
  warehouseIdIdx: index('idx_inventory_warehouse_id').on(table.warehouse_id)
}));

module.exports = { inventory };
