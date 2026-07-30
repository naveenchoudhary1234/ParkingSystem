/**
 * AI Controller - Handles all AI-powered endpoints
 */

const aiService = require('../services/aiService');
const ParkingProperty = require('../model/ParkingProperty');

/**
 * POST /api/ai/recommend-parking
 * Feature 1: Get AI-powered parking recommendations
 */
exports.recommendParking = async (req, res, next) => {
  try {
    let { parkingOptions, userContext } = req.body;

    // If no parking options provided, fetch from database
    if (!parkingOptions || !Array.isArray(parkingOptions) || parkingOptions.length === 0) {
      console.log('🔍 No parking options provided, fetching from database...');

      // Fetch approved and active properties with availability
      const properties = await ParkingProperty.find({
        approved: true,
        active: { $ne: false }
      }).limit(20);

      console.log(`📊 Found ${properties.length} available parking properties`);

      parkingOptions = properties.map(p => ({
        _id: p._id,
        name: p.name,
        address: p.address,
        fullAddress: p.fullAddress,
        pricePerHour: p.pricePerHour,
        carSlots: p.carSlots,
        bikeSlots: p.bikeSlots,
        location: p.location,
        distance: null // Will be calculated if user location is provided
      }));

      if (parkingOptions.length === 0) {
        return res.status(404).json({
          error: 'No parking properties available at the moment'
        });
      }
    }

    console.log(`🤖 AI Recommendation request for ${parkingOptions.length} parking options`);

    const recommendations = await aiService.getRecommendations(parkingOptions, userContext || {});

    res.json({
      success: true,
      recommendations: recommendations.recommendations,
      summary: recommendations.summary,
      totalOptionsAnalyzed: parkingOptions.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ AI Recommendation Error:', error.message);
    next(error);
  }
};

/**
 * POST /api/ai/recommend-nearby
 * Get AI recommendations based on user location (auto-fetches parking)
 */
exports.recommendNearby = async (req, res, next) => {
  try {
    const { lat, lng, vehicleType, radius = 5000, userPreferences } = req.body;

    console.log(`🔍 Searching nearby parking: lat=${lat}, lng=${lng}, radius=${radius}m`);

    // Fetch nearby properties from database
    let parkingOptions = [];

    if (lat && lng) {
      parkingOptions = await ParkingProperty.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
            distanceField: "distance",
            maxDistance: parseInt(radius),
            spherical: true,
            query: { approved: true, active: { $ne: false } }
          }
        },
        { $limit: 15 },
        {
          $project: {
            name: 1,
            address: 1,
            fullAddress: 1,
            pricePerHour: 1,
            carSlots: 1,
            bikeSlots: 1,
            distance: 1,
            location: 1
          }
        }
      ]);
    } else {
      // No location provided, get all approved properties
      const properties = await ParkingProperty.find({
        approved: true,
        active: { $ne: false }
      }).limit(15);

      parkingOptions = properties.map(p => ({
        _id: p._id,
        name: p.name,
        address: p.address,
        fullAddress: p.fullAddress,
        pricePerHour: p.pricePerHour,
        carSlots: p.carSlots,
        bikeSlots: p.bikeSlots,
        distance: null
      }));
    }

    if (parkingOptions.length === 0) {
      return res.status(404).json({
        error: 'No parking properties found in your area'
      });
    }

    console.log(`📊 Found ${parkingOptions.length} nearby parking options`);

    // Get AI recommendations
    const userContext = {
      vehicleType: vehicleType || 'car',
      location: lat && lng ? `${lat}, ${lng}` : 'unknown',
      preferences: userPreferences || ''
    };

    const recommendations = await aiService.getRecommendations(parkingOptions, userContext);

    res.json({
      success: true,
      recommendations: recommendations.recommendations,
      summary: recommendations.summary,
      totalOptionsAnalyzed: parkingOptions.length,
      searchRadius: radius,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ AI Nearby Recommendations Error:', error.message);
    next(error);
  }
};

/**
 * POST /api/ai/parse-query
 * Feature 2: Parse natural language search query
 */
exports.parseQuery = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query string is required' });
    }

    console.log(`🤖 AI Query parsing: "${query}"`);

    const parsedQuery = await aiService.parseSearchQuery(query);

    res.json({
      success: true,
      parsed: parsedQuery,
      originalQuery: query,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ AI Query Parsing Error:', error.message);
    next(error);
  }
};

/**
 * POST /api/ai/chat
 * Feature 3: Chat with AI assistant (Personalized & Action-capable)
 */
