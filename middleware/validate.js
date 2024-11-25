const Joi = require('joi');
const AppError = require('../utils/AppError');

const registerSchema = Joi.object({
  username: Joi.string().required().min(3),
  email: Joi.string().required().email(),
  password: Joi.string()
    .required()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
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
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).required(),
        address: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required()
      }).required()
    })
  })
});

const bookingSchema = Joi.object({
  artisan: Joi.string().required(),
  service: Joi.string().required(),
  description: Joi.string().required(),
  location: Joi.object({
    type: Joi.string().valid('Point').required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required()
  }).required(),
  scheduledDate: Joi.date().greater('now').required(),
  estimatedDuration: Joi.object({
    value: Joi.number().required(),
    unit: Joi.string().valid('hours', 'days').required()
  }).required(),
  price: Joi.number().required()
});

module.exports = {
  validateRegister: (req, res, next) => {
    const { error } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  },
  validateBooking: (req, res, next) => {
    const { error } = bookingSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  }
}; 