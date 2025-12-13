/**
 * Shops API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireRole } = require('../../middleware/auth');
const { Shop } = require('../../models');
const { Op } = require('sequelize');

const router = express.Router();

// POST / - Create shop
router.post('', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { name, address, timezone = 'UTC', currency = 'INR', gst_number } = req.body;
  
  const newShop = await Shop.create({
    id: uuidv4(),
    name,
    address,
    timezone,
    currency,
    gst_number,
    owner_user_id: null,
  });
  
  res.status(201).json(newShop);
}));

// GET / - List shops
router.get('', authenticate, asyncHandler(async (req, res) => {
  const { skip = 0, limit = 100, search } = req.query;
  
  const where = {};
  
  // Non-admin users can only see their own shop
  if (req.user.role !== 'admin') {
    if (!req.user.shop_id) {
      return res.json({ shops: [], total: 0, skip: parseInt(skip, 10), limit: parseInt(limit, 10) });
    }
    where.id = req.user.shop_id;
  }
  
  if (search) {
    where.name = { [Op.iLike]: `%${search}%` };
  }
  
  const { count, rows } = await Shop.findAndCountAll({
    where,
    offset: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
  
  res.json({
    shops: rows,
    total: count,
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
}));

// GET /:shop_id
router.get('/:shop_id', authenticate, asyncHandler(async (req, res) => {
  const shop = await Shop.findByPk(req.params.shop_id);
  
  if (!shop) {
    return res.status(404).json({ detail: 'Shop not found' });
  }
  
  if (req.user.role !== 'admin' && req.user.shop_id !== req.params.shop_id) {
    return res.status(403).json({
      detail: "You don't have permission to access this shop",
    });
  }
  
  res.json(shop);
}));

// PATCH /:shop_id
router.patch('/:shop_id', authenticate, requireRole(['owner', 'admin']), asyncHandler(async (req, res) => {
  const shop = await Shop.findByPk(req.params.shop_id);
  
  if (!shop) {
    return res.status(404).json({ detail: 'Shop not found' });
  }
  
  if (req.user.role !== 'admin' && req.user.shop_id !== req.params.shop_id) {
    return res.status(403).json({
      detail: "You don't have permission to update this shop",
    });
  }
  
  const { name, address, timezone, currency, gst_number } = req.body;
  const updateData = {};
  
  if (name !== undefined) updateData.name = name;
  if (address !== undefined) updateData.address = address;
  if (timezone !== undefined) updateData.timezone = timezone;
  if (currency !== undefined) updateData.currency = currency;
  if (gst_number !== undefined) updateData.gst_number = gst_number;
  
  await shop.update(updateData);
  
  res.json(shop);
}));

// DELETE /:shop_id
router.delete('/:shop_id', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const shop = await Shop.findByPk(req.params.shop_id);
  
  if (!shop) {
    return res.status(404).json({ detail: 'Shop not found' });
  }
  
  await shop.destroy();
  
  res.status(204).send();
}));

module.exports = router;

