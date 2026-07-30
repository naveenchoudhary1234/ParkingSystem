/**
 * AI Service for ParkEasy - LLM Integration Layer
 * Handles all LLM-based features using Groq API (OpenAI-compatible)
 */

const OpenAI = require('openai');

// Initialize Groq client (uses OpenAI SDK with custom base URL)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Groq API key
  baseURL: 'https://api.groq.com/openai/v1' // Groq endpoint
});

const AI_MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

/**
 * Feature 1: AI Parking Recommendations
 * Analyzes user context and parking options to provide smart recommendations
 */
exports.getRecommendations = async (parkingOptions, userContext) => {
  try {
    const prompt = `You are a parking recommendation expert. Analyze the following parking options and user context to provide top 3 recommendations.

User Context:
- Vehicle Type: ${userContext.vehicleType || 'car'}
- Duration: ${userContext.duration || 'unknown'} hours
- Budget: ₹${userContext.budget || 'flexible'}
- Preferences: ${userContext.preferences || 'none specified'}
- Current Location: ${userContext.location || 'unknown'}
- Time of Day: ${userContext.timeOfDay || new Date().getHours()}h

Available Parking Options:
${JSON.stringify(parkingOptions.map((p, idx) => ({
  id: p._id,
  name: p.name,
  address: p.address,
  distance: p.distance ? `${(p.distance / 1000).toFixed(1)}km` : 'unknown',
  pricePerHour: `₹${p.pricePerHour}`,
  availableCarSlots: p.availability?.carSlots?.available || p.carSlots || 0,
  availableBikeSlots: p.availability?.bikeSlots?.available || p.bikeSlots || 0
})), null, 2)}

Provide a JSON response with:
{
  "recommendations": [
    {
      "parkingId": "id",
      "rank": 1,
      "score": 0-100,
      "reason": "brief explanation",
      "highlights": ["feature1", "feature2"]
    }
  ],
  "summary": "overall recommendation summary"
}

Consider: distance, price, availability, safety, and user preferences. Be concise.`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800
    });

    // Parse JSON from response
    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    return result;
  } catch (error) {
    console.error('❌ AI Recommendation Error:', error.message);
    throw new Error('Failed to generate AI recommendations');
  }
};

/**
 * Feature 2: Smart Query Understanding
 * Parses natural language queries into structured search parameters
 */
exports.parseSearchQuery = async (query) => {
  try {
    const prompt = `Parse this natural language parking search query into structured parameters.

User Query: "${query}"

Extract and return JSON:
{
  "intent": "search|navigate|price_compare|availability_check",
  "location": "extracted location or null",
  "vehicleType": "car|bike|null",
  "priceRange": {"min": number or null, "max": number or null},
  "duration": hours as number or null,
  "preferences": ["covered", "ev_charging", "24x7", "secure"] or [],
  "radiusKm": suggested radius in km or null,
  "searchTerms": ["term1", "term2"] for text search
}

Examples:
- "cheap parking near CP metro" → location: "CP metro", priceRange: {max: 30}, searchTerms: ["cheap", "CP metro"]
- "bike parking for 2 hours" → vehicleType: "bike", duration: 2
- "covered car parking Karol Bagh" → location: "Karol Bagh", preferences: ["covered"], vehicleType: "car"

Be smart about extracting Indian locations, landmarks, and metro stations.`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 400
    });

    // Parse JSON from response
    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    return result;
  } catch (error) {
    console.error('❌ AI Query Parsing Error:', error.message);
    throw new Error('Failed to parse search query');
  }
};

/**
 * Feature 3: Booking Assistant Chatbot
 * Conversational AI to help users with bookings and answer questions
 */
