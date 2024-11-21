# Testing Documentation

## Testing Setup

### Prerequisites
- Jest for unit and integration testing
- Supertest for API testing
- MongoDB Memory Server for testing database

### Installation
```bash
npm install --save-dev jest supertest mongodb-memory-server @types/jest
```

Add to package.json:
```json
{
  "scripts": {
    "test": "jest --detectOpenHandles",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": [
      "/node_modules/"
    ]
  }
}
```

## Test Structure

### Directory Structure
```
tests/
├── unit/
│   ├── models/
│   ├── utils/
│   └── middleware/
├── integration/
│   ├── auth/
│   ├── bookings/
│   ├── payments/
│   └── chat/
└── fixtures/
    ├── users.js
    ├── bookings.js
    └── payments.js
```

### Test Categories

1. **Unit Tests**
   - Models validation
   - Utility functions
   - Middleware functions
   - Helper functions

2. **Integration Tests**
   - API endpoints
   - Database operations
   - Authentication flows
   - Payment processing

3. **End-to-End Tests**
   - Complete user flows
   - Real-time features
   - File uploads

## Example Tests

### User Authentication Test
```javascript
describe('User Authentication', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!',
          confirmPassword: 'Test123!',
          userType: 'user',
          phoneNumber: '1234567890'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toHaveProperty('username', 'testuser');
    });
  });
});
```

### Booking Creation Test
```javascript
describe('Booking Operations', () => {
  let userToken;
  let artisanId;

  beforeEach(async () => {
    // Setup test user and get token
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
        userType: 'user'
      });
    userToken = loginRes.body.token;
  });

  it('should create a new booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        artisan: artisanId,
        service: 'Plumbing',
        description: 'Fix leaky faucet',
        location: {
          coordinates: [123.456, 789.012],
          address: '123 Test St'
        },
        scheduledDate: new Date()
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.booking).toHaveProperty('status', 'pending');
  });
});
```

## WebSocket Testing
```javascript
describe('WebSocket Connections', () => {
  let clientSocket;
  let token;

  beforeAll((done) => {
    // Setup WebSocket client with authentication
    clientSocket = io(`http://localhost:${process.env.PORT}`, {
      auth: { token }
    });
    clientSocket.on('connect', done);
  });

  afterAll(() => {
    clientSocket.close();
  });

  it('should receive message acknowledgment', (done) => {
    clientSocket.emit('sendMessage', {
      chatId: 'test-chat-id',
      content: 'Test message'
    });

    clientSocket.on('newMessage', (data) => {
      expect(data).toHaveProperty('chatId');
      expect(data.message.content).toBe('Test message');
      done();
    });
  });
});
```

## Test Coverage Requirements

### Minimum Coverage Thresholds
```javascript
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### Critical Areas for Testing
1. Authentication & Authorization
2. Payment Processing
3. File Uploads
4. Real-time Communication
5. Data Validation
6. Error Handling

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16.x'
    - run: npm ci
    - run: npm test
```

## Performance Testing

### Load Testing with Artillery
```yaml
config:
  target: "http://localhost:5000"
  phases:
    - duration: 60
      arrivalRate: 20
scenarios:
  - flow:
      - post:
          url: "/api/users/login"
          json:
            email: "test@example.com"
            password: "Test123!"
```

## Security Testing

### Key Areas
1. Authentication bypass attempts
2. SQL injection
3. XSS attacks
4. CSRF vulnerabilities
5. Rate limiting effectiveness

## Test Reports

### Coverage Report Example
```bash
--------------------------|---------|----------|---------|---------|-------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------------------|---------|----------|---------|---------|-------------------
All files                 |   85.71 |    78.95 |   89.47 |   85.71 |                   
 config                   |     100 |      100 |     100 |     100 |                   
  database.js            |     100 |      100 |     100 |     100 |                   
 middleware              |   83.33 |    76.92 |   85.71 |   83.33 |                   
  auth.js                |   85.71 |    77.78 |      80 |   85.71 | 45-56             
  error.js               |   81.82 |    75.00 |     100 |   81.82 | 28-35             
--------------------------|---------|----------|---------|---------|-------------------
```

## Best Practices

1. **Test Organization**
   - Group related tests
   - Use descriptive test names
   - Maintain test independence

2. **Test Data Management**
   - Use fixtures
   - Clean up after tests
   - Use test databases

3. **Mocking**
   - External services
   - Time-dependent operations
   - File system operations

4. **Error Cases**
   - Test edge cases
   - Validate error responses
   - Check error handling 