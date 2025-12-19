const mongoose = require("mongoose");

const parkingPropertySchema = new mongoose.Schema({
  rental: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Rental adds the property
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Owner who approves
  name: { type: String, required: true },
  address: { type: String, required: true },
  fullAddress: { type: String, required: true }, // Detailed address like "Sector 27, Rohini, Near Metro Station"
  contactNumber: { type: String, required: true }, // Rental's contact number for users to reach them
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  photos: [{ type: String }], // Array of photo URLs/paths
  carSlots: { type: Number, required: true },
  bikeSlots: { type: Number, required: true },
  pricePerHour: { type: Number, required: true },
  approved: { type: Boolean, default: false }, // Owner approval
  active: { type: Boolean, default: true }, // Property visibility to users (rental can stop/start)
  
  // New Visual Layout System
  layoutData: {
    templateId: { type: String }, // ID of the selected template (e.g., "efficient-grid")
    templateName: { type: String }, // Name of the template
    layout: [[Number]], // 2D array representing the layout grid
    slots: { type: Object }, // Object containing slot configurations
    entryExit: {
      entry: { type: String }, // Entry direction
      exit: { type: String }   // Exit direction
    },
    dimensions: {
      rows: { type: Number },
      cols: { type: Number }
    },
    totalSlots: { type: Number },
    availableSlots: { type: Number },
    carSlots: { type: Number },
    bikeSlots: { type: Number }
  }
}, { timestamps: true });

parkingPropertySchema.index({ location: "2dsphere" });

module.exports = mongoose.model("ParkingProperty", parkingPropertySchema);
