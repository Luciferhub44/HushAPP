# Hush App API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## User Routes

### Register User/Artisan
- **URL**: `/users/register`
- **Method**: `POST`
- **Access**: Public
- **Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string",
  "userType": "user|artisan",
  "phoneNumber": "string",
  "artisanProfile": {  // Required if userType is artisan
    "businessName": "string",
    "specialty": ["Plumbing", "Electrical", etc],
    "experience": number,
    "bio": "string",
    "location": {
      "coordinates": [longitude, latitude],
      "address": "string",
      "city": "string",
      "state": "string"
    }
  }
}
```

### Login
- **URL**: `/users/login`
- **Method**: `POST`
- **Access**: Public
- **Body**:
```json
{
  "email": "string",
  "password": "string",
  "userType": "user|artisan"
}
```

## Artisan Routes

### Get All Artisans
- **URL**: `/users/artisans`
- **Method**: `GET`
- **Access**: Public

### Get Nearby Artisans
- **URL**: `/users/artisans/nearby`
- **Method**: `GET`
- **Access**: Public
- **Query Parameters**:
  - `longitude`: number
  - `latitude`: number
  - `maxDistance`: number (in meters, default: 10000)

## Booking Routes

### Create Booking
- **URL**: `/bookings`
- **Method**: `POST`
- **Access**: Private
- **Body**:
```json
{
  "artisan": "artisan_id",
  "service": "string",
  "description": "string",
  "location": {
    "coordinates": [longitude, latitude],
    "address": "string"
  },
  "scheduledDate": "date"
}
```

### Get User Bookings
- **URL**: `/bookings/my-bookings`
- **Method**: `GET`
- **Access**: Private

### Update Booking Status (Artisan Only)
- **URL**: `/bookings/:id/status`
- **Method**: `PATCH`
- **Access**: Private/Artisan
- **Body**:
```json
{
  "status": "accepted|rejected|completed|cancelled"
}
```

## Chat Routes

### Get User Chats
- **URL**: `/chats`
- **Method**: `GET`
- **Access**: Private

### Get Chat Messages
- **URL**: `/chats/:chatId/messages`
- **Method**: `GET`
- **Access**: Private

### Send Message
- **URL**: `/chats/:chatId/messages`
- **Method**: `POST`
- **Access**: Private
- **Body**:
```json
{
  "content": "string",
  "attachments": [File] // Optional
}
```

## Payment Routes

### Create Payment Intent
- **URL**: `/payments/create-payment-intent`
- **Method**: `POST`
- **Access**: Private
- **Body**:
```json
{
  "bookingId": "string"
}
```

### Get Payment History
- **URL**: `/payments/history`
- **Method**: `GET`
- **Access**: Private

### Request Refund
- **URL**: `/payments/:id/refund`
- **Method**: `POST`
- **Access**: Private
- **Body**:
```json
{
  "reason": "string"
}
```

## Notification Routes

### Get User Notifications
- **URL**: `/notifications`
- **Method**: `GET`
- **Access**: Private

### Mark Notifications as Read
- **URL**: `/notifications/read`
- **Method**: `PATCH`
- **Access**: Private

## Error Responses
All error responses follow this format:
```json
{
  "status": "error",
  "message": "Error description"
}
```

## Success Responses
All success responses follow this format:
```json
{
  "status": "success",
  "data": {
    // Response data
  }
}
```
