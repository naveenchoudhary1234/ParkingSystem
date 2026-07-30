/**
 * Frontend AI Service - API client for AI-powered features
 */

import { apiRequest } from '../api';

/**
 * Feature 1: Get AI parking recommendations
 * @param {Array} parkingOptions - Array of parking property objects (optional - will auto-fetch if empty)
 * @param {Object} userContext - User preferences and context
 * @returns {Promise<Object>} AI recommendations
 */
export const getAIRecommendations = async (parkingOptions, userContext = {}) => {
  try {
    const response = await apiRequest('/ai/recommend-parking', 'POST', {
      parkingOptions: parkingOptions || [],
      userContext
    });
    return response;
  } catch (error) {
    console.error('AI Recommendations Error:', error);
    throw error;
  }
};

/**
 * Get AI recommendations based on location (auto-fetches parking from DB)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} vehicleType - 'car' or 'bike'
 * @param {Object} userPreferences - Additional preferences
 * @returns {Promise<Object>} AI recommendations
 */
export const getAIRecommendationsNearby = async (lat, lng, vehicleType = 'car', userPreferences = {}) => {
  try {
    const response = await apiRequest('/ai/recommend-nearby', 'POST', {
      lat,
      lng,
      vehicleType,
      userPreferences,
      radius: 5000 // 5km radius
    });
    return response;
  } catch (error) {
    console.error('AI Nearby Recommendations Error:', error);
    throw error;
  }
};

/**
 * Feature 2: Parse natural language search query
 * @param {string} query - Natural language search query
 * @returns {Promise<Object>} Parsed query parameters
 */
export const parseSearchQuery = async (query) => {
  try {
    const response = await apiRequest('/ai/parse-query', 'POST', { query });
    return response;
  } catch (error) {
    console.error('AI Query Parsing Error:', error);
    throw error;
  }
};

/**
 * Feature 3: Chat with AI assistant
 * @param {string} message - User message
 * @param {Array} conversationHistory - Previous messages
 * @returns {Promise<Object>} AI response
 */
export const chatWithAI = async (message, conversationHistory = []) => {
  try {
    const response = await apiRequest('/ai/chat', 'POST', {
      message,
      conversationHistory
    });
    return response;
  } catch (error) {
    console.error('AI Chat Error:', error);
    throw error;
  }
};

/**
 * Feature 4: Get pricing suggestions for property
 * @param {Object} propertyData - Property details
 * @returns {Promise<Object>} Pricing suggestions
 */
export const getPricingSuggestions = async (propertyData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await apiRequest('/ai/suggest-pricing', 'POST', {
      propertyData
    }, token);
    return response;
  } catch (error) {
    console.error('AI Pricing Error:', error);
    throw error;
  }
};

export default {
  getAIRecommendations,
  parseSearchQuery,
  chatWithAI,
  getPricingSuggestions
};
