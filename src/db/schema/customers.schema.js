/**
Customer database
File: customers.schema.js
Purpose: Defines customers per tenant with contact, GST, and walk-in flags
Layer: DB
Notes:
- CASCADE delete on tenant_id ensures tenant data isolation
- is_walk_in flag differentiates anonymous/walk-in customers from regular profiles
- Indexed by tenant and phone for fast lookups
*/

import { pgTable, serial, integer, varchar, text, boolean, timestamp, index} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema.js';

/** Customers table schema */
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  gstin: varchar('gstin', { length: 15 }),
  isWalkIn: boolean('is_walk_in').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Indexes */
export const idxCustomersTenantId = index('idx_customers_tenant_id').on(customers.tenantId);
export const idxCustomersPhone = index('idx_customers_phone').on(customers.phone);
