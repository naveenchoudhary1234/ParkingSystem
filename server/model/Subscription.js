const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
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
  type: { 
    type: String, 
    enum: ["daily", "weekly", "monthly", "corporate"],
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  originalPrice: { 
    type: Number 
  },
  discount: { 
    type: Number, 
    default: 0 
  },
  vehicleType: {
    type: String,
    enum: ["car", "bike"],
    required: true
  },
  slotNumber: { 
    type: String 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  autoRenew: { 
    type: Boolean, 
    default: false 
  },
  status: {
    type: String,
    enum: ["active", "expired", "cancelled"],
    default: "active"
  },
  paymentId: { 
    type: String 
  },
  cancellationReason: { 
    type: String 
  },
  cancelledAt: { 
    type: Date 
  }
}, { timestamps: true });

subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ property: 1, status: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
