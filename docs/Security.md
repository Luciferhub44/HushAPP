# Security Documentation

## Authentication & Authorization

### JWT Implementation
- Tokens are signed using HS256 algorithm
- Token expiration: 30 days
- Payload structure:
```json
{
  "id": "user_id",
  "userType": "user|artisan",
  "iat": timestamp,
  "exp": timestamp
}
```

### Password Security
- Passwords are hashed using bcrypt (12 rounds)
- Password requirements:
  - Minimum 6 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

### Role-Based Access Control (RBAC)
- User roles: `user`, `artisan`, `admin`
- Role-specific middleware: `restrictTo()`
- Protected routes require authentication

## API Security Measures

### Rate Limiting
```javascript
- Window: 1 hour
- Max requests: 100 per IP
- Custom error response for limit exceeded
```

### Headers Security (Helmet)
- XSS Protection
- No Sniff
- Hide Powered By
- DNS Prefetch Control
- Frame Guard
- Secure Policy
- Content Security Policy

### Data Sanitization
- NoSQL query injection protection
- XSS protection
- Parameter pollution prevention
- Input validation using Joi

### CORS Configuration
```javascript
{
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}
```

## File Upload Security

### Cloudinary Configuration
- Secure file upload
- File type validation
- Size limits: 5MB
- Allowed formats:
  - Images: jpg, jpeg, png
  - Documents: pdf, doc, docx
  - Audio: mp3, wav

### File Validation
```javascript
- MIME type checking
- File size restrictions
- File name sanitization
- Virus scanning (recommended for production)
```

## Message Security

### Encryption
- Messages encrypted using AES
- Encrypted content stored separately
- Decryption only on authorized access
- Message expiration support

### WebSocket Security
- Authentication required for connection
- Secure room management
- Event validation
- Connection monitoring

## Database Security

### MongoDB Security
- Input sanitization
- Query injection protection
- Secure connection string
- Index optimization

### Data Access
- Field level encryption for sensitive data
- Selective field exposure
- Mongoose middleware for data filtering

## Error Handling

### Production vs Development
```javascript
// Development
{
  status: 'error',
  error: err,
  message: err.message,
  stack: err.stack
}

// Production
{
  status: 'error',
  message: 'Something went wrong'
}
```

## Security Best Practices

### Environment Variables
- Secure storage of sensitive data
- Different configs for dev/prod
- Regular key rotation
- Environment validation

### Logging
- Error logging
- Access logging
- Security event logging
- PII data masking

### Session Management
- Secure cookie settings
- CSRF protection
- Session timeout
- Concurrent session handling

## Security Recommendations

### Additional Measures
1. Implement request signing
2. Add API key management
3. Set up security monitoring
4. Regular security audits
5. Automated vulnerability scanning

### Production Deployment
1. Use SSL/TLS
2. Enable firewall rules
3. Regular backups
4. DDoS protection
5. Security headers configuration

### Monitoring
1. Rate limit monitoring
2. Failed login attempts
3. Suspicious activity detection
4. Resource usage tracking
5. Error rate monitoring 