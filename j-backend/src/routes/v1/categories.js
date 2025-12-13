/**
 * Categories API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireRole } = require('../../middleware/auth');
const { Category } = require('../../models');
const { Op } = require('sequelize');

const router = express.Router();

// POST / - Create category
router.post('', authenticate, requireRole(['owner', 'manager', 'admin']), asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.status(400).json({ detail: 'User is not associated with a shop' });
  }
  
  const { name, description } = req.body;
  
  const existing = await Category.findOne({
    where: { shop_id: req.user.shop_id, name },
  });
  
  if (existing) {
    return res.status(400).json({ detail: 'Category with this name already exists' });
  }
  
  const newCategory = await Category.create({
    id: uuidv4(),
    shop_id: req.user.shop_id,
    name,
    description,
  });
  
  res.status(201).json(newCategory);
}));

// GET / - List categories
router.get('', authenticate, asyncHandler(async (req, res) => {
  if (!req.user.shop_id) {
    return res.json({ categories: [], total: 0, skip: 0, limit: 100 });
  }
  
  const { skip = 0, limit = 100, search } = req.query;
  
  const where = { shop_id: req.user.shop_id };
  
  if (search) {
    where.name = { [Op.iLike]: `%${search}%` };
  }
  
  const { count, rows } = await Category.findAndCountAll({
    where,
    offset: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
  
  res.json({
    categories: rows,
    total: count,
    skip: parseInt(skip, 10),
    limit: parseInt(limit, 10),
  });
}));

// GET /:category_id
router.get('/:category_id', authenticate, asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.category_id);
  
  if (!category) {
    return res.status(404).json({ detail: 'Category not found' });
  }
  
  if (category.shop_id !== req.user.shop_id) {
    return res.status(403).json({
      detail: "You don't have permission to access this category",
    });
  }
  
  res.json(category);
}));

// PATCH /:category_id
router.patch('/:category_id', authenticate, requireRole(['owner', 'manager', 'admin']), asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.category_id);
  
  if (!category) {
    return res.status(404).json({ detail: 'Category not found' });
  }
  
  if (category.shop_id !== req.user.shop_id) {
    return res.status(403).json({
      detail: "You don't have permission to update this category",
    });
  }
  
  const { name, description } = req.body;
  
  if (name !== undefined && name !== category.name) {
    const existing = await Category.findOne({
      where: {
        shop_id: req.user.shop_id,
        name,
        id: { [Op.ne]: req.params.category_id },
      },
    });
    
    if (existing) {
      return res.status(400).json({ detail: 'Category with this name already exists' });
    }
  }
  
  await category.update({ name, description });
  
  res.json(category);
}));

// DELETE /:category_id
router.delete('/:category_id', authenticate, requireRole(['owner', 'manager', 'admin']), asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.category_id);
  
  if (!category) {
    return res.status(404).json({ detail: 'Category not found' });
  }
  
  if (category.shop_id !== req.user.shop_id) {
    return res.status(403).json({
      detail: "You don't have permission to delete this category",
    });
  }
  
  await category.destroy();
  
  res.status(204).send();
}));

module.exports = router;

