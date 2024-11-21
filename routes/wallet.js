const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Wallet = require('../models/Wallet');
const { AppError } = require('../middleware/error');
const { generateReference } = require('../utils/helpers');

// Get wallet balance
router.get('/balance', protect, async (req, res, next) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });
    
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id });
    }

    res.status(200).json({
      status: 'success',
      data: {
        balance: wallet.balance,
        lastActivity: wallet.lastActivity
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get transaction history
router.get('/transactions', protect, async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id })
      .populate({
        path: 'transactions.relatedOrder',
        select: 'orderNumber status'
      });

    if (!wallet) {
      return next(new AppError('Wallet not found', 404));
    }

    // Sort transactions by date
    const transactions = wallet.transactions.sort((a, b) => b.createdAt - a.createdAt);

    res.status(200).json({
      status: 'success',
      data: { transactions }
    });
  } catch (err) {
    next(err);
  }
});

// Fund wallet
router.post('/fund', protect, async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return next(new AppError('Please provide a valid amount', 400));
    }

    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      return next(new AppError('Wallet not found', 404));
    }

    // Create transaction
    const transaction = {
      type: 'credit',
      amount,
      reference: generateReference(),
      description: 'Wallet funding'
    };

    wallet.transactions.push(transaction);
    wallet.balance += amount;
    wallet.lastActivity = Date.now();

    await wallet.save();

    res.status(200).json({
      status: 'success',
      data: {
        transaction,
        newBalance: wallet.balance
      }
    });
  } catch (err) {
    next(err);
  }
});

// Withdraw from wallet
router.post('/withdraw', protect, async (req, res, next) => {
  try {
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return next(new AppError('Please provide a valid amount', 400));
    }

    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      return next(new AppError('Wallet not found', 404));
    }

    if (wallet.balance < amount) {
      return next(new AppError('Insufficient funds', 400));
    }

    // Create withdrawal transaction
    const transaction = {
      type: 'withdrawal',
      amount,
      reference: generateReference(),
      description: 'Wallet withdrawal',
      status: 'pending'
    };

    wallet.transactions.push(transaction);
    wallet.balance -= amount;
    wallet.lastActivity = Date.now();

    await wallet.save();

    // Here you would typically initiate the actual bank transfer
    // and update the transaction status accordingly

    res.status(200).json({
      status: 'success',
      data: {
        transaction,
        newBalance: wallet.balance
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 