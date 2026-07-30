const mongoose = require("mongoose");

const pricingRuleSchema = new mongoose.Schema({
  property: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ParkingProperty", 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  ruleType: {
    type: String,
    enum: ["peak_hour", "weekend", "weekday", "event", "early_bird", "late_night", "seasonal"],
    required: true
  },
  multiplier: { 
    type: Number, 
    required: true,
    min: 0.1,
    max: 10
  },
  fixedPrice: { 
    type: Number 
  },
  startTime: { 
    type: String 
  },
  endTime: { 
    type: String 
  },
  daysOfWeek: [{ 
    type: Number, 
    min: 0, 
    max: 6 
  }],
  startDate: { 
    type: Date 
  },
  endDate: { 
    type: Date 
  },
  minHours: { 
    type: Number 
  },
  maxHours: { 
    type: Number 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  priority: { 
    type: Number, 
    default: 0 
  },
  description: { 
    type: String 
  }
}, { timestamps: true });

pricingRuleSchema.index({ property: 1, isActive: 1, priority: -1 });

module.exports = mongoose.model("PricingRule", pricingRuleSchema);
