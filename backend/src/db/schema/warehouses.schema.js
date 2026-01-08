/**
 * Warehouse/location management
 * File: warehouses.schema.js
 * Purpose: Defines warehouses table per tenant for physical stock locations
 * Layer: DB
 */

const { pgTable, serial, integer, varchar, text, boolean, timestamp, pgEnum, index } = require('drizzle-orm/pg-core');
const { tenants } = require('./tenants.schema.js');

/** Warehouse status enum */
const warehouseStatusEnum = pgEnum('warehouse_status', ['active', 'inactive']);

/** Warehouses table schema */
const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  is_default: boolean('is_default').default(false),
  status: warehouseStatusEnum('status').default('active'),
  created_at: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_warehouses_tenant_id').on(table.tenant_id)
}));

module.exports = { warehouses, warehouseStatusEnum };
