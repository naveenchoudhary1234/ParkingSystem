const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
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
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Booking", 
    required: true 
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: false,
    maxLength: 100
  },
  comment: {
    type: String,
    required: false,
    maxLength: 1000
  },
  images: [{ 
    type: String 
  }],
  // Review categories
  cleanliness: { type: Number, min: 1, max: 5 },
  security: { type: Number, min: 1, max: 5 },
  accessibility: { type: Number, min: 1, max: 5 },
  valueForMoney: { type: Number, min: 1, max: 5 },
  
  // Verified review (can only review if booking completed)
  verified: { type: Boolean, default: true },
  
  // Owner response
  ownerResponse: {
    text: { type: String, maxLength: 500 },
    respondedAt: { type: Date }
  },
  
  // Moderation
  isReported: { type: Boolean, default: false },
  reportReason: { type: String },
  isHidden: { type: Boolean, default: false },
  
  // Helpful votes
  helpfulCount: { type: Number, default: 0 },
  helpfulVotes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }]
}, { timestamps: true });

// Index for faster queries
reviewSchema.index({ property: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });

// Calculate average rating for property
reviewSchema.statics.calculateAverageRating = async function(propertyId) {
  const result = await this.aggregate([
    { $match: { property: new mongoose.Types.ObjectId(propertyId), isHidden: false } },
    {
      $group: {
        _id: '$property',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        avgCleanliness: { $avg: '$cleanliness' },
        avgSecurity: { $avg: '$security' },
        avgAccessibility: { $avg: '$accessibility' },
        avgValueForMoney: { $avg: '$valueForMoney' }
      }
    }
  ]);

  if (result.length > 0) {
    return result[0];
  }
  return {
    averageRating: 0,
    totalReviews: 0,
    avgCleanliness: 0,
    avgSecurity: 0,
    avgAccessibility: 0,
    avgValueForMoney: 0
  };
};

module.exports = mongoose.model("Review", reviewSchema);
