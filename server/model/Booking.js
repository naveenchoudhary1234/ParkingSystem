const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  slot: { type: mongoose.Schema.Types.Mixed, required: true }, // Can be ObjectId or string (for layout slots)
  property: { type: mongoose.Schema.Types.ObjectId, ref: "ParkingProperty", required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
  slotInfo: { type: mongoose.Schema.Types.Mixed } // Store additional slot information
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
