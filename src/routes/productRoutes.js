const express = require('express');
const controller = require('../controllers/productController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.route('/').post(asyncHandler(controller.createProduct)).get(asyncHandler(controller.getProducts));
router.get('/low-stock', asyncHandler(controller.getLowStock));
router.get('/summary', asyncHandler(controller.getCategorySummary));
router.patch('/:id/stock', asyncHandler(controller.adjustStock));
router.route('/:id').get(asyncHandler(controller.getProduct)).put(asyncHandler(controller.updateProduct)).delete(asyncHandler(controller.deleteProduct));

module.exports = router;
