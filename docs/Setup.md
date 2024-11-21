# Hush App Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- MongoDB Account
- Cloudinary Account
- Stripe Account
- Git

## Installation Steps

### 1. Clone and Install Dependencies
```bash
# Clone the repository
git clone <repository_url>

# Navigate to project directory
cd hush-app-backend

# Install dependencies
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Message Encryption
MESSAGE_ENCRYPTION_KEY=your_encryption_key
```

### 3. Database Setup
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Replace MONGODB_URI in .env with your connection string

### 4. Cloudinary Setup
1. Create a Cloudinary account
2. Get your cloud name, API key, and secret
3. Update the corresponding variables in .env

### 5. Stripe Setup
1. Create a Stripe account
2. Get your API keys from the dashboard
3. Update the Stripe variables in .env
4. Set up webhooks in Stripe dashboard pointing to your /api/payments/webhook endpoint

### 6. Running the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

## Project Structure
```
hush-app-backend/
├── config/
│   ├── cloudinary.js     # Cloudinary configuration
│   ├── database.js       # Database connection
│   └── stripe.js         # Stripe configuration
├── middleware/
│   ├── auth.js           # Authentication middleware
│   ├── error.js          # Error handling
│   ├── multer.js         # File upload handling
│   ├── validate.js       # Request validation
│   ├── rateLimiter.js    # Rate limiting
│   └── security.js       # Security middleware
├── models/
│   ├── User.js           # User model
│   ├── Booking.js        # Booking model
│   ├── Chat.js           # Chat model
│   ├── Payment.js        # Payment model
│   ├── Payout.js         # Payout model
│   └── Notification.js   # Notification model
├── routes/
│   ├── users.js          # User routes
│   ├── artisans.js       # Artisan routes
│   ├── bookings.js       # Booking routes
│   ├── chats.js          # Chat routes
│   ├── payments.js       # Payment routes
│   └── notifications.js  # Notification routes
├── utils/
│   ├── encryption.js     # Message encryption
│   └── filePreview.js    # File preview generation
├── docs/                 # Documentation
├── .env                  # Environment variables
└── server.js            # Application entry point
```

## API Testing
Use the provided Postman collection in `/docs/postman` for API testing.

## WebSocket Testing
Use the WebSocket client in `/docs/websocket.html` for testing real-time features.

## Security Considerations
1. Keep your .env file secure and never commit it
2. Regularly update dependencies
3. Use strong JWT secrets
4. Enable CORS only for trusted domains
5. Monitor rate limiting and adjust as needed

## Deployment
1. Set NODE_ENV to 'production'
2. Update CORS_ORIGIN to your frontend domain
3. Enable SSL/TLS
4. Set up proper monitoring
5. Configure proper logging

## Troubleshooting
Common issues and solutions:

1. MongoDB Connection Issues:
   - Check MongoDB URI
   - Verify IP whitelist
   - Check network connectivity

2. File Upload Issues:
   - Verify Cloudinary credentials
   - Check file size limits
   - Verify supported file types

3. Payment Issues:
   - Verify Stripe keys
   - Check webhook configuration
   - Monitor Stripe dashboard for errors

## Support
For additional support:
1. Check the documentation in /docs
2. Submit issues on GitHub
3. Contact the development team
