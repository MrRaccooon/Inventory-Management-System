/**
Warehouse/location management 
File: warehouses.schema.js
Purpose: Defines warehouses table per tenant for physical stock locations
Layer: DB
Notes:
- CASCADE delete on tenant_id ensures tenant data isolation
- Supports marking a default warehouse per tenant via is_default
- Status enum for operational control
- Index on tenant_id for tenant-scoped queries
*/

import { pgTable, serial, integer, varchar, text, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema.js';

/** Warehouse status enum */
export const warehouseStatusEnum = pgEnum('warehouse_status', ['active', 'inactive']);

/** Warehouses table schema */
export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  isDefault: boolean('is_default').default(false),
  status: warehouseStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

/** Indexes */
export const idxWarehousesTenantId = index('idx_warehouses_tenant_id').on(warehouses.tenantId);
