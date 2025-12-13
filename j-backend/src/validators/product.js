/**
 * Product validators using Joi.
 */
const Joi = require('joi');

const productCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  sku: Joi.string().min(1).max(100).required(),
  description: Joi.string().allow(null, '').optional(),
  category_id: Joi.string().uuid().allow(null).optional(),
  price_mrp: Joi.number().min(0).required(),
  price_retail: Joi.number().min(0).allow(null).optional(),
  price_wholesale: Joi.number().min(0).allow(null).optional(),
  cost_price: Joi.number().min(0).required(),
  current_stock: Joi.number().integer().min(0).default(0),
  min_stock_threshold: Joi.number().integer().min(0).default(10),
  max_stock_threshold: Joi.number().integer().min(0).allow(null).optional(),
  unit: Joi.string().max(50).default('pcs'),
  hsn_code: Joi.string().max(20).allow(null, '').optional(),
  gst_rate: Joi.number().min(0).max(100).default(18),
  is_active: Joi.boolean().default(true),
  barcode: Joi.string().allow(null, '').optional(),
  image_url: Joi.string().uri().allow(null, '').optional(),
});

const productUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  sku: Joi.string().min(1).max(100).optional(),
  description: Joi.string().allow(null, '').optional(),
  category_id: Joi.string().uuid().allow(null).optional(),
  price_mrp: Joi.number().min(0).optional(),
  price_retail: Joi.number().min(0).allow(null).optional(),
  price_wholesale: Joi.number().min(0).allow(null).optional(),
  cost_price: Joi.number().min(0).optional(),
  current_stock: Joi.number().integer().min(0).optional(),
  min_stock_threshold: Joi.number().integer().min(0).optional(),
  max_stock_threshold: Joi.number().integer().min(0).allow(null).optional(),
  unit: Joi.string().max(50).optional(),
  hsn_code: Joi.string().max(20).allow(null, '').optional(),
  gst_rate: Joi.number().min(0).max(100).optional(),
  is_active: Joi.boolean().optional(),
  barcode: Joi.string().allow(null, '').optional(),
  image_url: Joi.string().uri().allow(null, '').optional(),
});

const stockAdjustmentSchema = Joi.object({
  quantity: Joi.number().integer().required(),
  reason: Joi.string().min(1).max(500).required(),
  reference: Joi.string().allow(null, '').optional(),
});

const bulkImportItemSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  sku: Joi.string().min(1).max(100).required(),
  price_mrp: Joi.number().min(0).required(),
  cost_price: Joi.number().min(0).required(),
  current_stock: Joi.number().integer().min(0).default(0),
  category_name: Joi.string().allow(null, '').optional(),
  description: Joi.string().allow(null, '').optional(),
  unit: Joi.string().max(50).default('pcs'),
  hsn_code: Joi.string().allow(null, '').optional(),
  gst_rate: Joi.number().min(0).max(100).default(18),
});

const bulkImportSchema = Joi.object({
  products: Joi.array().items(bulkImportItemSchema).min(1).required(),
});

module.exports = {
  productCreateSchema,
  productUpdateSchema,
  stockAdjustmentSchema,
  bulkImportSchema,
};

