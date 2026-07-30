const mongoose = require("mongoose");

const notificationPreferenceSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true
  },
  
  // Channel preferences
  channels: {
    push: { type: Boolean, default: true },      // Browser push notifications
    email: { type: Boolean, default: true },     // Email notifications
    sms: { type: Boolean, default: false }       // SMS notifications (opt-in)
  },
  
  // Notification type preferences
  bookings: {
    confirmed: { type: Boolean, default: true },
    reminder: { type: Boolean, default: true },     // Before booking starts
    endingSoon: { type: Boolean, default: true },   // 15 mins before end
    cancelled: { type: Boolean, default: true },
    extended: { type: Boolean, default: true }
  },
  
  payments: {
    received: { type: Boolean, default: true },
    refunded: { type: Boolean, default: true },
    failed: { type: Boolean, default: true }
  },
  
  favorites: {
    available: { type: Boolean, default: true },   // Favorite spot became available
    priceDrop: { type: Boolean, default: true }    // Price dropped on favorite
  },
  
  reviews: {
    newReview: { type: Boolean, default: true },   // Someone reviewed your property
    ownerResponse: { type: Boolean, default: true }, // Owner responded to your review
    reminder: { type: Boolean, default: true }     // Reminder to review after booking
  },
  
  promotions: {
    offers: { type: Boolean, default: true },      // Discount offers
    newsletter: { type: Boolean, default: false }  // Weekly newsletter
  },
  
  owner: {
    newBooking: { type: Boolean, default: true },  // New booking on your property
    propertyApproved: { type: Boolean, default: true },
    propertyRejected: { type: Boolean, default: true },
    paymentReceived: { type: Boolean, default: true }
  },
  
  // Quiet hours (don't send push during these hours)
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: "22:00" }, // 10 PM
    endTime: { type: String, default: "08:00" }    // 8 AM
  },
  
  // Push notification subscription (for Web Push)
  pushSubscription: {
    endpoint: { type: String },
    keys: {
      p256dh: { type: String },
      auth: { type: String }
    }
  }
  
}, { timestamps: true });

// Create default preferences when user signs up
notificationPreferenceSchema.statics.createDefault = async function(userId) {
  try {
    const existing = await this.findOne({ user: userId });
    if (existing) return existing;
    
    return await this.create({ user: userId });
  } catch (error) {
    console.error("Error creating default notification preferences:", error);
    return null;
  }
};

module.exports = mongoose.model("NotificationPreference", notificationPreferenceSchema);
