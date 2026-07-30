const express = require("express");
const reviewController = require("../controller/reviewController");
const authMiddleware = require("../middlware/authMiddleware");
const router = express.Router();

// All routes require authentication
router.post("/create", authMiddleware, reviewController.createReview);
router.get("/property/:propertyId", reviewController.getPropertyReviews);
router.get("/my-reviews", authMiddleware, reviewController.getMyReviews);
router.put("/:reviewId/helpful", authMiddleware, reviewController.markHelpful);
router.post("/:reviewId/owner-response", authMiddleware, reviewController.ownerResponse);

module.exports = router;
