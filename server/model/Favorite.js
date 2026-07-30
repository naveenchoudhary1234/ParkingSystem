const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  property: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ParkingProperty", 
    required: true 
  },
  // Notification preferences for this favorite
  notifyOnAvailability: { type: Boolean, default: true },
  notifyOnPriceChange: { type: Boolean, default: true },
  notifyOnDiscount: { type: Boolean, default: true },
  
  // Tags/notes
  nickname: { type: String }, // e.g., "Near Office", "Weekend Spot"
  
  // Track usage
  timesBooked: { type: Number, default: 0 },
  lastBookedAt: { type: Date }
}, { timestamps: true });

// Compound index to ensure one favorite per user per property
favoriteSchema.index({ user: 1, property: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);
