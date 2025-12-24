/**
 * File: auth.service.js
 * Purpose: Authentication business logic
 * Layer: Service
 * Notes:
 * - All business logic and domain operations
 * - No HTTP objects (req/res)
 * - Calls Supabase Auth and database
 * - Follows project coding standards
 */

const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin, jwtConfig } = require('../config/auth.config');
const { db } = require('../config/database.config');
const { tenants, users } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { ERROR_CODES, USER_ROLES, SUBSCRIPTION_LIMITS } = require('../utils/constants');


/**
 * Register tenant owner (creates tenant + admin user)
 */
const registerTenantOwner = async (data) => {
  try {
    // Check if email already exists in Supabase
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers.users.some(u => u.email === data.ownerEmail);
    
    if (emailExists) {
      throw {
        code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
        message: 'Email already registered'
      };
    }

    // Create tenant record
    const [tenant] = await db.insert(tenants).values({
      name: data.tenantName,
      email: data.tenantEmail,
      phone: data.tenantPhone,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      gst_number: data.gstNumber || null,
      subscription_plan: 'free',
      plan_started_at: new Date(),
      status: 'active'
    }).returning();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.ownerEmail,
      password: data.password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        fullname: data.fullname,
        role: USER_ROLES.ADMIN,
        tenantId: tenant.id
      }
    });

    if (authError) {
      // Rollback tenant creation
      await db.delete(tenants).where(eq(tenants.id, tenant.id));
      throw {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: authError.message
      };
    }

    // Create user record in database
    const [user] = await db.insert(users).values({
      id: authData.user.id,
      tenant_id: tenant.id,
      email: data.ownerEmail,
      full_name: data.fullname,
      phone: data.phone,
      role: USER_ROLES.ADMIN,
      status: 'active'
    }).returning();

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subscriptionPlan: tenant.subscription_plan,
        status: tenant.status
      },
      user: {
        id: user.id,
        email: user.email,
        fullname: user.full_name,
        role: user.role,
        tenantId: user.tenant_id,
        status: user.status
      },
      session: {
        accessToken,
        refreshToken,
        expiresIn: jwtConfig.accessTokenExpiry
      }
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Register employee (admin/manager only)
 */
const registerEmployee = async (data) => {
  try {
    // Check subscription limits
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, data.tenantId));
    
    if (!tenant) {
      throw {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Tenant not found'
      };
    }

    const employeeList = await db.select().from(users).where(eq(users.tenant_id, data.tenantId));
    const limit = SUBSCRIPTION_LIMITS[tenant.subscription_plan]?.MAX_EMPLOYEES || 5;

    if (employeeList.length >= limit) {
      throw {
        code: ERROR_CODES.SUBSCRIPTION_LIMIT_REACHED,
        message: `${tenant.subscription_plan} plan allows max ${limit} employees. Please upgrade.`
      };
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers.users.some(u => u.email === data.email);
    
    if (emailExists) {
      throw {
        code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
        message: 'Email already registered'
      };
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        fullname: data.fullname,
        role: data.role,
        tenantId: data.tenantId
      }
    });

    if (authError) {
      throw {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: authError.message
      };
    }

    // Create user record in database
    const [user] = await db.insert(users).values({
      id: authData.user.id,
      tenant_id: data.tenantId,
      email: data.email,
      full_name: data.fullname,
      phone: data.phone || null,
      role: data.role,
      department: data.department || null,
      salary: data.salary || null,
      hire_date: data.hireDate || null,
      status: 'active'
    }).returning();

    return {
      id: user.id,
      email: user.email,
      fullname: user.full_name,
      role: user.role,
      tenantId: user.tenant_id,
      status: user.status,
      department: user.department
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Login user
 */
const login = async (data) => {
  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (authError) {
      throw {
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password'
      };
    }

    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.id, authData.user.id));

    if (!user) {
      throw {
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found'
      };
    }

    // Check user status
    if (user.status !== 'active') {
      throw {
        code: ERROR_CODES.ACCOUNT_INACTIVE,
        message: `Your account is ${user.status}. Please contact your administrator.`
      };
    }

    // Update last login
    await db.update(users)
      .set({ last_login: new Date() })
      .where(eq(users.id, user.id));

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.full_name,
        role: user.role,
        tenantId: user.tenant_id,
        status: user.status
      },
      session: {
        accessToken,
        refreshToken,
        expiresIn: jwtConfig.accessTokenExpiry
      }
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Logout user
 */
const logout = async (userId, accessToken) => {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Optionally: Blacklist token in Redis (implement later if needed)
    
    return { success: true };
  } catch (err) {
    throw err;
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });

    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));

    if (!user) {
      throw {
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found'
      };
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: jwtConfig.accessTokenExpiry
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw {
        code: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Refresh token expired. Please login again.'
      };
    }
    throw {
      code: ERROR_CODES.INVALID_TOKEN,
      message: 'Invalid refresh token'
    };
  }
};

/**
 * Forgot password (send reset email)
 */
const forgotPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
    });

    if (error) {
      throw {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message
      };
    }

    return { success: true };
  } catch (err) {
    throw err;
  }
};

/**
 * Reset password with token
 */
const resetPassword = async (token, newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw {
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid or expired reset token'
      };
    }

    return { success: true };
  } catch (err) {
    throw err;
  }
};

/**
 * Get current user
 */
const getCurrentUser = async (userId) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw {
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found'
      };
    }

    return {
      id: user.id,
      email: user.email,
      fullname: user.full_name,
      phone: user.phone,
      role: user.role,
      tenantId: user.tenant_id,
      status: user.status,
      department: user.department,
      profileImageUrl: user.profile_image_url,
      lastLogin: user.last_login
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Update user profile
 */
const updateProfile = async (userId, data) => {
  try {
    const [updatedUser] = await db.update(users)
      .set({
        full_name: data.fullname,
        phone: data.phone,
        department: data.department,
        updated_at: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      fullname: updatedUser.full_name,
      phone: updatedUser.phone,
      department: updatedUser.department
    };
  } catch (err) {
    throw err;
  }
};

/**
 * Change password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // Get user email
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw {
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found'
      };
    }

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      throw {
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Current password is incorrect'
      };
    }

    // Update password in Supabase
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      throw {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message
      };
    }

    return { success: true };
  } catch (err) {
    throw err;
  }
};

/**
 * Generate access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
      status: user.status
    },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id
    },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.refreshTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }
  );
};

module.exports = {
  registerTenantOwner,
  registerEmployee,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  changePassword
};
