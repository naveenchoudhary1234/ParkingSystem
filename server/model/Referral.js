const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({
  referrer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  referred: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  referralCode: { 
    type: String, 
    required: true,
    unique: true,
    uppercase: true
  },
  referredEmail: { 
    type: String 
  },
  status: {
    type: String,
    enum: ["pending", "registered", "completed", "expired"],
    default: "pending"
  },
  rewardAmount: { 
    type: Number, 
    default: 50 
  },
  referrerRewarded: { 
    type: Boolean, 
    default: false 
  },
  referredRewarded: { 
    type: Boolean, 
    default: false 
  },
  completedAt: { 
    type: Date 
  },
  expiresAt: { 
    type: Date 
  }
}, { timestamps: true });

referralSchema.index({ referralCode: 1 });
referralSchema.index({ referrer: 1 });

module.exports = mongoose.model("Referral", referralSchema);
