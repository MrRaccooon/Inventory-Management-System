/**
 * File: auth.config.js
 * Purpose: Initialize and configure Supabase Auth and JWT settings
 * Layer: Config
 * Notes:
 * - Centralizes auth configuration
 * - Used by auth.service.js and auth.middleware.js
 * - No business logic in config files
 * - Email verification disabled for development/testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET'
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (for user operations - login, register, etc.)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Admin client (for privileged operations - create users, bypass RLS)
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// JWT configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  accessTokenExpiry: process.env.JWT_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  algorithm: 'HS256',
  issuer: 'inventory-management-system',
  audience: 'ims-users'
};

// Auth configuration
const authConfig = {
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false
  },
  
  // Session management
  session: {
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600')
  },
  
  // Rate limiting
  rateLimits: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5
    },
    register: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 3
    },
    forgotPassword: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 3
    },
    changePassword: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 5
    },
    refresh: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 10
    },
    resetPassword: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 5
    }
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  jwtConfig,
  authConfig
};
