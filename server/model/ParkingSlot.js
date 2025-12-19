const mongoose = require("mongoose");

const parkingSlotSchema = new mongoose.Schema({
  parkingSystem: { type: mongoose.Schema.Types.ObjectId, ref: "ParkingSystem" },
  slotNumber: { type: String, required: true },
  isBooked: { type: Boolean, default: false },
  pricePerHour: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model("ParkingSlot", parkingSlotSchema);