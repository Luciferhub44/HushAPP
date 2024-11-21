/**
 * Socket.IO Events Documentation
 * 
 * Client -> Server Events:
 * ----------------------
 * 1. 'sendMessage'
 *    Description: Send a new message in a chat
 *    Payload: { chatId: string, content: string }
 * 
 * 2. 'typing'
 *    Description: Indicate user is typing
 *    Payload: { chatId: string, isTyping: boolean }
 * 
 * 3. 'messageDelivered'
 *    Description: Confirm message delivery
 *    Payload: { chatId: string, messageId: string }
 * 
 * 4. 'messageRead'
 *    Description: Mark message as read
 *    Payload: { chatId: string, messageId: string }
 * 
 * 5. 'checkOnline'
 *    Description: Check if a user is online
 *    Payload: userId: string
 * 
 * Server -> Client Events:
 * ----------------------
 * 1. 'newMessage'
 *    Description: New message received
 *    Payload: { chatId: string, message: Object }
 * 
 * 2. 'userTyping'
 *    Description: User typing status
 *    Payload: { chatId: string, userId: string, isTyping: boolean }
 * 
 * 3. 'messageStatus'
 *    Description: Message delivery/read status update
 *    Payload: { chatId: string, messageId: string, status: 'delivered' | 'read' }
 * 
 * 4. 'userOnline'
 *    Description: User came online
 *    Payload: userId: string
 * 
 * 5. 'userOffline'
 *    Description: User went offline
 *    Payload: userId: string
 * 
 * 6. 'notification'
 *    Description: New notification
 *    Payload: { type: string, message: string }
 * 
 * 7. 'bookingUpdate'
 *    Description: Booking status update
 *    Payload: { booking: Object, notification: Object }
 */ 