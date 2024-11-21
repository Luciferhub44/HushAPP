const Joi = require('joi');

const disputeSchema = Joi.object({
  orderId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid order ID format'
    }),

  type: Joi.string()
    .required()
    .valid('quality', 'delivery', 'payment', 'communication', 'other')
    .messages({
      'any.only': 'Invalid dispute type'
    }),

  description: Joi.string()
    .required()
    .min(20)
    .max(1000)
    .messages({
      'string.min': 'Description must be at least 20 characters long',
      'string.max': 'Description cannot exceed 1000 characters'
    }),

  evidence: Joi.array().items(
    Joi.object({
      type: Joi.string()
        .valid('image', 'document', 'text')
        .required(),
      url: Joi.string()
        .uri()
        .when('type', {
          is: Joi.valid('image', 'document'),
          then: Joi.required()
        }),
      description: Joi.string()
        .max(200)
        .optional()
    })
  ).max(5)
});

const disputeMessageSchema = Joi.object({
  message: Joi.string()
    .required()
    .min(1)
    .max(1000)
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 1000 characters'
    }),

  attachments: Joi.array().items(
    Joi.object({
      type: Joi.string()
        .valid('image', 'document')
        .required(),
      url: Joi.string()
        .uri()
        .required()
    })
  ).max(3)
});

const disputeResolutionSchema = Joi.object({
  type: Joi.string()
    .required()
    .valid('refund', 'partial_refund', 'release_payment', 'split_payment')
    .messages({
      'any.only': 'Invalid resolution type'
    }),

  amount: Joi.when('type', {
    is: Joi.valid('partial_refund', 'split_payment'),
    then: Joi.number().min(0).required(),
    otherwise: Joi.forbidden()
  }).messages({
    'number.min': 'Amount must be greater than 0'
  }),

  description: Joi.string()
    .required()
    .min(20)
    .max(500)
    .messages({
      'string.min': 'Resolution description must be at least 20 characters',
      'string.max': 'Resolution description cannot exceed 500 characters'
    })
});

module.exports = {
  validateDispute: (req, res, next) => {
    const { error } = disputeSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details.map(detail => detail.message).join(', ')
      });
    }
    next();
  },

  validateDisputeMessage: (req, res, next) => {
    const { error } = disputeMessageSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details.map(detail => detail.message).join(', ')
      });
    }
    next();
  },

  validateDisputeResolution: (req, res, next) => {
    const { error } = disputeResolutionSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details.map(detail => detail.message).join(', ')
      });
    }
    next();
  }
}; 