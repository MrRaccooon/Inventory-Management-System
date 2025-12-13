/**
 * Supplier validators using Joi.
 */
const Joi = require('joi');

const supplierCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  company_name: Joi.string().allow(null, '').optional(),
  phone: Joi.string().min(1).max(20).required(),
  email: Joi.string().email().allow(null, '').optional(),
  address: Joi.string().allow(null, '').optional(),
  gst_number: Joi.string().allow(null, '').optional(),
  pan_number: Joi.string().allow(null, '').optional(),
  bank_details: Joi.object({
    bank_name: Joi.string().optional(),
    account_number: Joi.string().optional(),
    ifsc_code: Joi.string().optional(),
    account_holder: Joi.string().optional(),
  }).allow(null).optional(),
  payment_terms: Joi.string().allow(null, '').optional(),
  notes: Joi.string().allow(null, '').optional(),
  is_active: Joi.boolean().default(true),
});

const supplierUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  company_name: Joi.string().allow(null, '').optional(),
  phone: Joi.string().min(1).max(20).optional(),
  email: Joi.string().email().allow(null, '').optional(),
  address: Joi.string().allow(null, '').optional(),
  gst_number: Joi.string().allow(null, '').optional(),
  pan_number: Joi.string().allow(null, '').optional(),
  bank_details: Joi.object({
    bank_name: Joi.string().optional(),
    account_number: Joi.string().optional(),
    ifsc_code: Joi.string().optional(),
    account_holder: Joi.string().optional(),
  }).allow(null).optional(),
  payment_terms: Joi.string().allow(null, '').optional(),
  notes: Joi.string().allow(null, '').optional(),
  is_active: Joi.boolean().optional(),
});

module.exports = {
  supplierCreateSchema,
  supplierUpdateSchema,
};

