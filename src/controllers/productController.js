const mongoose = require('mongoose');
const Product = require('../models/Product');
const httpError = require('../utils/httpError');

const SORT_FIELDS = new Set(['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'createdAt', 'updatedAt']);
const EDITABLE_FIELDS = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'];

function parseNumber(value, label, { min = 0, integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || (integer && !Number.isInteger(number))) {
    throw httpError(400, `${label} must be ${integer ? 'a non-negative whole number' : 'a non-negative number'}`);
  }
  return number;
}

function validateId(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid product ID');
}

function pickEditableFields(body, { required = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Request body must be a JSON object');
  const values = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.hasOwn(body, field)) values[field] = body[field];
  }
  if (required) {
    for (const field of ['name', 'sku', 'category', 'price', 'quantity']) {
      if (!Object.hasOwn(values, field)) throw httpError(400, `${field} is required`);
    }
  } else if (Object.keys(values).length === 0) {
    throw httpError(400, 'Provide at least one editable product field');
  }
  return values;
}

exports.createProduct = async (req, res) => {
  const product = await Product.create(pickEditableFields(req.body, { required: true }));
  res.status(201).json(product);
};

exports.getProducts = async (req, res) => {
  const page = parseNumber(req.query.page ?? 1, 'page', { min: 1, integer: true });
  const limit = parseNumber(req.query.limit ?? 10, 'limit', { min: 1, integer: true });
  if (limit > 100) throw httpError(400, 'limit cannot exceed 100');

  const filter = {};
  if (req.query.category) filter.category = new RegExp(`^${escapeRegex(req.query.category.trim())}$`, 'i');
  if (req.query.supplier) filter.supplier = new RegExp(escapeRegex(req.query.supplier.trim()), 'i');
  if (req.query.search) {
    const term = escapeRegex(req.query.search.trim());
    filter.$or = ['name', 'sku', 'category', 'supplier'].map((field) => ({ [field]: new RegExp(term, 'i') }));
  }
  if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
    filter.price = {};
    if (req.query.minPrice !== undefined) filter.price.$gte = parseNumber(req.query.minPrice, 'minPrice');
    if (req.query.maxPrice !== undefined) filter.price.$lte = parseNumber(req.query.maxPrice, 'maxPrice');
    if (filter.price.$gte !== undefined && filter.price.$lte !== undefined && filter.price.$gte > filter.price.$lte) {
      throw httpError(400, 'minPrice cannot be greater than maxPrice');
    }
  }
  if (req.query.lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$reorderLevel'] };
  else if (req.query.lowStock !== undefined && req.query.lowStock !== 'false') throw httpError(400, 'lowStock must be true or false');

  const sortField = req.query.sortBy || 'createdAt';
  if (!SORT_FIELDS.has(sortField)) throw httpError(400, `sortBy must be one of: ${[...SORT_FIELDS].join(', ')}`);
  const order = req.query.order || 'asc';
  if (!['asc', 'desc'].includes(order.toLowerCase())) throw httpError(400, 'order must be asc or desc');
  const sort = { [sortField]: order.toLowerCase() === 'desc' ? -1 : 1, _id: 1 };

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ total, page, totalPages: Math.ceil(total / limit), count: products.length, products });
};

exports.getProduct = async (req, res) => {
  validateId(req.params.id);
  const product = await Product.findById(req.params.id);
  if (!product) throw httpError(404, 'Product not found');
  res.json(product);
};

exports.updateProduct = async (req, res) => {
  validateId(req.params.id);
  const product = await Product.findByIdAndUpdate(req.params.id, pickEditableFields(req.body), {
    new: true,
    runValidators: true,
    context: 'query',
  });
  if (!product) throw httpError(404, 'Product not found');
  res.json(product);
};

exports.adjustStock = async (req, res) => {
  validateId(req.params.id);
  const { change } = req.body || {};
  if (!Number.isInteger(change) || change === 0) throw httpError(400, 'change must be a non-zero whole number');
  const conditions = { _id: req.params.id };
  if (change < 0) conditions.quantity = { $gte: Math.abs(change) };

  const product = await Product.findOneAndUpdate(conditions, { $inc: { quantity: change } }, { new: true, runValidators: true });
  if (!product) {
    const exists = await Product.exists({ _id: req.params.id });
    if (!exists) throw httpError(404, 'Product not found');
    throw httpError(409, 'Insufficient stock for this sale');
  }
  res.json({ message: 'Stock updated', product });
};

exports.deleteProduct = async (req, res) => {
  validateId(req.params.id);
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw httpError(404, 'Product not found');
  res.json({ message: 'Product deleted', id: product.id });
};

exports.getLowStock = async (req, res) => {
  const lowStockItems = await Product.find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } }).sort({ quantity: 1, name: 1 });
  res.json({ count: lowStockItems.length, lowStockItems });
};

exports.getCategorySummary = async (_req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        avgPrice: { $avg: '$price' },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 1, totalItems: 1, totalQuantity: 1, totalStockValue: 1, avgPrice: 1 } },
  ]);
  res.json({ categories: summary.length, summary });
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
