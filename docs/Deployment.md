# Deployment Guide

## Prerequisites
- Node.js v16 or higher
- MongoDB Atlas account
- Cloudinary account
- Stripe account
- Domain name (for production)
- SSL certificate
- PM2 or similar process manager

## Production Environment Setup

### 1. Server Requirements
- **Minimum Specifications**:
  - 2 CPU cores
  - 4GB RAM
  - 20GB SSD
  - Ubuntu 20.04 LTS or higher

### 2. Server Security
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y ufw fail2ban

# Configure firewall
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 3. Node.js Installation
```bash
# Install Node.js using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 16
nvm use 16
```

### 4. Application Deployment

#### Clone and Setup
```bash
# Clone repository
git clone <repository_url>
cd hush-app-backend

# Install dependencies
npm install --production

# Create production env file
cp .env.example .env.production
```

#### Environment Configuration
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_strong_jwt_secret
CORS_ORIGIN=https://your-frontend-domain.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=your_live_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### 5. Process Management with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name hush-app

# Enable startup script
pm2 startup

# Save current process list
pm2 save
```

### 6. Nginx Configuration
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 7. SSL Configuration with Certbot
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

## Monitoring and Maintenance

### 1. Logging Setup
```javascript
// Configure Winston for logging
const winston = require('winston');
require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});
```

### 2. Monitoring Setup
```bash
# Install monitoring tools
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monitor application
pm2 monit
```

### 3. Backup Strategy
```bash
# MongoDB backup script
#!/bin/bash
MONGO_DATABASE="hush-app"
APP_NAME="hush-app"
MONGO_HOST="your-mongodb-host"
MONGO_USER="your-username"
MONGO_PASSWORD="your-password"
BACKUP_PATH="/path/to/backups"

# Backup database
mongodump --uri="mongodb+srv://$MONGO_USER:$MONGO_PASSWORD@$MONGO_HOST/$MONGO_DATABASE" --out="$BACKUP_PATH/$(date +%Y%m%d)"

# Remove backups older than 7 days
find $BACKUP_PATH/* -mtime +7 -exec rm -rf {} \;
```

## Scaling Considerations

### 1. Horizontal Scaling
```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Workers share TCP connection
  require('./server');
}
```

### 2. Caching Strategy
```javascript
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache middleware
const cache = (duration) => {
  return async (req, res, next) => {
    const key = `__express__${req.originalUrl}`;
    const cachedResponse = await client.get(key);

    if (cachedResponse) {
      res.json(JSON.parse(cachedResponse));
      return;
    }

    res.originalJson = res.json;
    res.json = (body) => {
      client.setEx(key, duration, JSON.stringify(body));
      res.originalJson(body);
    };
    next();
  };
};
```

## Troubleshooting

### Common Issues and Solutions

1. **Connection Issues**
```bash
# Check application status
pm2 status
pm2 logs hush-app

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# Check firewall
sudo ufw status
```

2. **Memory Issues**
```bash
# Monitor memory usage
free -m
top

# Adjust Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" pm2 start server.js
```

3. **Database Issues**
```bash
# Monitor MongoDB connections
mongo admin --eval "db.currentOp()"

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

## Security Checklist

- [ ] SSL/TLS enabled
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Security headers implemented
- [ ] MongoDB authentication enabled
- [ ] Regular security updates
- [ ] Firewall rules configured
- [ ] File upload limits set
- [ ] Error logging enabled
- [ ] Backup system in place