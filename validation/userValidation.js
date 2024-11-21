const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().required().min(3),
  email: Joi.string().required().email(),
  password: Joi.string()
    .required()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'string.min': 'Password must be at least 8 characters long'
    }),
  confirmPassword: Joi.ref('password'),
  userType: Joi.string().valid('user', 'artisan').required(),
  phoneNumber: Joi.string().required(),
  artisanProfile: Joi.when('userType', {
    is: 'artisan',
    then: Joi.object({
      businessName: Joi.string().required(),
      specialty: Joi.array().items(Joi.string()).required(),
      experience: Joi.number().required(),
      bio: Joi.string().required(),
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

module.exports = {
  registerSchema,
  loginValidation: Joi.object({
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
  }),
  updateUserValidation: Joi.object({
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
      .min(8)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
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
  })
}; 