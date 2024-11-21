const Joi = require('joi');

const createProductValidation = Joi.object({
  name: Joi.string()
    .required()
    .trim()
    .max(100)
    .messages({
      'string.max': 'Product name cannot exceed 100 characters',
      'any.required': 'Product name is required'
    }),

  description: Joi.string()
    .required()
    .max(500)
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
      'any.required': 'Description is required'
    }),

  category: Joi.string()
    .required()
    .valid('Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Landscaping', 'Other')
    .messages({
      'any.only': 'Invalid category selected',
      'any.required': 'Category is required'
    }),

  price: Joi.number()
    .required()
    .min(0)
    .messages({
      'number.min': 'Price cannot be negative',
      'any.required': 'Price is required'
    }),

  priceUnit: Joi.string()
    .valid('fixed', 'hourly', 'daily')
    .default('fixed'),

  features: Joi.array()
    .items(Joi.string().trim())
    .max(10)
    .messages({
      'array.max': 'Cannot have more than 10 features'
    }),

  estimatedDuration: Joi.object({
    value: Joi.number()
      .required()
      .min(0),
    unit: Joi.string()
      .valid('minutes', 'hours', 'days')
      .default('hours')
  }),

  tags: Joi.array()
    .items(Joi.string().trim())
    .max(15)
    .messages({
      'array.max': 'Cannot have more than 15 tags'
    }),

  status: Joi.string()
    .valid('active', 'inactive', 'archived')
    .default('active')
});

const updateProductValidation = Joi.object({
  name: Joi.string()
    .trim()
    .max(100)
    .messages({
      'string.max': 'Product name cannot exceed 100 characters'
    }),

  description: Joi.string()
    .max(500)
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  category: Joi.string()
    .valid('Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Landscaping', 'Other'),

  price: Joi.number()
    .min(0)
    .messages({
      'number.min': 'Price cannot be negative'
    }),

  priceUnit: Joi.string()
    .valid('fixed', 'hourly', 'daily'),

  features: Joi.array()
    .items(Joi.string().trim())
    .max(10)
    .messages({
      'array.max': 'Cannot have more than 10 features'
    }),

  estimatedDuration: Joi.object({
    value: Joi.number()
      .min(0),
    unit: Joi.string()
      .valid('minutes', 'hours', 'days')
  }),

  tags: Joi.array()
    .items(Joi.string().trim())
    .max(15)
    .messages({
      'array.max': 'Cannot have more than 15 tags'
    }),

  status: Joi.string()
    .valid('active', 'inactive', 'archived'),

  availability: Joi.boolean()
});

const reviewValidation = Joi.object({
  rating: Joi.number()
    .required()
    .min(1)
    .max(5)
    .messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
      'any.required': 'Rating is required'
    }),

  review: Joi.string()
    .required()
    .trim()
    .min(10)
    .max(500)
    .messages({
      'string.min': 'Review must be at least 10 characters long',
      'string.max': 'Review cannot exceed 500 characters',
      'any.required': 'Review text is required'
    })
});

module.exports = {
  createProductValidation,
  updateProductValidation,
  reviewValidation
}; 