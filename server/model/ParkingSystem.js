const mongoose = require("mongoose");

const parkingSystemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  totalSlots: { type: Number, required: true },
  pricePerHour: { type: Number, required: true },
  images: [{ type: String }], // Array of image URLs
  description: { type: String },
  amenities: [{ type: String }], // e.g., ["Security", "CCTV", "24/7 Access"]
  spaceType: { type: String, enum: ["Covered", "Open", "Underground"], default: "Open" },
  evCharger: { type: Boolean, default: false },
  maxHeight: { type: String }, // e.g., "2.5 meters"
  accessType: { type: String, enum: ["Key", "Remote", "Card", "App"], default: "Key" },
  maxVehicleSize: { type: String, enum: ["Small Car", "Large Car", "SUV", "Truck"], default: "Large Car" },
  dimensions: {
    length: { type: Number }, // in meters
    width: { type: Number }   // in meters
  },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

parkingSystemSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("ParkingSystem", parkingSystemSchema);
