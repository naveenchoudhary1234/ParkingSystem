const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlware/authMiddleware");
const {
  getRewardsSummary,
  calculateDiscountForBooking,
  getDiscountPercentage
} = require("../controller/rewardsController");

// All routes require authentication
router.use(authMiddleware);

// GET /api/rewards/summary - Get user's rewards summary
router.get("/summary", getRewardsSummary);

// POST /api/rewards/calculate-discount - Calculate discount for amount
router.post("/calculate-discount", calculateDiscountForBooking);

// GET /api/rewards/discount-percentage - Get current discount percentage
router.get("/discount-percentage", getDiscountPercentage);

module.exports = router;
