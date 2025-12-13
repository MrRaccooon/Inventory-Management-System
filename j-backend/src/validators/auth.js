/**
 * Auth validators using Joi.
 */
const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  full_name: Joi.string().min(1).max(255).required(),
  phone: Joi.string().allow(null, '').optional(),
  role: Joi.string().valid('owner', 'manager', 'staff', 'admin').default('staff'),
  shop_id: Joi.string().uuid().allow(null).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const tokenRefreshSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

const passwordChangeSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).required(),
});

const userUpdateSchema = Joi.object({
  full_name: Joi.string().min(1).max(255).optional(),
  phone: Joi.string().allow(null, '').optional(),
  email: Joi.string().email().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  tokenRefreshSchema,
  passwordChangeSchema,
  userUpdateSchema,
};

