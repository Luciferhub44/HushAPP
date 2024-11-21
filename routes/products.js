const router = require('express').Router();
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const Product = require('../models/Product');
const { upload } = require('../config/cloudinary');

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Artisan
router.post('/', protect, restrictTo('artisan'), upload.array('images', 5), async (req, res, next) => {
  try {
    // Add uploaded images to request body
    if (req.files) {
      req.body.images = req.files.map(file => ({
        url: file.path,
        public_id: file.filename
      }));
    }

    // Add artisan to request body
    req.body.artisan = req.user.id;

    const product = await Product.create(req.body);

    res.status(201).json({
      status: 'success',
      data: { product }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);

    let query = Product.find(JSON.parse(queryStr));

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Execute query
    const products = await query;

    res.status(200).json({
      status: 'success',
      results: products.length,
      data: { products }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'reviews.user',
        select: 'username avatar'
      });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { product }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Artisan
router.put('/:id', protect, restrictTo('artisan'), upload.array('images', 5), async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      artisan: req.user.id
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    // Add new images if uploaded
    if (req.files) {
      const newImages = req.files.map(file => ({
        url: file.path,
        public_id: file.filename
      }));
      req.body.images = [...product.images, ...newImages];
    }

    // Update product
    Object.assign(product, req.body);
    await product.save();

    res.status(200).json({
      status: 'success',
      data: { product }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Artisan
router.delete('/:id', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      artisan: req.user.id
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    await product.remove();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Add review to product
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    // Check if user has already reviewed
    const hasReviewed = product.reviews.some(
      review => review.user.toString() === req.user.id
    );

    if (hasReviewed) {
      return next(new AppError('You have already reviewed this product', 400));
    }

    // Add review
    product.reviews.push({
      user: req.user.id,
      rating: req.body.rating,
      review: req.body.review
    });

    await product.save();

    res.status(201).json({
      status: 'success',
      data: { product }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
