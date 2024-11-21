# Troubleshooting Guide

## Common Issues and Solutions

### Authentication Issues

#### JWT Token Issues
```
Error: Invalid token
```
**Solutions:**
1. Check token expiration
```javascript
// Verify token expiration
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('Token exp:', new Date(decoded.exp * 1000));
```

2. Verify JWT secret
```bash
# Check if JWT_SECRET is properly set
echo $JWT_SECRET

# Generate new secure secret if needed
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Login Failures
```
Error: Invalid credentials
```
**Solutions:**
1. Check password hashing
```javascript
// Debug password comparison
const isMatch = await bcrypt.compare(enteredPassword, user.password);
console.log('Password match:', isMatch);
```

2. Verify user exists with correct type
```javascript
const user = await User.findOne({ 
  email, 
  userType 
}).select('+password');
console.log('User found:', !!user);
```

### Database Connection Issues

#### MongoDB Connection Failures
```
Error: MongoDB connection error
```
**Solutions:**
1. Check connection string
```javascript
// Test connection string format
const isValidConnectionString = /^mongodb(\+srv)?:\/\/.+/.test(process.env.MONGODB_URI);
console.log('Valid connection string:', isValidConnectionString);
```

2. Verify network access
```bash
# Test MongoDB connectivity
nc -zv cluster0.mongodb.net 27017

# Check IP whitelist
curl -s "https://api.mongodb.com/v1/groups/{GROUP_ID}/whitelist" \
  -H "Authorization: Bearer ${MONGODB_API_KEY}"
```

#### Mongoose Query Issues
```
Error: Cast to ObjectId failed
```
**Solutions:**
1. Validate ObjectId
```javascript
const isValidId = mongoose.Types.ObjectId.isValid(id);
if (!isValidId) {
  throw new AppError('Invalid ID format', 400);
}
```

2. Debug queries
```javascript
mongoose.set('debug', true);
```

### File Upload Issues

#### Cloudinary Upload Failures
```
Error: Upload failed
```
**Solutions:**
1. Check Cloudinary credentials
```javascript
cloudinary.config().cloud_name // Should match env var
```

2. Verify file size and type
```javascript
const isValidFileType = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  return allowedTypes.includes(file.mimetype);
};
```

#### Multer Configuration Issues
```
Error: Unexpected field
```
**Solutions:**
1. Check form data format
```javascript
// Debug uploaded files
console.log('Files:', req.files);
console.log('Body:', req.body);
```

2. Verify multer configuration
```javascript
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    console.log('Processing file:', file.originalname);
    // ... rest of filter
  }
});
```

### WebSocket Connection Issues

#### Socket.IO Connection Failures
```
Error: Authentication error
```
**Solutions:**
1. Debug connection attempt
```javascript
io.on('connection', (socket) => {
  console.log('Connection attempt:', {
    id: socket.id,
    auth: socket.handshake.auth
  });
});
```

2. Check CORS configuration
```javascript
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### Payment Processing Issues

#### Stripe Integration Problems
```
Error: Invalid Stripe key
```
**Solutions:**
1. Verify Stripe configuration
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.customers.list({ limit: 1 })
  .then(() => console.log('Stripe configured correctly'))
  .catch(console.error);
```

2. Debug webhook events
```javascript
// Add logging to webhook handler
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
console.log('Webhook event:', event.type);
```

### Performance Issues

#### High Memory Usage
```
Error: JavaScript heap out of memory
```
**Solutions:**
1. Monitor memory usage
```javascript
const used = process.memoryUsage();
console.log(`Memory usage: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
```

2. Implement pagination
```javascript
const results = await Model.find()
  .skip(page * limit)
  .limit(limit)
  .lean();
```

#### Slow Response Times
```
Warning: Request timeout
```
**Solutions:**
1. Add response time monitoring
```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
  });
  next();
});
```

2. Optimize database queries
```javascript
// Add indexes for frequent queries
modelSchema.index({ field: 1 });

// Use lean() for read operations
const docs = await Model.find().lean();
```

### Environment Configuration Issues

#### Missing Environment Variables
```
Error: Required environment variable not set
```
**Solutions:**
1. Validate environment variables
```javascript
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required env var: ${varName}`);
  }
});
```

2. Check .env file
```bash
# Verify .env file exists and is readable
test -r .env && echo "OK" || echo "Missing .env"

# Check file permissions
ls -l .env
```

## Debugging Tools

### Logging Utilities
```javascript
const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({ level: 'info', msg, ...meta }));
  },
  error: (msg, error) => {
    console.error(JSON.stringify({
      level: 'error',
      msg,
      error: {
        message: error.message,
        stack: error.stack
      }
    }));
  }
};
```

### Request Debugging
```javascript
app.use((req, res, next) => {
  if (process.env.DEBUG) {
    console.log({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query
    });
  }
  next();
});
```

## Maintenance Tasks

### Database Maintenance
```javascript
// Clean up expired sessions
const cleanupSessions = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await Session.deleteMany({ lastActivity: { $lt: thirtyDaysAgo } });
};

// Repair database indexes
const repairIndexes = async () => {
  await mongoose.connection.db.command({ repairDatabase: 1 });
};
```

### File Storage Cleanup
```javascript
// Remove unused files
const cleanupFiles = async () => {
  const unusedFiles = await File.find({ used: false });
  for (const file of unusedFiles) {
    await cloudinary.uploader.destroy(file.public_id);
    await file.remove();
  }
};
```

## Health Checks

### System Health Check
```javascript
const healthCheck = async () => {
  const checks = {
    database: await checkDatabaseConnection(),
    redis: await checkRedisConnection(),
    storage: await checkStorageSpace(),
    memory: checkMemoryUsage()
  };

  return Object.entries(checks)
    .every(([_, status]) => status === 'healthy');
};
```

### Service Dependencies Check
```javascript
const checkDependencies = async () => {
  try {
    // Check MongoDB
    await mongoose.connection.db.admin().ping();
    
    // Check Stripe
    await stripe.paymentIntents.list({ limit: 1 });
    
    // Check Cloudinary
    await cloudinary.api.ping();
    
    return true;
  } catch (error) {
    logger.error('Dependency check failed', error);
    return false;
  }
}; 