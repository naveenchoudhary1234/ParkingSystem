const mongoose = require("mongoose");

const pointsSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true
  },
  totalPoints: { 
    type: Number, 
    default: 0 
  },
  availablePoints: { 
    type: Number, 
    default: 0 
  },
  redeemedPoints: { 
    type: Number, 
    default: 0 
  },
  tier: {
    type: String,
    enum: ["bronze", "silver", "gold", "platinum"],
    default: "bronze"
  },
  history: [{
    action: { 
      type: String, 
      required: true 
    },
    points: { 
      type: Number, 
      required: true 
    },
    type: {
      type: String,
      enum: ["earned", "redeemed", "expired"],
      required: true
    },
    relatedBooking: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Booking" 
    },
    relatedReferral: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Referral" 
    },
    description: { 
      type: String 
    },
    date: { 
      type: Date, 
      default: Date.now 
    }
  }]
}, { timestamps: true });

// Calculate tier based on total points
pointsSchema.methods.updateTier = function() {
  if (this.totalPoints >= 5000) this.tier = "platinum";
  else if (this.totalPoints >= 2000) this.tier = "gold";
  else if (this.totalPoints >= 500) this.tier = "silver";
  else this.tier = "bronze";
};

module.exports = mongoose.model("Points", pointsSchema);
