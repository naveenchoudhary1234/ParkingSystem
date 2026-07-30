const User = require("../model/User");

// Reward tiers and their benefits
const REWARD_TIERS = {
  BRONZE: { minPoints: 0, discount: 0, name: "Bronze" },
  SILVER: { minPoints: 300, discount: 10, name: "Silver" }, // 10% discount
  GOLD: { minPoints: 500, discount: 15, name: "Gold" },     // 15% discount
  PLATINUM: { minPoints: 1000, discount: 20, name: "Platinum" } // 20% discount
};

const POINTS_PER_BOOKING = 50;

/**
 * Award points to user for completing a booking
 */
async function awardPointsForBooking(userId, bookingAmount) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    // Award 50 points per booking
    const pointsEarned = POINTS_PER_BOOKING;
    
    user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
    await user.save();

    console.log(`✅ Awarded ${pointsEarned} points to user ${user.email}. Total: ${user.loyaltyPoints}`);

    return {
      pointsEarned,
      totalPoints: user.loyaltyPoints,
      tier: getUserTier(user.loyaltyPoints)
    };
  } catch (error) {
    console.error("Award points error:", error);
    return null;
  }
}

/**
 * Get user's current tier based on points
 */
function getUserTier(points) {
  if (points >= REWARD_TIERS.PLATINUM.minPoints) return REWARD_TIERS.PLATINUM;
  if (points >= REWARD_TIERS.GOLD.minPoints) return REWARD_TIERS.GOLD;
  if (points >= REWARD_TIERS.SILVER.minPoints) return REWARD_TIERS.SILVER;
  return REWARD_TIERS.BRONZE;
}

/**
 * Calculate discount percentage based on user's points
 */
async function calculateDiscount(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return 0;

    const tier = getUserTier(user.loyaltyPoints || 0);
    return tier.discount;
  } catch (error) {
    console.error("Calculate discount error:", error);
    return 0;
  }
}

/**
 * Apply discount to booking amount
 */
async function applyRewardDiscount(userId, amount) {
  const discountPercent = await calculateDiscount(userId);
  const discountAmount = (amount * discountPercent) / 100;
  const finalAmount = amount - discountAmount;

  return {
    originalAmount: amount,
    discountPercent,
    discountAmount,
    finalAmount
  };
}

/**
 * Get user's rewards summary
 */
async function getUserRewardsSummary(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const points = user.loyaltyPoints || 0;
    const tier = getUserTier(points);
    
    // Calculate points needed for next tier
    let nextTier = null;
    let pointsToNextTier = 0;
    
    if (points < REWARD_TIERS.SILVER.minPoints) {
      nextTier = REWARD_TIERS.SILVER;
      pointsToNextTier = REWARD_TIERS.SILVER.minPoints - points;
    } else if (points < REWARD_TIERS.GOLD.minPoints) {
      nextTier = REWARD_TIERS.GOLD;
      pointsToNextTier = REWARD_TIERS.GOLD.minPoints - points;
    } else if (points < REWARD_TIERS.PLATINUM.minPoints) {
      nextTier = REWARD_TIERS.PLATINUM;
      pointsToNextTier = REWARD_TIERS.PLATINUM.minPoints - points;
    }

    return {
      points,
      tier: tier.name,
      discount: tier.discount,
      nextTier: nextTier ? nextTier.name : "Max Tier Reached",
      pointsToNextTier,
      availableRewards: getAvailableRewards(points)
    };
  } catch (error) {
    console.error("Get rewards summary error:", error);
    return null;
  }
}

/**
 * Get list of rewards user can claim
 */
function getAvailableRewards(points) {
  const rewards = [];
  
  if (points >= 300) {
    rewards.push({
      id: "discount_10",
      name: "10% Off Your Next Booking",
      description: "Silver tier benefit - 10% discount automatically applied",
      unlocked: true
    });
  }
  
  if (points >= 500) {
    rewards.push({
      id: "discount_15",
      name: "15% Off Your Next Booking",
      description: "Gold tier benefit - 15% discount automatically applied",
      unlocked: true
    });
  }
  
  if (points >= 1000) {
    rewards.push({
      id: "discount_20",
      name: "20% Off Your Next Booking",
      description: "Platinum tier benefit - 20% discount automatically applied",
      unlocked: true
    });
  }

  return rewards;
}

module.exports = {
  awardPointsForBooking,
  calculateDiscount,
  applyRewardDiscount,
  getUserRewardsSummary,
  getUserTier,
  POINTS_PER_BOOKING,
  REWARD_TIERS
};
