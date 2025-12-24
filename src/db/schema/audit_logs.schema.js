/**
Audit trail 
File: audit_logs.schema.js
Purpose: Stores immutable audit trail entries for all important actions across tenants
Layer: DB
Notes:
- Tenant-scoped audit records with optional user linkage
- JSONB payload for before/after snapshots or extra metadata
- Indexed for querying by tenant, user, entity, and creation time
*/

import {
  pgTable,
  serial,
  integer,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema.js';
import { users } from './users.schema.js';

/** Audit logs table schema */
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 100 }).notNull(),
  entityId: integer('entity_id'),
  payload: jsonb('payload'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

/** Indexes */
export const idxAuditLogsTenantId = index('idx_audit_logs_tenant_id').on(
  auditLogs.tenantId,
);

export const idxAuditLogsUserId = index('idx_audit_logs_user_id').on(
  auditLogs.userId,
);

export const idxAuditLogsEntity = index('idx_audit_logs_entity').on(
  auditLogs.entity,
);

export const idxAuditLogsCreatedAt = index('idx_audit_logs_created_at').on(
  auditLogs.createdAt,
);