exports.chatWithAssistant = async (message, conversationHistory = [], userContext = {}) => {
  try {
    // Handle smart welcome message
    if (message === 'INIT_WELCOME') {
      const userName = userContext.userProfile?.name || 'there';
      const hasActiveBookings = userContext.bookingHistory?.active > 0;
      const hasRecentBookings = userContext.bookingHistory?.recentBookings?.length > 0;

      let welcomeMessage = `Hi ${userName}! 👋 Welcome to ParkEasy.\n\n`;

      // If user has active bookings
      if (hasActiveBookings && userContext.bookingHistory?.activeBookingDetails?.length > 0) {
        const activeBooking = userContext.bookingHistory.activeBookingDetails[0];
        welcomeMessage += `🎫 **You have ${userContext.bookingHistory.active} active booking(s)**\n\n`;
        welcomeMessage += `Currently parked at:\n`;
        welcomeMessage += `• ${activeBooking.propertyName}\n`;
        welcomeMessage += `• Slot: ${activeBooking.slotNumber}\n`;
        welcomeMessage += `• Ends: ${new Date(activeBooking.endTime).toLocaleString()}\n\n`;

        if (activeBooking.canCancel) {
          welcomeMessage += `⚠️ You can still cancel this booking (within 10-minute window)\n\n`;
        }
      }
      // If user has recent bookings but no active ones
      else if (hasRecentBookings) {
        const lastBooking = userContext.bookingHistory.recentBookings[0];
        welcomeMessage += `📋 **Your last parking:**\n`;
        welcomeMessage += `• ${lastBooking.propertyName}\n`;
        welcomeMessage += `• ${new Date(lastBooking.date).toLocaleDateString()} - ${lastBooking.status}\n`;
        welcomeMessage += `• Amount: ₹${lastBooking.amount}\n\n`;
        welcomeMessage += `Total bookings: ${userContext.bookingHistory.total} | Total spent: ${userContext.userStats?.totalSpent || '₹0'}\n\n`;
      }
      // New user
      else {
        welcomeMessage += `🚗 **Ready to find your perfect parking spot?**\n\n`;
        welcomeMessage += `We have ${userContext.parkingInventory?.totalProperties || '20+'} locations across multiple cities.\n\n`;
      }

      welcomeMessage += `How can I help you today?`;

      return {
        reply: welcomeMessage,
        suggestions: hasActiveBookings
          ? ['View my booking', 'Find more parking', 'Cancel booking']
          : hasRecentBookings
          ? ['Find parking', 'View all locations', 'My bookings']
          : ['Find parking near me', 'View all locations', 'Pricing info'],
        actions: hasActiveBookings
          ? [{ type: 'show_active_bookings', data: userContext.bookingHistory.activeBookingDetails }]
          : hasRecentBookings
          ? [{ type: 'show_recent_bookings', data: userContext.bookingHistory.recentBookings.slice(0, 3) }]
          : [],
        needsHumanSupport: false
      };
    }

    // Build personalized system prompt based on user context
    let systemPrompt = `You are ParkEasy AI Assistant, a personalized parking concierge for ${userContext.userProfile?.name || 'our valued customer'}.

YOUR CAPABILITIES:
✅ Show user's booking history and active bookings
✅ Help cancel bookings (only within 10 minutes of booking)
✅ Find parking in specific cities/areas
✅ Provide detailed location info with exact addresses
✅ Answer questions about user's account and spending
✅ Guide users through booking process
✅ Handle complaints and support issues

USER PROFILE:
${userContext.authenticated ? `
- Name: ${userContext.userProfile?.name}
- Email: ${userContext.userProfile?.email}
- Phone: ${userContext.userProfile?.phone}
- Role: ${userContext.userProfile?.role}
- 💰 Wallet Balance: ₹${userContext.userProfile?.wallet || 0}
- Member since: ${userContext.userProfile?.memberSince ? new Date(userContext.userProfile.memberSince).toLocaleDateString() : 'N/A'}
` : '- Not logged in (Guest user)'}

USER'S BOOKING HISTORY:
${userContext.bookingHistory ? `
- Total Bookings: ${userContext.bookingHistory.total}
- Active Bookings: ${userContext.bookingHistory.active}
- Upcoming Bookings: ${userContext.bookingHistory.upcoming}
- Past Bookings: ${userContext.bookingHistory.past}
- Total Spent: ${userContext.userStats?.totalSpent || '₹0'}

ACTIVE BOOKINGS RIGHT NOW:
${userContext.bookingHistory.activeBookingDetails?.length > 0 ?
  userContext.bookingHistory.activeBookingDetails.map(b => `
  • ${b.propertyName} - ${b.address}
    Slot: ${b.slotNumber}, Ends: ${new Date(b.endTime).toLocaleString()}
    ${b.canCancel ? '⚠️ CAN BE CANCELLED (within 10 min window)' : '❌ Cannot cancel (>10 min passed)'}
  `).join('\n') : 'No active bookings'}

UPCOMING BOOKINGS:
${userContext.bookingHistory.upcomingBookingDetails?.length > 0 ?
  userContext.bookingHistory.upcomingBookingDetails.map(b => `
  • ${b.propertyName} - ${new Date(b.startTime).toLocaleString()}
    Amount: ₹${b.amount} ${b.canCancel ? '(Can cancel)' : '(Cannot cancel)'}
  `).join('\n') : 'No upcoming bookings'}

RECENT BOOKING HISTORY:
${userContext.bookingHistory.recentBookings?.map(b =>
  `• ${b.propertyName} - ${new Date(b.date).toLocaleDateString()} - ${b.status} - ₹${b.amount}`
).join('\n') || 'No booking history'}
` : 'User has no bookings yet'}

PARKING INVENTORY BY CITY (REAL DATA):
${userContext.parkingInventory?.byCity ? userContext.parkingInventory.byCity.map(city => `
📍 ${city.city}:
  - ${city.properties} parking locations
  - ${city.carSlots} car slots, ${city.bikeSlots} bike slots
  - Avg price: ${city.avgPrice}
  Top locations:
${city.topLocations?.map(loc => `    • ${loc.name} (${loc.address}) - ₹${loc.price}/hr - ${loc.carSlots} cars, ${loc.bikeSlots} bikes`).join('\n')}
`).join('\n') : 'Loading parking data...'}

GUIDELINES:
1. **Personalization**: Always address user by name (${userContext.userProfile?.name || 'there'})
2. **Specific Data**: When asked about locations, give EXACT names, addresses, and prices from inventory above
3. **City-Specific**: If asked about a city (e.g., Pune, Delhi), show data for THAT city only
4. **Booking Actions**:
   - If user wants to cancel, check if booking is within 10-min window
   - Tell them booking ID and confirm cancellation possibility
5. **Be Helpful**: Suggest nearby alternatives if a location is full
6. **Format**: Use bullet points, emojis, and clear structure
7. **Length**: Keep responses conversational, 100-200 words max
8. **Numbers**: Use REAL numbers from inventory, never make up data
9. **Indian Context**: Use ₹ for prices, mention landmarks when possible
10. **Actions**: If user asks to cancel/book, provide clear next steps or booking IDs

RESPONSE STYLE (PROFESSIONAL LIKE FLIPKART):
- **Concise & Direct**: Maximum 3-4 lines of text, then show cards/actions
- **Personal**: Use user's name (${userContext.userProfile?.name || 'there'})
- **Action-First**: If showing locations/bookings, keep text minimal and let cards do the talking
- **Format**: Use bullet points (•) not full paragraphs
- **Professional Tone**: Friendly but business-like, not overly casual
- **Smart**: When user asks "show all parking" or similar, respond with:
  "Here are all our parking locations:" (1 line) then let the action cards display everything

IMPORTANT - RESPONSE LENGTH:
- When showing location cards: 1-2 lines of text maximum
- When showing bookings: 1 line + cards
- Only explanatory queries need longer responses (3-4 lines max)
- NEVER write paragraphs when cards can show the data`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: message }
    ];

    console.log('🔍 Calling Groq API with model:', AI_MODEL);
    console.log('🔍 Message count:', messages.length);

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    console.log('✅ Groq API response received');

    const aiReply = response.choices[0].message.content;

    // Detect if user wants to perform actions
    const detectedActions = [];
    const suggestions = [];

    // Check for "show all locations" or similar queries
    if (message.toLowerCase().includes('show all') ||
        message.toLowerCase().includes('all parking') ||
        message.toLowerCase().includes('all locations')) {

      // Group all parking by city with cards
      if (userContext.parkingInventory?.byCity) {
        userContext.parkingInventory.byCity.forEach(cityData => {
          if (cityData.topLocations?.length > 0) {
            detectedActions.push({
              type: 'show_city_locations',
              city: cityData.city,
              data: cityData.topLocations
            });
          }
        });
      }

      // Add city selection suggestions
      suggestions.push('Show Pune parking');
      suggestions.push('Show Delhi parking');
      suggestions.push('My bookings');
    }

    // Check for cancellation intent
    if (aiReply.toLowerCase().includes('cancel') && userContext.bookingHistory?.cancellable > 0) {
      detectedActions.push({
        type: 'show_cancellable_bookings',
        data: userContext.bookingHistory.activeBookingDetails?.filter(b => b.canCancel)
      });
    }

    // Check for wallet balance query
    if (message.toLowerCase().includes('wallet') ||
        message.toLowerCase().includes('balance') ||
        message.toLowerCase().includes('refund')) {

      const walletBalance = userContext.userProfile?.wallet || 0;
      suggestions.push('My bookings');
      suggestions.push('Find parking');
    }

    // Check for active bookings display
    if (message.toLowerCase().includes('my booking') ||
        message.toLowerCase().includes('show my booking') ||
        message.toLowerCase().includes('current booking')) {

      if (userContext.bookingHistory?.activeBookingDetails?.length > 0) {
        detectedActions.push({
          type: 'show_active_bookings',
          data: userContext.bookingHistory.activeBookingDetails
        });

        // Add action suggestions
        if (userContext.bookingHistory.cancellable > 0) {
          suggestions.push('Cancel my booking');
        }
        suggestions.push('Book another slot');
      } else if (userContext.bookingHistory?.recentBookings?.length > 0) {
        detectedActions.push({
          type: 'show_recent_bookings',
          data: userContext.bookingHistory.recentBookings.slice(0, 3)
        });
        suggestions.push('Find parking');
        suggestions.push('View all locations');
      }
    }

    // Check for booking intent
    if (aiReply.toLowerCase().includes('book') || message.toLowerCase().includes('book')) {
      suggestions.push('Search Nearby Parking');
      suggestions.push('View All Locations');
    }

    // Check for history request
    if (message.toLowerCase().includes('history')) {
      detectedActions.push({
        type: 'show_booking_history',
        data: userContext.bookingHistory?.recentBookings
      });
    }

    // Check for location-specific query
    const cityMatch = message.match(/\b(pune|delhi|mumbai|bangalore|bengaluru)\b/i);
    if (cityMatch && userContext.parkingInventory?.byCity) {
      const cityData = userContext.parkingInventory.byCity.find(
        c => c.city.toLowerCase() === cityMatch[1].toLowerCase() ||
             (cityMatch[1].toLowerCase() === 'bengaluru' && c.city.toLowerCase() === 'bangalore')
      );
      if (cityData?.topLocations) {
        detectedActions.push({
          type: 'show_city_locations',
          city: cityData.city,
          data: cityData.topLocations
        });

        // Add suggestions for other cities
        const otherCities = userContext.parkingInventory.byCity
          .filter(c => c.city !== cityData.city)
          .slice(0, 2);

        otherCities.forEach(city => {
          suggestions.push(`Show ${city.city} parking`);
        });
      }
    }

    return {
      reply: aiReply,
      needsHumanSupport: aiReply.toLowerCase().includes('contact support'),
      suggestions: suggestions,
      actions: detectedActions
    };
  } catch (error) {
    console.error('❌ AI Chat Error Details:');
    console.error('   Error message:', error.message);
    console.error('   Error type:', error.constructor.name);
    console.error('   Error status:', error.status);
    console.error('   Full error:', error);
    throw new Error('Failed to get AI response');
  }
};

