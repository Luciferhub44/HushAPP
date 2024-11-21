# WebSocket Events Documentation

## Connection Setup
Connect to WebSocket server with authentication:
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

## Client Events (Emit)

### Chat Events
1. **Send Message**
```javascript
socket.emit('sendMessage', {
  chatId: 'string',
  content: 'string',
  attachments: [File] // Optional
});
```

2. **Typing Status**
```javascript
socket.emit('typing', {
  chatId: 'string',
  isTyping: boolean
});
```

3. **Message Delivery**
```javascript
socket.emit('messageDelivered', {
  chatId: 'string',
  messageId: 'string'
});
```

4. **Message Read**
```javascript
socket.emit('messageRead', {
  chatId: 'string',
  messageId: 'string'
});
```

### Booking Events
1. **Booking Update**
```javascript
socket.emit('bookingUpdate', {
  bookingId: 'string',
  status: 'accepted|rejected|completed|cancelled'
});
```

## Server Events (Listen)

### Chat Events
1. **New Message**
```javascript
socket.on('newMessage', (data) => {
  // data: {
  //   chatId: string,
  //   message: {
  //     content: string,
  //     sender: string,
  //     attachments: Array,
  //     createdAt: Date
  //   }
  // }
});
```

2. **User Typing**
```javascript
socket.on('userTyping', (data) => {
  // data: {
  //   chatId: string,
  //   userId: string,
  //   isTyping: boolean
  // }
});
```

3. **Message Status**
```javascript
socket.on('messageStatus', (data) => {
  // data: {
  //   chatId: string,
  //   messageId: string,
  //   status: 'delivered'|'read',
  //   deliveredTo?: Array,
  //   readBy?: Array
  // }
});
```

### User Status Events
1. **User Online**
```javascript
socket.on('userOnline', (userId) => {
  // userId: string
});
```

2. **User Offline**
```javascript
socket.on('userOffline', (userId) => {
  // userId: string
});
```

### Notification Events
1. **New Notification**
```javascript
socket.on('notification', (data) => {
  // data: {
  //   type: 'message'|'booking'|'payment',
  //   message: string
  // }
});
```

### Payment Events
1. **Payment Received**
```javascript
socket.on('paymentReceived', (data) => {
  // data: {
  //   bookingId: string,
  //   amount: number
  // }
});
```

2. **Refund Requested**
```javascript
socket.on('refundRequested', (data) => {
  // data: {
  //   paymentId: string,
  //   amount: number,
  //   reason: string
  // }
});
```

## Error Handling
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

## Connection Status
```javascript
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

## Best Practices
1. Always handle connection errors
2. Implement reconnection logic
3. Validate data before emitting
4. Handle all possible event responses
5. Implement proper error handling
6. Use appropriate event naming conventions 