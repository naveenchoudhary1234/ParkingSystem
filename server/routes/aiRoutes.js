/**
 * AI Routes - Endpoints for AI-powered features
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controller/aiController');
const authMiddleware = require('../middlware/authMiddleware');

// Feature 1: AI Parking Recommendations
// POST /api/ai/recommend-parking
// Body: { parkingOptions: [...], userContext: {...} }
// If parkingOptions is empty, it will fetch from database automatically
router.post('/recommend-parking', aiController.recommendParking);

// Get AI recommendations for user's current location (auto-fetch parking)
// POST /api/ai/recommend-nearby
// Body: { lat: number, lng: number, vehicleType: 'car'|'bike', userPreferences: {...} }
router.post('/recommend-nearby', aiController.recommendNearby);

// Feature 2: Smart Query Understanding
// POST /api/ai/parse-query
// Body: { query: "natural language search" }
router.post('/parse-query', aiController.parseQuery);

// Feature 3: Booking Assistant Chatbot
// POST /api/ai/chat
// Body: { message: "user message", conversationHistory: [...] }
// Optional auth - provides better context if authenticated
router.post('/chat', (req, res, next) => {
  // Try to authenticate, but don't fail if no token
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    return authMiddleware(req, res, next);
  }
  next();
}, aiController.chat);

// Feature 4: Pricing Optimization (rental owners only)
// POST /api/ai/suggest-pricing
// Body: { propertyData: {...} }
router.post('/suggest-pricing', authMiddleware, aiController.suggestPricing);

module.exports = router;
