/**
 * Notification validators using Joi.
 */
const Joi = require('joi');

const notificationCreateSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).required(),
  type: Joi.string().valid('info', 'warning', 'error', 'success', 'low_stock', 'sale', 'system').default('info'),
  target_user_id: Joi.string().uuid().allow(null).optional(),
});

const markReadSchema = Joi.object({
  notification_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

module.exports = {
  notificationCreateSchema,
  markReadSchema,
};

