const mongoose = require("mongoose");

const parkingPropertySchema = new mongoose.Schema({
  rental: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  name: { type: String, required: true },
  address: { type: String, required: true },
  fullAddress: { type: String, required: true }, 
  contactNumber: { type: String, required: true }, 
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  photos: [{ type: String }], 
  carSlots: { type: Number, required: true },
  bikeSlots: { type: Number, required: true },
  pricePerHour: { type: Number, required: true },
  approved: { type: Boolean, default: false }, 
  active: { type: Boolean, default: true }, 
  
 
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
