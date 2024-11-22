const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { AppError } = require('../middleware/error');

const adminRouter = express.Router();

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    console.log('Admin auth middleware - headers:', req.headers);
    
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this route'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded:', decoded);

      if (decoded.email !== process.env.ADMIN_EMAIL) {
        console.log('Invalid admin email:', decoded.email);
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to access this route'
        });
      }

      next();
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

// Admin login
adminRouter.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;
    
    console.log('Comparing with:', {
      configEmail: process.env.ADMIN_EMAIL,
      configPassword: process.env.ADMIN_PASSWORD,
      providedEmail: email,
      providedPassword: password
    });

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { email: process.env.ADMIN_EMAIL, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      console.log('Login successful, token generated');
      res.json({
        status: 'success',
        token
      });
    } else {
      console.log('Login failed: Invalid credentials');
      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed'
    });
  }
});

// Protected admin routes
adminRouter.use(adminAuth);

// Dashboard stats
adminRouter.get('/dashboard', async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    res.json({
      status: 'success',
      data: {
        users: stats[0],
        orders: stats[1],
        revenue: stats[2][0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get all users
adminRouter.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      status: 'success',
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get all products
adminRouter.get('/products', async (req, res) => {
  try {
    const products = await Product.find().populate('artisan', 'username email');
    res.json({
      status: 'success',
      data: { products }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get all orders
adminRouter.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email')
      .populate('artisan', 'username email')
      .populate('product', 'name price');
    
    res.json({
      status: 'success',
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = { adminRouter }; 