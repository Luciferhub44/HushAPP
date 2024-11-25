const Joi = require('joi');
const AppError = require('../utils/AppError');

const scheduleSchema = Joi.object({
  day: Joi.string()
    .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    .required(),
  slots: Joi.array().items(
    Joi.object({
      startTime: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required()
        .messages({
          'string.pattern.base': 'Start time must be in HH:mm format'
        }),
      endTime: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required()
        .messages({
          'string.pattern.base': 'End time must be in HH:mm format'
        }),
      isAvailable: Joi.boolean().default(true)
    })
  ).required()
});

const customDateSchema = Joi.object({
  date: Joi.date().greater('now').required(),
  isAvailable: Joi.boolean().required(),
  reason: Joi.string().when('isAvailable', {
    is: false,
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

const serviceSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string(),
  basePrice: Joi.number().min(0).required(),
  category: Joi.string().required()
});

const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().required(),
  bookingId: Joi.string().required()
});

const locationSchema = Joi.object({
  coordinates: Joi.array().items(Joi.number()).length(2).required(),
  type: Joi.string().valid('Point').required()
});

const serviceAreaSchema = Joi.object({
  type: Joi.string().valid('Polygon').required(),
  coordinates: Joi.array().items(
    Joi.array().items(
      Joi.array().items(Joi.number()).length(2).min(3)
    ).min(1)
  ).required()
});

const validateArtisan = {
  validateAvailability: (req, res, next) => {
    const schema = Joi.object({
      schedule: Joi.array().items(scheduleSchema),
      customDates: Joi.array().items(customDateSchema)
    }).min(1);

    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  },

  validateService: (req, res, next) => {
    const { error } = serviceSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  },

  validateReview: (req, res, next) => {
    const { error } = reviewSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  },

  validateLocation: (req, res, next) => {
    const { error } = locationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  },

  validateServiceArea: (req, res, next) => {
    const { error } = serviceAreaSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  },

  validatePreferences: (req, res, next) => {
    const schema = Joi.object({
      maxDailyBookings: Joi.number().min(1).max(50),
      minLeadTime: Joi.number().min(0),
      maxTravelDistance: Joi.number().min(1),
      autoAcceptBookings: Joi.boolean(),
      notificationPreferences: Joi.object({
        email: Joi.boolean(),
        sms: Joi.boolean(),
        push: Joi.boolean()
      })
    }).min(1);

    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  }
};

module.exports = validateArtisan; 