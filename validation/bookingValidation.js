const Joi = require('joi');

const createBookingValidation = Joi.object({
  artisan: Joi.string()
    .required()
    .messages({
      'any.required': 'Please select an artisan'
    }),

  service: Joi.string()
    .required()
    .valid('Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Landscaping', 'Other')
    .messages({
      'any.required': 'Please specify the service type',
      'any.only': 'Invalid service type selected'
    }),

  description: Joi.string()
    .required()
    .max(500)
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
      'any.required': 'Please provide service description'
    }),

  location: Joi.object({
    coordinates: Joi.array()
      .items(Joi.number())
      .length(2)
      .required()
      .messages({
        'array.length': 'Location must include longitude and latitude',
        'any.required': 'Location coordinates are required'
      }),
    address: Joi.string()
      .required()
      .messages({
        'any.required': 'Service address is required'
      })
  }).required(),

  scheduledDate: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.min': 'Scheduled date cannot be in the past',
      'any.required': 'Please provide scheduled date'
    }),

  price: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Price cannot be negative',
      'any.required': 'Please specify the service price'
    }),

  estimatedDuration: Joi.object({
    value: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.min': 'Duration cannot be negative',
        'any.required': 'Please specify duration value'
      }),
    unit: Joi.string()
      .valid('minutes', 'hours', 'days')
      .default('hours')
  }),

  notes: Joi.string()
    .max(500)
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

const updateBookingValidation = Joi.object({
  status: Joi.string()
    .valid('accepted', 'rejected', 'in-progress', 'completed', 'cancelled')
    .required()
    .messages({
      'any.only': 'Invalid status',
      'any.required': 'Please provide status update'
    }),

  cancellationReason: Joi.string()
    .when('status', {
      is: 'cancelled',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'any.required': 'Please provide cancellation reason'
    }),

  notes: Joi.string()
    .max(500)
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

const reviewValidation = Joi.object({
  rating: Joi.number()
    .required()
    .min(1)
    .max(5)
    .messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
      'any.required': 'Please provide a rating'
    }),

  review: Joi.string()
    .required()
    .min(10)
    .max(500)
    .messages({
      'string.min': 'Review must be at least 10 characters',
      'string.max': 'Review cannot exceed 500 characters',
      'any.required': 'Please provide a review'
    })
});

module.exports = {
  createBookingValidation,
  updateBookingValidation,
  reviewValidation
}; 