const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { errorHandler } = require('../middleware/error');
const User = require('../models/User');
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/users');
const bookingRoutes = require('../routes/bookings');

// Create test app
const createTestApp = () => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(cors());
  app.use(helmet());
  app.use(mongoSanitize());
  app.use(xss());
  app.use(hpp());

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/bookings', bookingRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Server is healthy'
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
};

const app = createTestApp();

describe('API Endpoints', () => {
  let testUser;
  let testArtisan;
  let userAuthToken;
  let artisanAuthToken;
  let artisanId;

  beforeAll(async () => {
    try {
      // Connect to test database
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to test database');
      
      // Clear test database
      await User.deleteMany({});

      // Create test user data
      const timestamp = Date.now();
      testUser = {
        username: `user_${timestamp}`,
        email: `user_${timestamp}@example.com`,
        password: `Test${timestamp}!@#`,
        userType: 'user',
        phoneNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`
      };

      testArtisan = {
        username: `artisan_${timestamp}`,
        email: `artisan_${timestamp}@example.com`,
        password: `Test${timestamp}!@#`,
        userType: 'artisan',
        phoneNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        artisanProfile: {
          businessName: `Service Pro ${timestamp}`,
          specialty: ['Plumbing', 'General Repairs'],
          experience: Math.floor(Math.random() * 20) + 1,
          bio: 'Professional service provider',
          location: {
            type: 'Point',
            coordinates: [-73.935242, 40.730610],
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State'
          }
        }
      };

    } catch (error) {
      console.error('Database setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
    console.log('Test database connection closed');
  });

  describe('Health Check', () => {
    it('should return server health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Authentication & User Management', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      console.log('Register user response:', res.body);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.token).toBeDefined();
      userAuthToken = res.body.data.token;
    });

    it('should register a new artisan', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testArtisan);

      console.log('Register artisan response:', res.body);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe(testArtisan.email);
      artisanId = res.body.data.user.id;
      artisanAuthToken = res.body.data.token;
    });

    it('should login as user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      console.log('Login response:', res.body);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
      userAuthToken = res.body.data.token;
    });

    it('should get user profile', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${userAuthToken}`);

      console.log('Get profile response:', res.body);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe(testUser.email);
    });
  });

  describe('Bookings', () => {
    it('should create a new booking', async () => {
      // Skip if we don't have required data
      if (!userAuthToken || !artisanId) {
        console.log('Skipping booking test - missing required data');
        return;
      }

      const booking = {
        artisan: artisanId,
        service: 'Plumbing',
        description: 'Fix leaky faucet',
        location: {
          type: 'Point',
          coordinates: [-73.935242, 40.730610],
          address: '123 Test St'
        },
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        estimatedDuration: {
          value: 2,
          unit: 'hours'
        },
        price: 100
      };

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAuthToken}`)
        .send(booking);

      console.log('Create booking response:', res.body);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.booking.service).toBe(booking.service);
    });
  });
}); 