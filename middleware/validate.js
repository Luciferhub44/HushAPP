const { registerSchema } = require('../validation/userValidation');
const Joi = require('joi');

const bookingSchema = Joi.object({
  artisan: Joi.string().required(),
  service: Joi.string().required(),
  description: Joi.string().required(),
  location: Joi.object({
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required()
  }).required(),
  scheduledDate: Joi.date().iso().required(),
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
      return res.status(400).json({
        status: 'error',
        message: error.details.map(detail => detail.message).join(', ')
      });
    }
    next();
  },
  validateBooking: (req, res, next) => {
    const { error } = bookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message
      });
    }
    next();
  }
}; 