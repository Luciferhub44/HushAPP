const { registerSchema } = require('../validation/userValidation');

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
  }
}; 