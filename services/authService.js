const User = require('../models/User');
const { AppError } = require('../middleware/error');
const sendSMS = require('../utils/sendSMS'); // You'll need to implement this
const sendEmail = require('../utils/sendEmail'); // You'll need to implement this

const authService = {
  async register(userData) {
    // Create user with unverified status
    const user = await User.create({
      ...userData,
      isPhoneVerified: false,
      isEmailVerified: false
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP via SMS
    await sendSMS(user.phoneNumber, `Your verification code is: ${otp}`);

    // Send verification email
    await sendEmail(user.email, 'Email Verification', `Your verification code is: ${otp}`);

    return user;
  },

  async verifyOTP(userId, otp, verificationType) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.verifyOTP(otp)) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    if (verificationType === 'phone') {
      user.isPhoneVerified = true;
    } else if (verificationType === 'email') {
      user.isEmailVerified = true;
    }

    user.otp = undefined;
    await user.save();

    return user;
  },

  async login(phoneNumber, password) {
    // Find user by phone number
    const user = await User.findOne({ phoneNumber }).select('+password');
    
    if (!user || !(await user.matchPassword(password))) {
      throw new AppError('Invalid phone number or password', 401);
    }

    if (!user.isPhoneVerified) {
      throw new AppError('Please verify your phone number first', 401);
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    return { token, user };
  }
};

module.exports = authService; 