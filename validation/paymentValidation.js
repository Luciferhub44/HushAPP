const Joi = require('joi');

const paymentSchema = Joi.object({
  orderId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid order ID format'
    }),
  
  paymentMethod: Joi.string()
    .required()
    .valid('card', 'wallet', 'bank_transfer'),
  
  amount: Joi.when('paymentMethod', {
    is: 'wallet',
    then: Joi.number()
      .required()
      .min(0)
      .messages({
        'number.min': 'Amount must be greater than 0'
      })
  }),

  currency: Joi.string()
    .valid('usd', 'eur', 'gbp')
    .default('usd'),

  saveCard: Joi.boolean()
    .default(false)
});

const refundSchema = Joi.object({
  reason: Joi.string()
    .required()
    .valid('requested_by_customer', 'duplicate', 'fraudulent'),
  
  amount: Joi.number()
    .required()
    .min(0),
  
  description: Joi.string()
    .max(500)
});

module.exports = {
  validatePayment: (req, res, next) => {
    const { error } = paymentSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  },
  validateRefund: (req, res, next) => {
    const { error } = refundSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  }
}; 