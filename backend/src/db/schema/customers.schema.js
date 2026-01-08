/**
 * Customer database
 * File: customers.schema.js
 * Purpose: Defines customers per tenant with contact, GST, and walk-in flags
 * Layer: DB
 */

const { pgTable, serial, integer, varchar, text, boolean, timestamp, index } = require('drizzle-orm/pg-core');
const { tenants } = require('./tenants.schema.js');

/** Customers table schema */
const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  gstin: varchar('gstin', { length: 15 }),
  is_walk_in: boolean('is_walk_in').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_customers_tenant_id').on(table.tenant_id),
  phoneIdx: index('idx_customers_phone').on(table.phone)
}));

module.exports = { customers };
