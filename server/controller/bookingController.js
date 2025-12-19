const Booking = require("../model/Booking");
const ParkingSlot = require("../model/ParkingSlot");
const PropertySlot = require("../model/PropertySlot");

// CREATE BOOKING
exports.createBooking = async (req, res) => {
  try {
    const { slot, property, hours, totalAmount, startTime, endTime } = req.body;
    
    console.log("🎯 Creating booking with data:", { slot, property, hours, totalAmount });

    // For new visual layout system, we need to extract slot info from the slot object
    const slotId = slot?.id || slot?._id || slot;
    const slotData = typeof slot === 'object' ? slot : null;
    
    console.log("🔍 Extracted slot ID:", slotId, "Slot data:", slotData);

    // Find the parking property and check the layout data
    const ParkingProperty = require("../model/ParkingProperty");
    const parkingProperty = await ParkingProperty.findById(property);
    if (!parkingProperty) {
      return res.status(404).json({ message: "Parking property not found" });
    }

    // Check if slot exists in the layout data
    let slotExists = false;
    let slotInfo = null;
    
    if (parkingProperty.layoutData && parkingProperty.layoutData.slots) {
      slotInfo = parkingProperty.layoutData.slots[slotId];
      slotExists = !!slotInfo;
    }
    
    // Fallback: check if it's a legacy PropertySlot
    if (!slotExists) {
      try {
        const propertySlot = await PropertySlot.findById(slotId);
        if (propertySlot) {
          slotExists = true;
          slotInfo = propertySlot;
          console.log("📋 Using legacy PropertySlot:", propertySlot);
        }
      } catch (err) {
        console.log("🔍 Not a valid ObjectId, continuing with layout slot");
      }
    }

    if (!slotExists) {
      return res.status(404).json({ message: "Parking slot not found" });
    }

    // Check if slot is available (for layout-based slots)
    if (slotInfo?.status === 'booked' || slotInfo?.isBooked) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = endTime ? new Date(endTime) : new Date(Date.now() + hours * 60 * 60 * 1000);

    const booking = new Booking({
      user: req.user.id,
      slot: slotId, // Store the slot ID/reference
      property: property,
      startTime: start,
      endTime: end,
      totalAmount,
      status: "confirmed",
      // Store additional slot info for reference
      slotInfo: slotData || slotInfo
    });

    await booking.save();

    // Mark slot as booked in the layout data
    if (parkingProperty.layoutData && parkingProperty.layoutData.slots && parkingProperty.layoutData.slots[slotId]) {
      parkingProperty.layoutData.slots[slotId].status = 'booked';
      await parkingProperty.save();
      console.log("✅ Slot marked as booked in layout data");
    } else if (slotInfo?.isBooked !== undefined) {
      // Legacy PropertySlot update
      slotInfo.isBooked = true;
      await slotInfo.save();
      console.log("✅ Legacy slot marked as booked");
    }

    res.json({ message: "Booking created successfully", booking });
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET ALL BOOKINGS OF USER
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id });
    
    // Populate both slot and property information
    const populatedBookings = [];
    
    for (const booking of bookings) {
      const PropertySlot = require("../model/PropertySlot");
      const ParkingProperty = require("../model/ParkingProperty");
      
      let slotInfo = null;
      let propertyDetails = null;
      
      // First, get property details (we store property ID directly in booking now)
      if (booking.property) {
        propertyDetails = await ParkingProperty.findById(booking.property);
      }
      
      // Try to get slot details - handle both layout-based and legacy slots
      const slotId = booking.slot;
      
      // Check if it's a layout-based slot (string ID like "0-4")
      if (typeof slotId === 'string' && !slotId.match(/^[0-9a-fA-F]{24}$/)) {
        // Layout-based slot - get from property's layoutData
        if (propertyDetails?.layoutData?.slots?.[slotId]) {
          slotInfo = propertyDetails.layoutData.slots[slotId];
          console.log("📋 Found layout slot:", slotId, slotInfo);
        } else if (booking.slotInfo) {
          // Fallback to stored slotInfo from booking
          slotInfo = booking.slotInfo;
          console.log("📋 Using stored slot info:", slotInfo);
        }
      } else {
        // Legacy PropertySlot - try to find by ObjectId
        try {
          const legacySlot = await PropertySlot.findById(slotId);
          if (legacySlot) {
            slotInfo = legacySlot;
            if (!propertyDetails && legacySlot.property) {
              propertyDetails = await ParkingProperty.findById(legacySlot.property);
            }
            console.log("📋 Found legacy slot:", legacySlot);
          }
        } catch (err) {
          console.log("⚠️ Could not find legacy slot:", slotId);
        }
      }
      
      // Calculate hours
      const hours = Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60));
      
      // Format the booking with all necessary info
      const formattedBooking = {
        ...booking.toObject(),
        hours: hours,
        propertyName: propertyDetails?.name || 'Unknown Property',
        propertyAddress: propertyDetails?.fullAddress || propertyDetails?.address || '',
        propertyContact: propertyDetails?.contactNumber || '',
        slotNumber: slotInfo?.slotNumber || slotInfo?.id || 'N/A',
        coordinates: propertyDetails?.location?.coordinates || null,
        slotType: slotInfo?.vehicleType || slotInfo?.type || 'unknown',
        property: propertyDetails ? {
          _id: propertyDetails._id,
          name: propertyDetails.name,
          address: propertyDetails.address,
          fullAddress: propertyDetails.fullAddress,
          contactNumber: propertyDetails.contactNumber,
          location: propertyDetails.location,
          coordinates: propertyDetails.location?.coordinates
        } : null
      };
      
      populatedBookings.push(formattedBooking);
    }
    
    res.json(populatedBookings);
  } catch (error) {
    console.error("Get Bookings Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// CANCEL BOOKING
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    booking.status = "cancelled";
    await booking.save();

    // Free the parking slot
    const slot = await ParkingSlot.findById(booking.slot);
    if (slot) {
      slot.isBooked = false;
      await slot.save();
    }

    res.json({ message: "Booking cancelled", booking });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET ALL BOOKINGS (ADMIN)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("slot user");
    res.json(bookings);
  } catch (error) {
    console.error("Get All Bookings Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
