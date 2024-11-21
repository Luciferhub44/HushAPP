const Joi = require('joi');

const registerValidation = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .required()
    .trim(),
  
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase(),
  
  password: Joi.string()
    .min(6)
    .required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{6,}$'))
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    }),
  
  userType: Joi.string()
    .valid('user', 'artisan')
    .required(),

  phoneNumber: Joi.string()
    .required(),

  // Artisan specific fields (required if userType is artisan)
  artisanProfile: Joi.when('userType', {
    is: 'artisan',
    then: Joi.object({
      businessName: Joi.string().required(),
      specialty: Joi.array().items(
        Joi.string().valid('Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Landscaping', 'Other')
      ).required(),
      experience: Joi.number().min(0).required(),
      bio: Joi.string().max(500),
      location: Joi.object({
        coordinates: Joi.array().items(Joi.number()).length(2).required(),
        address: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required()
      }).required()
    }).required(),
    otherwise: Joi.forbidden()
  })
});

const loginValidation = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase(),
  
  password: Joi.string()
    .required(),
    
  userType: Joi.string()
    .valid('user', 'artisan')
    .required()
});

const updateUserValidation = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .trim(),
  
  email: Joi.string()
    .email()
    .trim()
    .lowercase(),
  
  currentPassword: Joi.string()
    .when('password', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
  
  password: Joi.string()
    .min(6)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{6,}$'))
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .when('password', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'any.only': 'Passwords do not match'
    })
});

module.exports = {
  registerValidation,
  loginValidation,
  updateUserValidation
}; 