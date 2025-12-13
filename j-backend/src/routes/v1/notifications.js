/**
 * Notifications API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireRole } = require('../../middleware/auth');
const { Notification } = require('../../models');
const { Op } = require('sequelize');

const router = express.Router();

// POST / - Create notification
router.post('', authenticate, requireRole(['owner', 'manager', 'admin']), asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { title, message, type, target_user_id } = req.body;
  
  const newNotification = await Notification.create({
    id: uuidv4(),
    shop_id: req.user.shop_id,
    target_user_id: target_user_id || null,
    title,
    message,
    type,
    is_read: false,
  });
  
  res.status(201).json(newNotification);
}));

// GET / - List notifications
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.json({
      notifications: [],
      total: 0,
      unread_count: 0,
      skip: 0,
      limit: 100,
    });
  }
  
  const { skip = 0, limit = 100, unread_only } = req.query;
  
  const where = {
    shop_id: req.user.shop_id,
    [Op.or]: [
      { target_user_id: req.user.id },
      { target_user_id: null },
    ],
  };
  
  if (unread_only === 'true') {
    where.is_read = false;
  }
  
  const { count, rows } = await Notification.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    offset: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
  
  const unreadCount = await Notification.count({
    where: {
      shop_id: req.user.shop_id,
      [Op.or]: [
        { target_user_id: req.user.id },
        { target_user_id: null },
      ],
      is_read: false,
    },
  });
  
  res.json({
    notifications: rows,
    total: count,
    unread_count: unreadCount,
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
}));

// POST /mark-read
router.post('/mark-read', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { notification_ids } = req.body;
  
  const [updated] = await Notification.update(
    { is_read: true, read_at: new Date() },
    {
      where: {
        id: { [Op.in]: notification_ids },
        shop_id: req.user.shop_id,
        [Op.or]: [
          { target_user_id: req.user.id },
          { target_user_id: null },
        ],
      },
    },
  );
  
  res.json({
    message: `Marked ${updated} notification(s) as read`,
    count: updated,
  });
}));

// POST /mark-all-read
router.post('/mark-all-read', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const [updated] = await Notification.update(
    { is_read: true, read_at: new Date() },
    {
      where: {
        shop_id: req.user.shop_id,
        [Op.or]: [
          { target_user_id: req.user.id },
          { target_user_id: null },
        ],
        is_read: false,
      },
    },
  );
  
  res.json({
    message: `Marked all ${updated} notification(s) as read`,
    count: updated,
  });
}));

// DELETE /:notification_id
router.delete('/:notification_id', authenticate, asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    where: {
      id: req.params.notification_id,
      shop_id: req.user.shop_id,
      [Op.or]: [
        { target_user_id: req.user.id },
        { target_user_id: null },
      ],
    },
  });
  
  if (!notification) {
    return res.status(404).json({ detail: 'Notification not found' });
  }
  
  await notification.destroy();
  
  res.status(204).send();
}));

module.exports = router;

