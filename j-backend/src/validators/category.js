/**
 * Category validators using Joi.
 */
const Joi = require('joi');

const categoryCreateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().allow(null, '').optional(),
});

const categoryUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().allow(null, '').optional(),
});

module.exports = {
  categoryCreateSchema,
  categoryUpdateSchema,
};

