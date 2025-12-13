/**
 * Customer validators using Joi.
 */
const Joi = require('joi');

const customerCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  phone: Joi.string().min(1).max(20).required(),
  email: Joi.string().email().allow(null, '').optional(),
  address: Joi.string().allow(null, '').optional(),
  gst_number: Joi.string().allow(null, '').optional(),
  credit_limit: Joi.number().min(0).default(0),
  notes: Joi.string().allow(null, '').optional(),
  is_active: Joi.boolean().default(true),
});

const customerUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  phone: Joi.string().min(1).max(20).optional(),
  email: Joi.string().email().allow(null, '').optional(),
  address: Joi.string().allow(null, '').optional(),
  gst_number: Joi.string().allow(null, '').optional(),
  credit_limit: Joi.number().min(0).optional(),
  notes: Joi.string().allow(null, '').optional(),
  is_active: Joi.boolean().optional(),
});

module.exports = {
  customerCreateSchema,
  customerUpdateSchema,
};

