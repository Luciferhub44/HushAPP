const messageTemplates = {
  booking: {
    created: (bookingId) => ({
      type: 'system',
      content: `Booking #${bookingId} has been created. Please wait for artisan confirmation.`,
      metadata: { bookingId, action: 'booking_created' }
    }),
    accepted: (bookingId) => ({
      type: 'system',
      content: `Booking #${bookingId} has been accepted. Your service is confirmed.`,
      metadata: { bookingId, action: 'booking_accepted' }
    }),
    started: (bookingId) => ({
      type: 'system',
      content: `Service for booking #${bookingId} has started.`,
      metadata: { bookingId, action: 'booking_started' }
    }),
    completed: (bookingId) => ({
      type: 'system',
      content: `Service for booking #${bookingId} has been completed. Please leave a review.`,
      metadata: { bookingId, action: 'booking_completed' }
    }),
    cancelled: (bookingId, reason) => ({
      type: 'system',
      content: `Booking #${bookingId} has been cancelled. Reason: ${reason}`,
      metadata: { bookingId, action: 'booking_cancelled', reason }
    })
  },
  payment: {
    received: (amount) => ({
      type: 'system',
      content: `Payment of $${amount} has been received.`,
      metadata: { amount, action: 'payment_received' }
    }),
    refunded: (amount) => ({
      type: 'system',
      content: `Refund of $${amount} has been processed.`,
      metadata: { amount, action: 'payment_refunded' }
    }),
    disputed: () => ({
      type: 'system',
      content: 'A payment dispute has been opened.',
      metadata: { action: 'payment_disputed' }
    })
  },
  quickReplies: {
    artisan: [
      "I will be there soon.",
      "I am running a bit late.",
      "I have arrived at the location.",
      "Could you provide more details?",
      "The job is completed.",
      "Thank you for your business!"
    ],
    user: [
      "When will you arrive?",
      "Here is my exact location.",
      "Please let me know when you are close.",
      "I need to reschedule.",
      "Thank you for the service!"
    ]
  },
  generateQuickReply: (message) => ({
    type: 'quick_reply',
    content: message,
    metadata: { action: 'quick_reply' }
  })
};

module.exports = messageTemplates; 