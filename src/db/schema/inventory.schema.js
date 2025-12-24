/**
Stock levels & locations 
File: inventory.schema.js
Purpose: Defines per-warehouse product stock levels for each tenant
Layer: DB
Notes:
- One row per (tenant, product, warehouse) combination
- CASCADE deletes ensure inventory cleanup with tenant/product/warehouse removal
- Quantities are raw counts only; no derived fields stored
- Composite UNIQUE enforces a single inventory record per product per warehouse per tenant
*/

import { pgTable, serial, integer, timestamp, index, unique} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema.js';
import { products } from './products.schema.js';
import { warehouses } from './warehouses.schema.js';

/** Inventory table schema */
export const inventory = pgTable(
  'inventory',
  {
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
    quantityOnHand: integer('quantity_on_hand').default(0),
    quantityReserved: integer('quantity_reserved').default(0),
    lastCounted: timestamp('last_counted'),
    lastMovement: timestamp('last_movement'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    // Ensure a single inventory row per tenant+product+warehouse
    uniqueTenantProductWarehouse: unique(
      'inventory_tenant_product_warehouse_unique',
    ).on(table.tenantId, table.productId, table.warehouseId),
  }),
);

/** Indexes for performance */
export const idxInventoryTenantId = index('idx_inventory_tenant_id').on(inventory.tenantId,);
export const idxInventoryProductId = index('idx_inventory_product_id').on(inventory.productId,);
export const idxInventoryWarehouseId = index('idx_inventory_warehouse_id').on(inventory.warehouseId,);
