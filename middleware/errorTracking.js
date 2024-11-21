const errorTracking = {
  async logError(err, req) {
    const errorLog = {
      timestamp: new Date(),
      error: {
        message: err.message,
        stack: err.stack,
        code: err.code
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        user: req.user ? req.user.id : null
      },
      environment: process.env.NODE_ENV
    };

    // Log to database or external service
    await ErrorLog.create(errorLog);

    // Alert for critical errors
    if (err.statusCode >= 500) {
      // Send alert to admin/developer
      await sendErrorAlert(errorLog);
    }
  }
}; 