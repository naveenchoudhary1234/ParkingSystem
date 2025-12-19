const mongoose = require("mongoose");

const propertySlotSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: "ParkingProperty", required: true },
  slotNumber: { type: String, required: true },
  type: { type: String, enum: ["car", "bike"], required: true },
  isBooked: { type: Boolean, default: false },
  pricePerHour: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model("PropertySlot", propertySlotSchema);
