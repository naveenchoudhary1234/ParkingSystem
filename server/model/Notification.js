const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  type: { 
    type: String, 
    enum: [
      'booking_confirmed',
      'booking_ending_soon',
      'booking_cancelled',
      'payment_received',
      'refund_processed',
      'favorite_available',
      'price_drop',
      'discount_offer',
      'review_reminder',
      'new_review',
      'owner_response',
      'property_approved',
      'property_rejected',
      'maintenance_scheduled',
      'emergency_alert'
    ],
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    maxLength: 100
  },
  message: { 
    type: String, 
    required: true,
    maxLength: 500
  },
  // Related data
  relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  relatedProperty: { type: mongoose.Schema.Types.ObjectId, ref: "ParkingProperty" },
  relatedReview: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
  
  // Action link
  actionUrl: { type: String },
  actionText: { type: String },
  
  // Status
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  
  // Priority
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Expiry (for time-sensitive notifications)
  expiresAt: { type: Date }
}, { timestamps: true });

// Indexes
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Notification", notificationSchema);
