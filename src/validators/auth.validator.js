/**
 * File: auth.validator.js
 * Purpose: Validation schemas for authentication
 * Layer: Validator
 * Notes:
 * - Uses Joi for validation
 * - No business logic
 * - Returns validated data or throws validation error
 * - Follows project coding standards
 */

const Joi = require('joi');

/**
 * Register tenant owner validation schema
 */
const registerTenantOwnerSchema = Joi.object({
  tenantName: Joi.string().min(2).max(255).required(),
  tenantEmail: Joi.string().email().required(),
  tenantPhone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  ownerEmail: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  fullname: Joi.string().min(2).max(255).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional()
});

/**
 * Register employee validation schema
 */
const registerEmployeeSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  fullname: Joi.string().min(2).max(255).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  role: Joi.string().valid('admin', 'manager', 'sales_associate', 'inventory_clerk').required(),
  department: Joi.string().max(100).optional(),
  salary: Joi.number().positive().optional(),
  hireDate: Joi.date().optional()
});

/**
 * Login validation schema
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

/**
 * Forgot password validation schema
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

/**
 * Reset password validation schema
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required()
});

/**
 * Update profile validation schema
 */
const updateProfileSchema = Joi.object({
  fullname: Joi.string().min(2).max(255).optional(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  department: Joi.string().max(100).optional()
});

/**
 * Change password validation schema
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match'
  })
});

/**
 * Validation helper functions
 */
const validateRegisterTenantOwner = (data) => {
  const { error, value } = registerTenantOwnerSchema.validate(data, { abortEarly: false });
  if (error) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    };
  }
  return value;
};

const validateRegisterEmployee = (data) => {
  const { error, value } = registerEmployeeSchema.validate(data, { abortEarly: false });
  if (error) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    };
  }
  return value;
};

const validateLogin = (data) => {
  const { error, value } = loginSchema.validate(data, { abortEarly: false });
  if (error) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    };
  }
  return value;
};

const validateRefreshToken = (data) => {
  const { error, value } = refreshTokenSchema.validate(data, { abortEarly: false });
  if (error) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    };
  }
  return value;
};

const validateForgotPassword = (data) => {
  const { error, value } = forgotPasswordSchema.validate(data, { abortEarly: false });
  if (error) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    };
  }
  return value;
};

const validateResetPassword = (data) => {
  const { error, value } = resetPasswordSchema.validate(data, { abortEarly: false });
  if (error) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    };
  }
  return value;
};

const validateUpdateProfile = (data) => {
  const { error, value } = updateProfileSchema.validate(data, { abortEarly: false });
  if (error) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    };
  }
  return value;
};

const validateChangePassword = (data) => {
  const { error, value } = changePasswordSchema.validate(data, { abortEarly: false });
  if (error) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    };
  }
  return value;
};

module.exports = {
  validateRegisterTenantOwner,
  validateRegisterEmployee,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
  validateChangePassword
};
