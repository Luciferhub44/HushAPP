# Hush App API Documentation

## Base URL 
Development: http://localhost:5000/api
Production: https://hush-app-api.onrender.com/api

## Authentication
- **Login:** POST /api/auth/login
- **Register:** POST /api/auth/register
- **Logout:** POST /api/auth/logout
- **Refresh Token:** POST /api/auth/refresh-token   

## Users
- **Get User:** GET /api/users/:id
- **Update User:** PUT /api/users/:id
- **Delete User:** DELETE /api/users/:id
- **Get All Users:** GET /api/users

## Chat
- **Get Chat:** GET /api/chat/:id
- **Create Chat:** POST /api/chat
- **Get Chats:** GET /api/chats
- **Delete Chat:** DELETE /api/chat/:id

## Socket.io
- **Socket Connection:** GET /socket.io/socket.io.js

## Error Handling
- **400 Bad Request:** The request was invalid or cannot be served.
- **401 Unauthorized:** The request requires authentication.
- **403 Forbidden:** The server understood the request but refuses to authorize it.
- **404 Not Found:** The requested resource could not be found.
- **500 Internal Server Error:** The server encountered an error.



## API Endpoints

### 1. User Management

#### Register User
- **URL:** `/api/auth/register`
- **Method:** `POST`
- **Description:** Register a new user.
- **Request Body:**
  - `username` (string, required): The username of the user.
  - `email` (string, required): The email address of the user.
  - `password` (string, required): The password for the user.

#### Example Request
http
POST /users/register
Content-Type: application/json
{
"username": "string",
"email": "string",
"password": "string",
"userType": "client|artisan",
"phoneNumber": "string"
}
Response: 201 Created
{
"status": "success",
"data": {
"user": {
"id": "string",
"username": "string",
"email": "string",
"userType": "string"
},
"token": "string"
}
}


#### Login User
- **URL:** `/api/auth/login`
- **Method:** `POST`
- **Description:** Login a user.

#### Example Request
http
POST /users/login
Content-Type: application/json
{
"email": "string",
"password": "string"
}
Response: 200 OK
{
"status": "success",
"data": {
"token": "string",
"user": {
"id": "string",
"username": "string",
"email": "string"
}
}
}

#### Logout User
- **URL:** `/api/auth/logout`
- **Method:** `POST`
- **Description:** Logout a user.


#### Create Booking
- **URL:** `/api/bookings`
- **Method:** `POST`
- **Description:** Create a new booking.

#### Example Request
   http
POST /bookings
Authorization: Bearer <token>
Content-Type: application/json
{
"artisan": "string (artisan_id)",
"service": "string",
"description": "string",
"location": {
"coordinates": [number, number],
"address": "string"
},
"scheduledDate": "date-time"
}
Response: 201 Created
{
"status": "success",
"data": {
"booking": {
"id": "string",
"status": "pending",
// ... other booking details
}
}
}

#### Get All Bookings
- **URL:** `/api/bookings`
- **Method:** `GET`
- **Description:** Get all bookings.

#### Get Booking by ID
- **URL:** `/api/bookings/:id`
- **Method:** `GET`
- **Description:** Get a booking by ID.

#### Update Booking Status
- **URL:** `/api/bookings/:id`
- **Method:** `PUT`
- **Description:** Update the status of a booking.

#### Delete Booking
- **URL:** `/api/bookings/:id`
- **Method:** `DELETE`
- **Description:** Delete a booking by ID.

#### Example Response

http
GET /bookings
Authorization: Bearer <token>
Response: 200 OK
{
"status": "success",
"data": {
"bookings": [
{
"id": "string",
"status": "string",
// ... booking details
}
]
}
}

### 2. Chat System
#### Initiate Chat
- **URL:** `/api/chat`
- **Method:** `POST`
- **Description:** Initiate a new chat.

http
POST /chats
Authorization: Bearer <token>
Content-Type: application/json
{
"recipient": "string (user_id)",
"initialMessage": "string"
}
Response: 201 Created
{
"status": "success",
"data": {
"chat": {
"id": "string",
"participants": ["user_ids"],
"messages": [
{
"sender": "user_id",
"content": "string",
"timestamp": "date-time"
}
]
}
}
}

#### Get Chat by ID
- **URL:** `/api/chat/:id`
- **Method:** `GET`
- **Description:** Get a chat by ID.

#### Delete Chat
- **URL:** `/api/chat/:id`
- **Method:** `DELETE`
- **Description:** Delete a chat by ID.



#### Create Payment Intent
http
POST /payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json
{
"amount": number,
"currency": "string",
"bookingId": "string"
}
Response: 200 OK
{
"status": "success",
"data": {
"clientSecret": "string",
"paymentIntentId": "string"
}
}

#### Create Dispute
http
POST /disputes
Authorization: Bearer <token>
Content-Type: application/json
{
"order": "string (order_id)",
"type": "quality|delivery|payment|communication|other",
"description": "string",
"evidence": [
{
"type": "image|document|text",
"url": "string",
"description": "string"
}
]
}
Response: 201 Created
{
"status": "success",
"data": {
"dispute": {
"id": "string",
"status": "open",
// ... other dispute details
}
}
}

#### connect to socket.io
http
GET /socket.io/socket.io.js
Response: 200 OK

javascript
// Connect to WebSocket
socket.connect()
// Authenticate
socket.emit('authenticate', userId)
// Join chat room
socket.emit('join_room', roomId)
