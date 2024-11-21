router.get('/dashboard', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const timeframe = req.query.timeframe || '30d'; // 7d, 30d, 90d, 1y
    const endDate = new Date();
    const startDate = getStartDate(timeframe);

    const [
      salesData,
      customerStats,
      productPerformance,
      reviewStats
    ] = await Promise.all([
      getSalesAnalytics(req.user.id, startDate, endDate),
      getCustomerAnalytics(req.user.id, startDate, endDate),
      getProductPerformance(req.user.id, startDate, endDate),
      getReviewAnalytics(req.user.id, startDate, endDate)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        salesData,
        customerStats,
        productPerformance,
        reviewStats
      }
    });
  } catch (err) {
    next(err);
  }
}); 