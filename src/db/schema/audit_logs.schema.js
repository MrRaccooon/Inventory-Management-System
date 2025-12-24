/**
 * Audit trail
 * File: audit_logs.schema.js
 * Purpose: Stores immutable audit trail entries for all important actions across tenants
 * Layer: DB
 * Notes:
 * - Tenant-scoped audit records with optional user linkage
 * - JSONB payload for before/after snapshots or extra metadata
 * - Indexed for querying by tenant, user, entity, and creation time
 */

const {
  pgTable,
  serial,
  integer,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} = require('drizzle-orm/pg-core');

const { tenants } = require('./tenants.schema.js');
const { users } = require('./users.schema.js');

/** Audit logs table schema */
const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  tenant_id: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 100 }).notNull(),
  entity_id: integer('entity_id'),
  payload: jsonb('payload'),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow(),
}, (table) => ({
  // ✅ New syntax for indexes
  tenantIdIdx: index('idx_audit_logs_tenant_id').on(table.tenant_id),
  userIdIdx: index('idx_audit_logs_user_id').on(table.user_id),
  entityIdx: index('idx_audit_logs_entity').on(table.entity),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.created_at)
}));

module.exports = { auditLogs };
