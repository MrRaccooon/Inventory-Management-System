/**
 * Shop validators using Joi.
 */
const Joi = require('joi');

const shopCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  address: Joi.string().allow(null, '').optional(),
  timezone: Joi.string().default('UTC'),
  currency: Joi.string().length(3).default('INR'),
  gst_number: Joi.string().allow(null, '').optional(),
});

const shopUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  address: Joi.string().allow(null, '').optional(),
  timezone: Joi.string().optional(),
  currency: Joi.string().length(3).optional(),
  gst_number: Joi.string().allow(null, '').optional(),
});

module.exports = {
  shopCreateSchema,
  shopUpdateSchema,
};

