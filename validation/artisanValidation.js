const Joi = require('joi');

const artisanProfileValidation = Joi.object({
  businessName: Joi.string()
    .required()
    .trim()
    .max(100)
    .messages({
      'string.max': 'Business name cannot exceed 100 characters',
      'any.required': 'Business name is required'
    }),

  specialty: Joi.array()
    .items(
      Joi.string().valid(
        'Plumbing',
        'Electrical',
        'Carpentry',
        'Painting',
        'Cleaning',
        'Landscaping',
        'Other'
      )
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one specialty is required',
      'any.required': 'Specialties are required'
    }),

  experience: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Experience years cannot be negative',
      'any.required': 'Experience is required'
    }),

  bio: Joi.string()
    .max(500)
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),

  location: Joi.object({
    coordinates: Joi.array()
      .items(Joi.number())
      .length(2)
      .required()
      .messages({
        'array.length': 'Coordinates must include longitude and latitude',
        'any.required': 'Location coordinates are required'
      }),
    address: Joi.string()
      .required()
      .messages({
        'any.required': 'Address is required'
      }),
    city: Joi.string()
      .required()
      .messages({
        'any.required': 'City is required'
      }),
    state: Joi.string()
      .required()
      .messages({
        'any.required': 'State is required'
      })
  }).required()
});

const certificationValidation = Joi.object({
  name: Joi.string()
    .required()
    .trim()
    .messages({
      'any.required': 'Certification name is required'
    }),

  issuer: Joi.string()
    .required()
    .trim()
    .messages({
      'any.required': 'Issuer name is required'
    }),

  year: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear())
    .required()
    .messages({
      'number.min': 'Invalid year',
      'number.max': 'Year cannot be in the future',
      'any.required': 'Year is required'
    })
});

const availabilityValidation = Joi.object({
  availability: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Availability status is required'
    })
});

const searchValidation = Joi.object({
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.min': 'Invalid longitude',
      'number.max': 'Invalid longitude',
      'any.required': 'Longitude is required'
    }),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.min': 'Invalid latitude',
      'number.max': 'Invalid latitude',
      'any.required': 'Latitude is required'
    }),

  maxDistance: Joi.number()
    .min(0)
    .max(50000) // 50km max
    .default(10000),

  specialty: Joi.string()
    .valid(
      'Plumbing',
      'Electrical',
      'Carpentry',
      'Painting',
      'Cleaning',
      'Landscaping',
      'Other'
    ),

  minRating: Joi.number()
    .min(0)
    .max(5),

  available: Joi.boolean(),

  verified: Joi.boolean(),

  sortBy: Joi.string()
    .valid('rating', 'experience', 'distance')
    .default('distance'),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
});

module.exports = {
  artisanProfileValidation,
  certificationValidation,
  availabilityValidation,
  searchValidation
}; 