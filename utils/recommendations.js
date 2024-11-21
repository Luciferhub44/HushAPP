const Product = require('../models/Product');
const Order = require('../models/Order');

const recommendations = {
  async getPersonalizedRecommendations(userId) {
    // Get user's order history
    const userOrders = await Order.find({ user: userId })
      .populate('items.product');
    
    // Extract categories and artisans from order history
    const userPreferences = analyzeUserPreferences(userOrders);
    
    // Get recommended products based on preferences
    const recommendations = await Product.find({
      $or: [
        { category: { $in: userPreferences.categories } },
        { artisan: { $in: userPreferences.artisans } }
      ],
      _id: { $nin: userPreferences.purchasedProducts },
      status: 'active',
      stock: { $gt: 0 }
    })
    .sort({ rating: -1 })
    .limit(10)
    .populate('artisan', 'username artisanProfile');

    return recommendations;
  }
}; 