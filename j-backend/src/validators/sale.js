/**
 * Sale validators using Joi.
 */
const Joi = require('joi');

const saleItemSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).required(),
  unit_price: Joi.number().min(0).optional(),
  discount_percent: Joi.number().min(0).max(100).default(0),
});

const customerInfoSchema = Joi.object({
  name: Joi.string().allow(null, '').optional(),
  phone: Joi.string().allow(null, '').optional(),
  email: Joi.string().email().allow(null, '').optional(),
  address: Joi.string().allow(null, '').optional(),
  gst_number: Joi.string().allow(null, '').optional(),
});

const saleCreateSchema = Joi.object({
  items: Joi.array().items(saleItemSchema).min(1).required(),
  customer_info: customerInfoSchema.allow(null).optional(),
  payment_type: Joi.string().valid('cash', 'card', 'upi', 'credit', 'other').default('cash'),
  discount_amount: Joi.number().min(0).default(0),
  notes: Joi.string().allow(null, '').optional(),
});

const saleUpdateSchema = Joi.object({
  status: Joi.string().valid('completed', 'pending', 'cancelled', 'refunded').optional(),
  payment_type: Joi.string().valid('cash', 'card', 'upi', 'credit', 'other').optional(),
  notes: Joi.string().allow(null, '').optional(),
});

const refundSchema = Joi.object({
  reason: Joi.string().min(1).max(500).required(),
  refund_amount: Joi.number().min(0).optional(),
});

module.exports = {
  saleItemSchema,
  customerInfoSchema,
  saleCreateSchema,
  saleUpdateSchema,
  refundSchema,
};

