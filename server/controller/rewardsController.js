const {
  getUserRewardsSummary,
  applyRewardDiscount,
  calculateDiscount
} = require("../services/rewardsService");
const ApiError = require("../util/ApiError");

/**
 * GET /api/rewards/summary
 * Get user's rewards summary
 */
exports.getRewardsSummary = async (req, res, next) => {
  try {
    const summary = await getUserRewardsSummary(req.user.id);
    
    if (!summary) {
      return next(new ApiError(404, "User not found"));
    }

    res.json({
      success: true,
      rewards: summary
    });
  } catch (error) {
    console.error("Get rewards summary error:", error);
    next(new ApiError(500, "Failed to fetch rewards"));
  }
};

/**
 * POST /api/rewards/calculate-discount
 * Calculate discount for a given amount
 */
exports.calculateDiscountForBooking = async (req, res, next) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return next(new ApiError(400, "Valid amount required"));
    }

    const result = await applyRewardDiscount(req.user.id, amount);

    res.json({
      success: true,
      discount: result
    });
  } catch (error) {
    console.error("Calculate discount error:", error);
    next(new ApiError(500, "Failed to calculate discount"));
  }
};

/**
 * GET /api/rewards/discount-percentage
 * Get user's current discount percentage
 */
exports.getDiscountPercentage = async (req, res, next) => {
  try {
    const discountPercent = await calculateDiscount(req.user.id);

    res.json({
      success: true,
      discountPercent
    });
  } catch (error) {
    console.error("Get discount percentage error:", error);
    next(new ApiError(500, "Failed to get discount"));
  }
};
