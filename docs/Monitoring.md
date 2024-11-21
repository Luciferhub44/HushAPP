# Monitoring and Analytics Documentation

## Application Monitoring

### Health Checks
```javascript
// Add to server.js
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now()
  };
  try {
    res.send(healthcheck);
  } catch (e) {
    healthcheck.message = e;
    res.status(503).send();
  }
});
```

### Performance Metrics

#### Response Time Monitoring
```javascript
const responseTime = require('response-time');

app.use(responseTime((req, res, time) => {
  logger.info({
    method: req.method,
    url: req.url,
    responseTime: time
  });
}));
```

#### Memory Usage
```javascript
const getMemoryUsage = () => {
  const used = process.memoryUsage();
  return {
    rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
    external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`
  };
};
```

## Error Tracking

### Error Logging
```javascript
// Error types to track
const errorTypes = {
  VALIDATION_ERROR: 'ValidationError',
  AUTHENTICATION_ERROR: 'AuthenticationError',
  AUTHORIZATION_ERROR: 'AuthorizationError',
  NOT_FOUND: 'NotFoundError',
  RATE_LIMIT: 'RateLimitError',
  INTERNAL_SERVER: 'InternalServerError'
};

// Error logging format
const logError = (error, req) => {
  logger.error({
    type: error.name,
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date(),
    user: req.user ? req.user.id : 'anonymous'
  });
};
```

## Database Monitoring

### Connection Monitoring
```javascript
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});
```

### Query Performance
```javascript
// Add to mongoose schema
schema.pre('find', function() {
  this._startTime = Date.now();
});

schema.post('find', function() {
  if (this._startTime != null) {
    const duration = Date.now() - this._startTime;
    logger.info(`Query took ${duration}ms`);
  }
});
```

## Real-time Monitoring

### WebSocket Connections
```javascript
// Track active connections
const activeConnections = new Set();

io.on('connection', (socket) => {
  activeConnections.add(socket.id);
  
  socket.on('disconnect', () => {
    activeConnections.delete(socket.id);
  });
});

// Monitor connection count
setInterval(() => {
  logger.info(`Active WebSocket connections: ${activeConnections.size}`);
}, 60000);
```

### User Activity Tracking
```javascript
const trackUserActivity = (userId, action) => {
  logger.info({
    userId,
    action,
    timestamp: new Date(),
    // Add any relevant metadata
  });
};
```

## Business Analytics

### User Analytics
```javascript
const userAnalytics = {
  async getUserGrowth(startDate, endDate) {
    return await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      }
    ]);
  },
  
  async getActiveUsers() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return await User.countDocuments({
      lastActivity: { $gte: thirtyDaysAgo }
    });
  }
};
```

### Booking Analytics
```javascript
const bookingAnalytics = {
  async getBookingStats() {
    return await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          averagePrice: { $avg: "$price" }
        }
      }
    ]);
  },
  
  async getArtisanPerformance() {
    return await Booking.aggregate([
      {
        $group: {
          _id: "$artisan",
          completedBookings: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
            }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$price", 0] }
          },
          averageRating: { $avg: "$rating" }
        }
      }
    ]);
  }
};
```

### Payment Analytics
```javascript
const paymentAnalytics = {
  async getRevenueStats(startDate, endDate) {
    return await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalRevenue: { $sum: "$amount" },
          transactionCount: { $sum: 1 }
        }
      }
    ]);
  },
  
  async getRefundStats() {
    return await Payment.aggregate([
      {
        $match: { 'refund.status': 'approved' }
      },
      {
        $group: {
          _id: null,
          totalRefunds: { $sum: "$refund.amount" },
          refundCount: { $sum: 1 }
        }
      }
    ]);
  }
};
```

## Performance Optimization

### Caching Metrics
```javascript
const cacheMetrics = {
  hits: 0,
  misses: 0,
  
  recordHit() {
    this.hits++;
  },
  
  recordMiss() {
    this.misses++;
  },
  
  getHitRate() {
    const total = this.hits + this.misses;
    return total ? (this.hits / total) * 100 : 0;
  }
};
```

### Rate Limiting Metrics
```javascript
const rateLimitMetrics = {
  blocked: 0,
  allowed: 0,
  
  recordBlocked() {
    this.blocked++;
  },
  
  recordAllowed() {
    this.allowed++;
  },
  
  getBlockRate() {
    const total = this.blocked + this.allowed;
    return total ? (this.blocked / total) * 100 : 0;
  }
};
```

## Alerting System

### Alert Configuration
```javascript
const alertConfig = {
  errorThreshold: 10, // Errors per minute
  responseTimeThreshold: 1000, // ms
  memoryThreshold: 80, // percentage
  diskSpaceThreshold: 90 // percentage
};

const sendAlert = (type, message) => {
  // Implement alert notification (email, SMS, etc.)
  logger.error({
    type,
    message,
    timestamp: new Date()
  });
};
```

### Monitoring Intervals
```javascript
// Check system health every minute
setInterval(async () => {
  const metrics = {
    memory: getMemoryUsage(),
    activeConnections: activeConnections.size,
    errorRate: errorMetrics.getErrorRate(),
    cacheHitRate: cacheMetrics.getHitRate()
  };

  // Check thresholds and send alerts
  if (metrics.errorRate > alertConfig.errorThreshold) {
    sendAlert('HIGH_ERROR_RATE', `Error rate: ${metrics.errorRate}%`);
  }

  // Log metrics
  logger.info('System metrics:', metrics);
}, 60000);
``` 