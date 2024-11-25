# Hush App API Documentation

## Base URL 
- Development: `http://localhost:5000/api`
- Production: `https://hush-app-api.onrender.com/api`

## Authentication
All protected routes require a Bearer token:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 1. Authentication Endpoints

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "userType": "client",
    "phoneNumber": "+1234567890",
    "location": {
      "coordinates": [40.7128, -74.0060],
      "address": "123 Main St",
      "city": "New York",
      "state": "NY"
    }
  }'
```

Response:
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "65f4a3b2c1d0a2e3f4g5h6i7",
            "username": "john_doe",
            "email": "john@example.com",
            "userType": "client",
            "createdAt": "2024-03-15T10:30:00Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

Response:
```json
{
    "status": "success",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "id": "65f4a3b2c1d0a2e3f4g5h6i7",
            "username": "john_doe",
            "email": "john@example.com"
        }
    }
}
```

## 2. User Management

### Get User Profile
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Response:
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "65f4a3b2c1d0a2e3f4g5h6i7",
            "username": "john_doe",
            "email": "john@example.com",
            "userType": "client",
            "phoneNumber": "+1234567890",
            "location": {
                "coordinates": [40.7128, -74.0060],
                "address": "123 Main St",
                "city": "New York",
                "state": "NY"
            }
        }
    }
}
```

### Update Profile
```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe_updated",
    "phoneNumber": "+1987654321",
    "location": {
        "coordinates": [40.7128, -74.0060],
        "address": "456 New St",
        "city": "New York",
        "state": "NY"
    }
  }'
```

## 3. Bookings

### Create Booking
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "artisan": "65f4a3b2c1d0a2e3f4g5h6i8",
    "service": "Plumbing",
    "description": "Fix leaking kitchen sink",
    "location": {
        "coordinates": [40.7128, -74.0060],
        "address": "123 Main St"
    },
    "scheduledDate": "2024-03-20T14:00:00Z"
  }'
```

### Get User Bookings
```bash
curl -X GET "http://localhost:5000/api/bookings?status=pending&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 4. Chat System

### Initialize Chat
```bash
curl -X POST http://localhost:5000/api/chats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "65f4a3b2c1d0a2e3f4g5h6i8",
    "initialMessage": "Hi, I'\''m interested in your plumbing services"
  }'
```

### WebSocket Connection
```javascript
const socket = io('http://localhost:5000', {
    auth: { token: 'YOUR_TOKEN_HERE' }
});

// Authentication
socket.emit('authenticate', userId);

// Join chat room
socket.emit('join_room', chatId);

// Send message
socket.emit('sendMessage', {
    chatId: '65f4a3b2c1d0a2e3f4g5h6i10',
    content: 'Hello!',
    attachments: []
});
```

## 5. Error Responses

### Validation Error (400)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email"
  }'
```

Response:
```json
{
    "status": "error",
    "message": "Validation failed",
    "errors": [
        {
            "field": "email",
            "message": "Please provide a valid email address"
        }
    ]
}
```

### Authentication Error (401)
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer INVALID_TOKEN"
```

Response:
```json
{
    "status": "error",
    "message": "Invalid authentication token"
}
```

## Rate Limiting
Headers included in response:
```bash
curl -I http://localhost:5000/api/health
```

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1615766400
```

## Environment Setup
Required variables in `.env`:
```bash
# Application
NODE_ENV=development
PORT=6969
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
CORS_ORIGIN=https://hushapp.onrender.com
JWT_SECRET=your_jwt_secret_here

# Socket Configuration
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
```

## Testing with cURL
Test the API health:
```bash
curl http://localhost:5000/api/health
```

Login and store token:
```bash
token=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"securePassword123"}' \
  | jq -r '.data.token')

# Use token in subsequent requests
curl -H "Authorization: Bearer $token" http://localhost:5000/api/users/profile
```
