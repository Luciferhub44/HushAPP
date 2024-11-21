# Database Schema Documentation

## User Schema
Handles both regular users and artisans with role-based differentiation.

### Base Fields
```javascript
{
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false  // Not included in queries by default
  },
  userType: {
    type: String,
    enum: ['user', 'artisan'],
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'artisan'],
    default: 'user'
  },
  phoneNumber: String,
  avatar: {
    url: String,
    public_id: String
  }
}
```

### Artisan Profile (Additional Fields)
```javascript
{
  artisanProfile: {
    businessName: String,
    specialty: [String],  // Array of services
    experience: Number,   // Years of experience
    bio: String,
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],  // [longitude, latitude]
      address: String,
      city: String,
      state: String
    },
    rating: Number,
    numReviews: Number,
    availability: Boolean,
    certifications: [{
      name: String,
      issuer: String,
      year: Number,
      document: {
        url: String,
        public_id: String
      }
    }],
    verified: Boolean
  }
}
```

## Booking Schema
Manages service bookings between users and artisans.

```javascript
{
  user: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  artisan: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: String,
    required: true
  },
  description: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number],
    address: String
  },
  scheduledDate: Date,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  price: Number,
  paid: {
    type: Boolean,
    default: false
  },
  rating: Number,
  review: String
}
```

## Chat Schema
Handles messaging between users and artisans.

### Message Sub-Schema
```javascript
{
  sender: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  content: String,
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  attachments: [{
    type: String,
    url: String,
    public_id: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  encrypted: Boolean,
  encryptedContent: String,
  reactions: [{
    user: ObjectId,
    emoji: String,
    createdAt: Date
  }],
  edited: Boolean,
  editHistory: [{
    content: String,
    editedAt: Date
  }]
}
```

### Main Chat Schema
```javascript
{
  booking: {
    type: ObjectId,
    ref: 'Booking',
    required: true
  },
  user: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  artisan: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  messages: [MessageSchema],
  lastMessage: Date
}
```

## Payment Schema
Handles payment transactions and disputes.

```javascript
{
  booking: {
    type: ObjectId,
    ref: 'Booking',
    required: true
  },
  user: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  artisan: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  amount: Number,
  currency: {
    type: String,
    default: 'usd'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  stripePaymentId: String,
  stripeCustomerId: String,
  refund: {
    amount: Number,
    reason: String,
    status: String,
    processedAt: Date
  },
  dispute: {
    reason: String,
    status: String,
    evidence: {
      explanation: String,
      documents: [String]
    },
    resolvedAt: Date
  }
}
```

## Notification Schema
Handles system notifications.

```javascript
{
  recipient: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  title: String,
  message: String,
  type: {
    type: String,
    enum: ['booking', 'message', 'payment', 'system']
  },
  read: {
    type: Boolean,
    default: false
  },
  relatedId: ObjectId,
  onModel: {
    type: String,
    enum: ['Booking', 'Chat', 'Payment']
  }
}
```

## Indexes
Important indexes for performance optimization:

```javascript
// User Indexes
{ 'artisanProfile.location': '2dsphere' }
{ email: 1, username: 1 }

// Booking Indexes
{ user: 1, status: 1 }
{ artisan: 1, status: 1 }
{ location: '2dsphere' }

// Chat Indexes
{ booking: 1 }
{ user: 1, artisan: 1 }
{ lastMessage: -1 }

// Payment Indexes
{ booking: 1, status: 1 }
{ user: 1, artisan: 1 }

// Notification Indexes
{ recipient: 1, read: 1 }
{ createdAt: -1 }
``` 