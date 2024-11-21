const ServiceTracking = {
  async updateServiceStatus(bookingId, status, details) {
    const booking = await Booking.findById(bookingId);
    const previousStatus = booking.status;

    // Update status with timestamp
    booking.statusHistory.push({
      status,
      timestamp: new Date(),
      details
    });

    booking.status = status;
    await booking.save();

    // Emit real-time update
    io.to(`booking_${bookingId}`).emit('statusUpdate', {
      bookingId,
      status,
      timestamp: new Date(),
      details
    });

    // Send notifications
    await notifications.sendStatusUpdate({
      user: booking.user,
      artisan: booking.artisan,
      booking: bookingId,
      previousStatus,
      newStatus: status
    });

    // Trigger relevant workflows
    await this.handleStatusChange(booking, status);
  },

  async handleStatusChange(booking, status) {
    switch(status) {
      case 'started':
        await this.startServiceTimer(booking);
        break;
      case 'completed':
        await this.finalizeService(booking);
        break;
      // ... other status handlers
    }
  }
}; 