exports.chat = async (req, res, next) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message string is required' });
    }

    console.log(`🤖 AI Chat: "${message.substring(0, 50)}..."`);

    // Build comprehensive user context
    const userContext = {
      authenticated: !!req.user,
      role: req.user?.role || 'guest',
      userId: req.user?.id
    };

    // If user is authenticated, fetch their complete profile
    if (req.user?.id) {
      const User = require('../model/User');
      const Booking = require('../model/Booking');

      const user = await User.findById(req.user.id).select('-password');

      if (user) {
        userContext.userProfile = {
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          wallet: user.wallet || 0, // Include wallet balance
          memberSince: user.createdAt
        };

        // Fetch user's bookings
        const bookings = await Booking.find({ user: req.user.id })
          .populate('property', 'name address fullAddress pricePerHour contactNumber location')
          .sort({ createdAt: -1 })
          .limit(10);

        // Separate active, upcoming, and past bookings
        const now = new Date();
        const activeBookings = bookings.filter(b =>
          b.status !== 'cancelled' && new Date(b.startTime) <= now && new Date(b.endTime) > now
        );
        const upcomingBookings = bookings.filter(b =>
          b.status !== 'cancelled' && new Date(b.startTime) > now
        );
        const pastBookings = bookings.filter(b =>
          b.status === 'cancelled' || new Date(b.endTime) <= now
        );

        // Bookings that can be cancelled (within 10 minutes of booking)
        const cancellableBookings = bookings.filter(b => {
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          const bookingTime = new Date(b.createdAt);
          return b.status !== 'cancelled' && bookingTime > tenMinutesAgo;
        });

        userContext.bookingHistory = {
          total: bookings.length,
          active: activeBookings.length,
          upcoming: upcomingBookings.length,
          past: pastBookings.length,
          cancellable: cancellableBookings.length,
          activeBookingDetails: activeBookings.map(b => ({
            id: b._id,
            bookingId: b._id.toString(), // Add this for frontend cancel action
            propertyName: b.property?.name,
            address: b.property?.fullAddress || b.property?.address,
            slotNumber: b.slotInfo?.slotNumber || b.slot,
            startTime: b.startTime,
            endTime: b.endTime,
            amount: b.totalAmount,
            canCancel: cancellableBookings.some(cb => cb._id.toString() === b._id.toString())
          })),
          upcomingBookingDetails: upcomingBookings.map(b => ({
            id: b._id,
            propertyName: b.property?.name,
            startTime: b.startTime,
            amount: b.totalAmount,
            canCancel: cancellableBookings.some(cb => cb._id.toString() === b._id.toString())
          })),
          recentBookings: bookings.slice(0, 3).map(b => ({
            propertyName: b.property?.name,
            date: b.startTime,
            status: b.status,
            amount: b.totalAmount
          }))
        };

        // Calculate total spending
        const totalSpent = bookings
          .filter(b => b.status !== 'cancelled')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        userContext.userStats = {
          totalBookings: bookings.length,
          totalSpent: `₹${totalSpent}`,
          favoriteLocation: bookings.length > 0 ? bookings[0].property?.name : null
        };
      }
    }

    // Fetch parking inventory grouped by city/area
    const parkingByLocation = await ParkingProperty.aggregate([
      { $match: { approved: true, active: { $ne: false } } },
      {
        $addFields: {
          city: {
            $cond: {
              if: { $regexMatch: { input: "$address", regex: /pune/i } },
              then: "Pune",
              else: {
                $cond: {
                  if: { $regexMatch: { input: "$address", regex: /delhi|connaught|karol bagh|cp/i } },
                  then: "Delhi",
                  else: {
                    $cond: {
                      if: { $regexMatch: { input: "$address", regex: /mumbai/i } },
                      then: "Mumbai",
                      else: {
                        $cond: {
                          if: { $regexMatch: { input: "$address", regex: /bangalore|bengaluru/i } },
                          then: "Bangalore",
                          else: "Other"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$city',
          properties: { $sum: 1 },
          carSlots: { $sum: '$carSlots' },
          bikeSlots: { $sum: '$bikeSlots' },
          avgPrice: { $avg: '$pricePerHour' },
          locations: {
            $push: {
              name: '$name',
              address: '$address',
              price: '$pricePerHour',
              carSlots: '$carSlots',
              bikeSlots: '$bikeSlots'
            }
          }
        }
      },
      { $sort: { properties: -1 } }
    ]);

    userContext.parkingInventory = {
      byCity: parkingByLocation.map(city => ({
        city: city._id,
        properties: city.properties,
        carSlots: city.carSlots,
        bikeSlots: city.bikeSlots,
        avgPrice: `₹${Math.round(city.avgPrice)}/hour`,
        topLocations: city.locations.slice(0, 3)
      })),
      total: parkingByLocation.reduce((sum, city) => sum + city.properties, 0)
    };

    console.log('📊 User context prepared:', {
      authenticated: userContext.authenticated,
      userName: userContext.userProfile?.name,
      activeBookings: userContext.bookingHistory?.active,
      cities: userContext.parkingInventory?.byCity?.length
    });

    const response = await aiService.chatWithAssistant(
      message,
      conversationHistory || [],
      userContext
    );

    res.json({
      success: true,
      reply: response.reply,
      needsHumanSupport: response.needsHumanSupport,
      suggestions: response.suggestions || [],
      actions: response.actions || [],
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ AI Chat Error:', error.message);
    console.error(error);
    next(error);
  }
};

/**
 * POST /api/ai/suggest-pricing
 * Feature 4: Get AI pricing suggestions for rental owners
 */
exports.suggestPricing = async (req, res, next) => {
  try {
    const { propertyData } = req.body;

    if (!propertyData) {
      return res.status(400).json({ error: 'propertyData is required' });
    }

    console.log(`🤖 AI Pricing suggestion for: ${propertyData.address}`);

    // Fetch nearby properties as market data
    let marketData = [];
    if (propertyData.location?.coordinates) {
      const [lng, lat] = propertyData.location.coordinates;
      
      // Search within 5km radius for pricing comparison
      marketData = await ParkingProperty.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [lng, lat]
            },
            distanceField: "distance",
            maxDistance: 5000, // 5km
            spherical: true,
            query: { approved: true, active: { $ne: false } }
          }
        },
        {
          $limit: 10 // Top 10 nearby properties
        },
        {
          $project: {
            name: 1,
            pricePerHour: 1,
            carSlots: 1,
            bikeSlots: 1,
            distance: 1
          }
        }
      ]);
    }

    const pricingSuggestion = await aiService.suggestPricing(propertyData, marketData);

    res.json({
      success: true,
      pricing: pricingSuggestion,
      marketDataPoints: marketData.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ AI Pricing Error:', error.message);
    next(error);
  }
};

module.exports = exports;