/**
 * Feature 4: Pricing Optimization
 * Suggests optimal pricing for rental owners based on market data
 */
exports.suggestPricing = async (propertyData, marketData) => {
  try {
    const prompt = `You are a parking pricing expert in India. Suggest optimal pricing strategy.

New Property:
- Location: ${propertyData.address}
- Area: ${propertyData.area || 'unknown'}
- Car Slots: ${propertyData.carSlots}
- Bike Slots: ${propertyData.bikeSlots}
- Amenities: ${propertyData.amenities || 'none'}
- Space Type: ${propertyData.spaceType || 'open'}

Market Data (Nearby Competition):
${JSON.stringify(marketData.map(p => ({
  name: p.name,
  distance: p.distance ? `${(p.distance / 1000).toFixed(1)}km` : 'unknown',
  pricePerHour: `₹${p.pricePerHour}`,
  carSlots: p.carSlots,
  bikeSlots: p.bikeSlots
})), null, 2)}

Average market price: ₹${marketData.length > 0 ? Math.round(marketData.reduce((sum, p) => sum + p.pricePerHour, 0) / marketData.length) : 'unknown'}/hour

Provide JSON:
{
  "suggestedPrice": number (per hour in ₹),
  "priceRange": {"min": number, "max": number},
  "reasoning": "brief explanation",
  "pricingStrategy": "competitive|premium|budget",
  "tips": ["tip1", "tip2", "tip3"],
  "demandForecast": "low|medium|high"
}

Consider: location, competition, amenities, demand, typical Indian parking rates (₹10-100/hour).`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 500
    });

    // Parse JSON from response
    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    return result;
  } catch (error) {
    console.error('❌ AI Pricing Error:', error.message);
    throw new Error('Failed to generate pricing suggestions');
  }
};

module.exports = exports;
