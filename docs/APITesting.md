# API Testing Guide

## Postman Collection Setup

### Environment Variables
Create a Postman environment with these variables:
```json
{
  "BASE_URL": "http://localhost:5000/api",
  "TOKEN": "",
  "ARTISAN_TOKEN": ""
}
```

## Authentication Tests

### Register User
```http
POST {{BASE_URL}}/users/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test123!",
  "confirmPassword": "Test123!",
  "userType": "user",
  "phoneNumber": "1234567890"
}
```

### Register Artisan
```http
POST {{BASE_URL}}/users/register
Content-Type: application/json

{
  "username": "testartisan",
  "email": "artisan@example.com",
  "password": "Test123!",
  "confirmPassword": "Test123!",
  "userType": "artisan",
  "phoneNumber": "1234567890",
  "artisanProfile": {
    "businessName": "Test Services",
    "specialty": ["Plumbing", "Electrical"],
    "experience": 5,
    "bio": "Professional artisan with 5 years experience",
    "location": {
      "coordinates": [3.3792, 6.5244],
      "address": "123 Test Street",
      "city": "Test City",
      "state": "Test State"
    }
  }
}
```

### Login Tests
```http
# User Login
POST {{BASE_URL}}/users/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!",
  "userType": "user"
}

# Artisan Login
POST {{BASE_URL}}/users/login
Content-Type: application/json

{
  "email": "artisan@example.com",
  "password": "Test123!",
  "userType": "artisan"
}
```

## Booking Flow Tests

### Create Booking
```http
POST {{BASE_URL}}/bookings
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "artisan": "{{ARTISAN_ID}}",
  "service": "Plumbing",
  "description": "Fix leaky faucet",
  "location": {
    "coordinates": [3.3792, 6.5244],
    "address": "123 Test Street"
  },
  "scheduledDate": "2024-04-01T10:00:00.000Z"
}
```

### Update Booking Status
```http
PATCH {{BASE_URL}}/bookings/{{BOOKING_ID}}/status
Authorization: Bearer {{ARTISAN_TOKEN}}
Content-Type: application/json

{
  "status": "accepted"
}
```

## Chat Tests

### Create Chat
```http
POST {{BASE_URL}}/chats/booking/{{BOOKING_ID}}
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "message": "Hello, I need help with my booking"
}
```

### Send Message with File
```http
POST {{BASE_URL}}/chats/{{CHAT_ID}}/upload
Authorization: Bearer {{TOKEN}}
Content-Type: multipart/form-data

file: [Select File]
message: "Here's a photo of the issue"
```

## Payment Tests

### Create Payment Intent
```http
POST {{BASE_URL}}/payments/create-payment-intent
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "bookingId": "{{BOOKING_ID}}"
}
```

### Request Refund
```http
POST {{BASE_URL}}/payments/{{PAYMENT_ID}}/refund
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "reason": "Service not completed"
}
```

## Test Scenarios

### User Flow
1. Register user
2. Login user
3. Search for artisan
4. Create booking
5. Start chat
6. Make payment
7. Add review

### Artisan Flow
1. Register artisan
2. Login artisan
3. Update availability
4. Accept booking
5. Complete service
6. Receive payment

### Error Cases
1. Invalid credentials
2. Unauthorized access
3. Invalid booking status updates
4. Payment failures
5. File upload errors

## WebSocket Testing

### Connection Test
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_token' }
});

socket.on('connect', () => {
  console.log('Connected successfully');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
});
```

### Chat Events Test
```javascript
// Send message
socket.emit('sendMessage', {
  chatId: 'chat_id',
  content: 'Test message'
});

// Listen for new messages
socket.on('newMessage', (data) => {
  console.log('New message received:', data);
});

// Test typing indicator
socket.emit('typing', {
  chatId: 'chat_id',
  isTyping: true
});
```

## Performance Testing

### Artillery Script
```yaml
config:
  target: "http://localhost:5000"
  phases:
    - duration: 60
      arrivalRate: 20
  defaults:
    headers:
      Authorization: "Bearer {{token}}"
scenarios:
  - name: "Search and Book"
    flow:
      - get:
          url: "/api/users/artisans/nearby"
          qs:
            longitude: 3.3792
            latitude: 6.5244
      - post:
          url: "/api/bookings"
          json:
            artisan: "{{artisanId}}"
            service: "Plumbing"
            description: "Test booking"
            location:
              coordinates: [3.3792, 6.5244]
              address: "Test address"
            scheduledDate: "2024-04-01T10:00:00.000Z"
```

## Test Data Management

### Test Database Setup
```javascript
// In your test setup file
beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
```

### Test Data Fixtures
```javascript
// users.fixture.js
module.exports = {
  testUser: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123!',
    userType: 'user',
    phoneNumber: '1234567890'
  },
  testArtisan: {
    username: 'testartisan',
    email: 'artisan@example.com',
    password: 'Test123!',
    userType: 'artisan',
    phoneNumber: '0987654321',
    artisanProfile: {
      businessName: 'Test Services',
      specialty: ['Plumbing'],
      experience: 5
    }
  }
};
```

## Continuous Integration Tests
```yaml
name: API Tests
on: [push, pull_request]
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
      - name: Upload coverage
        uses: actions/upload-artifact@v2
        with:
          name: coverage
          path: coverage/
``` 