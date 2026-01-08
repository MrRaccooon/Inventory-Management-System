/**
 * User profiles (Supabase Auth)
 * File: users.schema.js
 * Purpose: Defines the users table schema linking Supabase Auth to tenants with employee management and role-based access
 * Layer: DB
 */

const { pgTable, uuid, integer, varchar, decimal, timestamp, date, pgEnum, index } = require('drizzle-orm/pg-core');
const { tenants } = require('./tenants.schema.js');

/** Define user role enum for RBAC */
// ✅ Changed to match database enum (with underscores)
const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'sales_associate', 'inventory_clerk']);

/** Define user status enum for employee lifecycle */
// ✅ Changed to match database enum (with underscores)
const userStatusEnum = pgEnum('user_status', ['active', 'on_leave', 'inactive']);

/** Users table schema - integrates Supabase Auth with tenant structure */
const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Supabase Auth user ID
  tenant_id: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: userRoleEnum('role').default('sales_associate'),  // ✅ Changed default
  full_name: varchar('full_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  status: userStatusEnum('status').default('active'),
  last_login: timestamp('last_login'),
  
  // Cloudinary profile image
  profile_image_url: varchar('profile_image_url', { length: 500 }),
  profile_image_id: varchar('profile_image_id', { length: 255 }),
  
  // Employee management fields
  department: varchar('department', { length: 100 }),
  salary: decimal('salary', { precision: 10, scale: 2 }),
  hire_date: date('hire_date'),
  attendance_rate: decimal('attendance_rate', { precision: 5, scale: 2 }),
  
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_users_tenant_id').on(table.tenant_id),
  emailIdx: index('idx_users_email').on(table.email),
  roleIdx: index('idx_users_role').on(table.role)
}));

module.exports = { users, userRoleEnum, userStatusEnum };
