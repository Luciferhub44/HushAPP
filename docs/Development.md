# Development Guidelines

## Code Style and Standards

### General Rules
1. Use ES6+ features
2. Follow the DRY (Don't Repeat Yourself) principle
3. Keep functions small and focused
4. Use meaningful variable and function names
5. Add JSDoc comments for complex functions

### Naming Conventions
```javascript
// Variables and functions - camelCase
const userProfile = {};
function getUserData() {}

// Classes - PascalCase
class UserController {}

// Constants - UPPER_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;

// File names - kebab-case
// user-controller.js
// auth-middleware.js
```

### Code Organization
```javascript
// Imports order
const express = require('express');           // Third-party packages first
const { protect } = require('../middleware'); // Local imports second
const User = require('../models/User');       // Models last

// Function organization
class UserController {
  // Public methods first
  async getProfile() {}
  
  // Private methods last (prefix with _)
  async _validateUser() {}
}
```

## Error Handling

### Standard Error Format
```javascript
// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  }
}

// Usage in routes
router.get('/', async (req, res, next) => {
  try {
    if (!user) {
      return next(new AppError('User not found', 404));
    }
  } catch (err) {
    next(err);
  }
});
```

### Async/Await Pattern
```javascript
// Always use try-catch with async/await
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.status(200).json({ users });
}));
```

## API Design Principles

### RESTful Endpoints
```javascript
// Resource naming - plural nouns
GET    /api/users          // List users
POST   /api/users          // Create user
GET    /api/users/:id      // Get user
PUT    /api/users/:id      // Update user
DELETE /api/users/:id      // Delete user

// Sub-resources
GET    /api/users/:id/bookings    // Get user's bookings
POST   /api/bookings/:id/reviews  // Add review to booking
```

### Response Format
```javascript
// Success response
{
  "status": "success",
  "data": {
    "user": {
      "id": "123",
      "name": "John"
    }
  }
}

// Error response
{
  "status": "error",
  "message": "User not found"
}
```

## Security Best Practices

### Input Validation
```javascript
// Use Joi for validation
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const { error } = schema.validate(req.body);
if (error) {
  return next(new AppError(error.details[0].message, 400));
}
```

### Authentication
```javascript
// Always use middleware for protected routes
router.use(protect);
router.get('/profile', (req, res) => {
  // req.user is available
});

// Role-based access
router.delete('/:id', restrictTo('admin'), (req, res) => {
  // Only admins can access
});
```

## Database Operations

### Mongoose Best Practices
```javascript
// Use indexes for frequently queried fields
userSchema.index({ email: 1, username: 1 });
userSchema.index({ 'artisanProfile.location': '2dsphere' });

// Populate only required fields
const user = await User.findById(id)
  .select('name email')
  .populate('bookings', 'status date');

// Use lean() for read-only operations
const users = await User.find().lean();
```

### Query Optimization
```javascript
// Use projection to select specific fields
const user = await User.findById(id).select('name email');

// Use pagination
const users = await User.find()
  .skip(page * limit)
  .limit(limit);

// Use compound indexes for frequent queries
bookingSchema.index({ user: 1, status: 1 });
```

## Testing Guidelines

### Unit Tests
```javascript
describe('User Model', () => {
  it('should hash password before saving', async () => {
    const user = new User({
      email: 'test@test.com',
      password: 'password123'
    });
    await user.save();
    expect(user.password).not.toBe('password123');
  });
});
```

### Integration Tests
```javascript
describe('Auth Routes', () => {
  it('should login user and return token', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'test@test.com',
        password: 'password123'
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});
```

## Git Workflow

### Branch Naming
```bash
feature/user-authentication
bugfix/login-error
hotfix/security-patch
```

### Commit Messages
```bash
# Format
<type>(<scope>): <subject>

# Examples
feat(auth): add password reset functionality
fix(booking): resolve date formatting issue
docs(api): update endpoint documentation
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Peer review completed
```

## Documentation Standards

### Code Comments
```javascript
/**
 * Create a new user booking
 * @param {Object} bookingData - The booking information
 * @param {string} bookingData.artisanId - ID of the artisan
 * @param {string} bookingData.service - Type of service
 * @returns {Promise<Object>} Created booking object
 * @throws {AppError} If artisan not found or unavailable
 */
async function createBooking(bookingData) {
  // Implementation
}
```

### API Documentation
```javascript
/**
 * @api {post} /api/bookings Create Booking
 * @apiName CreateBooking
 * @apiGroup Booking
 * 
 * @apiParam {String} artisanId Artisan's unique ID
 * @apiParam {String} service Service type
 * 
 * @apiSuccess {String} id Booking ID
 * @apiSuccess {String} status Booking status
 * 
 * @apiError {Object} 404 Artisan not found
 * @apiError {Object} 400 Validation error
 */
```

## Performance Optimization

### Caching Strategy
```javascript
// Use Redis for caching
const cache = duration => async (req, res, next) => {
  const key = `__express__${req.originalUrl}`;
  const cachedResponse = await redisClient.get(key);

  if (cachedResponse) {
    return res.json(JSON.parse(cachedResponse));
  }

  res.originalJson = res.json;
  res.json = body => {
    redisClient.setEx(key, duration, JSON.stringify(body));
    res.originalJson(body);
  };
  next();
};
```

### Memory Management
```javascript
// Stream large files
const fileStream = fs.createReadStream(filePath);
fileStream.pipe(res);

// Pagination for large datasets
const paginate = async (model, query, page, limit) => {
  const skip = (page - 1) * limit;
  const data = await model.find(query)
    .skip(skip)
    .limit(limit);
  return data;
};
``` 