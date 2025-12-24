/**
User profiles (Supabase Auth)
File: users.schema.js
Purpose: Defines the users table schema linking Supabase Auth to tenants with employee management and role-based access
Layer: DB
Notes: 
- CASCADE delete on tenant_id ensures tenant isolation
- Supabase Auth UUID primary key integration
- Cloudinary image storage (profile_image_url, profile_image_id)
- Employee fields merged (department, salary, attendance_rate)
- Role-based access control with business-specific roles
- Indexes optimized for tenant filtering, email lookup, and role queries
*/

import { pgTable, uuid, integer, varchar, decimal, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema.js';

/** Define user role enum for RBAC */
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'sales_associate', 'inventory_clerk']);

/** Define user status enum for employee lifecycle */
export const userStatusEnum = pgEnum('user_status', ['active', 'on_leave', 'inactive']);

/** Users table schema - integrates Supabase Auth with tenant structure */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Supabase Auth user ID
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: userRoleEnum('role').default('sales_associate'),
  fullName: varchar('full_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  status: userStatusEnum('status').default('active'),
  lastLogin: timestamp('last_login'),
  // Cloudinary profile image
  profileImageUrl: varchar('profile_image_url', { length: 500 }),
  profileImageId: varchar('profile_image_id', { length: 255 }),
  // Employee management fields
  department: varchar('department', { length: 100 }),
  salary: decimal('salary', { precision: 10, scale: 2 }),
  hireDate: date('hire_date'),
  attendanceRate: decimal('attendance_rate', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Indexes for performance */
export const idxUsersTenantId = index('idx_users_tenant_id').on(users.tenantId);
export const idxUsersEmail = index('idx_users_email').on(users.email);
export const idxUsersRole = index('idx_users_role').on(users.role);
