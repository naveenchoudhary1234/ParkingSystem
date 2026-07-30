const Booking = require("../model/Booking");
const ParkingSlot = require("../model/ParkingSlot");
const PropertySlot = require("../model/PropertySlot");
const { awardPointsForBooking } = require("../services/rewardsService");
const { sendNotification } = require("../services/notificationService");

// ✅ CREATE BOOKING WITH WALLET
exports.createBookingWithWallet = async (req, res, next) => {
  try {
    const { slot, property, hours, totalAmount } = req.body;
    const User = require("../model/User");
    const WalletTransaction = require("../model/WalletTransaction");
    const ParkingProperty = require("../model/ParkingProperty");

    // Check wallet balance
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new (require("../util/ApiError"))(404, "User not found"));
    }

    if ((user.wallet || 0) < totalAmount) {
      return next(new (require("../util/ApiError"))(400, "Insufficient wallet balance"));
    }

    // Get property and slot
    const parkingProperty = await ParkingProperty.findById(property);
    if (!parkingProperty) {
      return next(new (require("../util/ApiError"))(404, "Parking property not found"));
    }

    const slotId = slot?.id || slot?._id || slot;
    let slotInfo = null;

    if (parkingProperty.layoutData && parkingProperty.layoutData.slots) {
      slotInfo = parkingProperty.layoutData.slots[slotId];
      if (!slotInfo) {
        return next(new (require("../util/ApiError"))(404, "Slot not found"));
      }
      if (slotInfo.status === 'booked' || slotInfo.isBooked) {
        return next(new (require("../util/ApiError"))(400, "Slot already booked"));
      }
    }

    // Deduct from wallet
    user.wallet -= totalAmount;
    await user.save();

    // Create wallet transaction
    await WalletTransaction.create({
      user: user._id,
      type: "debit",
      amount: totalAmount,
      description: `Parking booking at ${parkingProperty.name}`,
      balanceAfter: user.wallet,
      status: "completed"
    });

    // Create booking
    const start = new Date();
    const end = new Date(Date.now() + hours * 60 * 60 * 1000);

    const booking = new Booking({
      user: req.user.id,
      slot: slotId,
      property: property,
      startTime: start,
      endTime: end,
      totalAmount,
      status: "confirmed",
      slotInfo: slotInfo || { slotNumber: slotId }
    });

    await booking.save();

    // Mark slot as booked
    if (parkingProperty.layoutData && parkingProperty.layoutData.slots && parkingProperty.layoutData.slots[slotId]) {
      parkingProperty.layoutData.slots[slotId].status = 'booked';
      parkingProperty.layoutData.slots[slotId].isBooked = true;
      await parkingProperty.save();
    }

    // ✅ Award loyalty points for completed booking
    const rewardResult = await awardPointsForBooking(req.user.id, totalAmount);

    // ✅ Send booking confirmation notification
    console.log("🔔 Sending booking confirmation notification to user:", req.user.id);
    try {
      const notificationResult = await sendNotification(req.user.id, {
        type: 'booking_confirmed',
        title: '🎉 Booking Confirmed!',
        message: `Your parking slot at ${parkingProperty.name} has been confirmed. Booking ID: ${booking._id.toString().slice(-6).toUpperCase()}`,
        priority: 'high',
        relatedBooking: booking._id,
        relatedProperty: parkingProperty._id,
        actionUrl: '/bookings',
        actionText: 'View Booking'
      });
      console.log("✅ Notification sent successfully:", notificationResult ? "Created" : "Failed");
    } catch (notifError) {
      console.error("❌ Notification error:", notifError);
    }

    // ✅ Schedule reminder notification (15 mins before booking ends)
    const reminderTime = new Date(booking.endTime.getTime() - 15 * 60 * 1000);
    if (reminderTime > new Date()) {
      setTimeout(async () => {
        await sendNotification(req.user.id, {
          type: 'booking_ending_soon',
          title: '⏰ Parking Ending Soon',
          message: `Your parking at ${parkingProperty.name} ends in 15 minutes. Please return to your vehicle.`,
          priority: 'urgent',
          relatedBooking: booking._id,
          actionUrl: '/bookings',
          actionText: 'Extend Booking'
        });
      }, reminderTime.getTime() - Date.now());
    }

    res.json({
      success: true,
      message: "Booking created successfully via wallet",
      booking,
      walletBalance: user.wallet,
      loyaltyPoints: rewardResult ? {
        earned: rewardResult.pointsEarned,
        total: rewardResult.totalPoints,
        tier: rewardResult.tier.name,
        discount: rewardResult.tier.discount
      } : null
    });
  } catch (error) {
    console.error("Create Wallet Booking Error:", error);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server Error"));
  }
};

// CREATE BOOKING
exports.createBooking = async (req, res, next) => {
  try {
    const { slot, property, hours, totalAmount, startTime, endTime } = req.body;

    console.log("Creating booking with data:", { slot, property, hours, totalAmount });

    const slotId = slot?.id || slot?._id || slot;
    const slotData = typeof slot === 'object' ? slot : null;

    console.log("🔍 Extracted slot ID:", slotId, "Slot data:", slotData);

    
    const ParkingProperty = require("../model/ParkingProperty");
    const parkingProperty = await ParkingProperty.findById(property);
    if (!parkingProperty) {
      return next(new (require("../util/ApiError"))(404, "Parking property not found"));
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
      return next(new (require("../util/ApiError"))(404, "Parking slot not found"));
    }


    if (slotInfo?.status === 'booked' || slotInfo?.isBooked) {
      return next(new (require("../util/ApiError"))(400, "Slot already booked"));
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = endTime ? new Date(endTime) : new Date(Date.now() + hours * 60 * 60 * 1000);

    const booking = new Booking({
      user: req.user.id,
      slot: slotId, 
      property: property,
      startTime: start,
      endTime: end,
      totalAmount,
      status: "confirmed",
      slotInfo: slotData || slotInfo
    });

    await booking.save();

    if (parkingProperty.layoutData && parkingProperty.layoutData.slots && parkingProperty.layoutData.slots[slotId]) {
      parkingProperty.layoutData.slots[slotId].status = 'booked';
      await parkingProperty.save();
      console.log("✅ Slot marked as booked in layout data");
    } else if (slotInfo?.isBooked !== undefined) {
      
      slotInfo.isBooked = true;
      await slotInfo.save();
      console.log("✅ Legacy slot marked as booked");
    }

    res.json({ success: true, message: "Booking created successfully", booking });
  } catch (error) {
    console.error("Create Booking Error:", error);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server Error"));
  }
};

// GET ALL BOOKINGS OF USER
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user.id });
    
   
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
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server Error"));
  }
};

// CANCEL BOOKING
exports.cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const User = require("../model/User");
    const WalletTransaction = require("../model/WalletTransaction");
    const ParkingProperty = require("../model/ParkingProperty");

    const booking = await Booking.findById(bookingId).populate('property');
    if (!booking) return next(new (require("../util/ApiError"))(404, "Booking not found"));

    if (booking.user.toString() !== req.user.id)
      return next(new (require("../util/ApiError"))(403, "Not authorized"));

    // Check if booking is already cancelled
    if (booking.status === "cancelled") {
      return next(new (require("../util/ApiError"))(400, "Booking is already cancelled"));
    }

    // Check 10-minute cancellation window
    const bookingCreatedAt = new Date(booking.createdAt);
    const now = new Date();
    const diffMinutes = (now - bookingCreatedAt) / (1000 * 60);

    if (diffMinutes > 10) {
      return next(new (require("../util/ApiError"))(400, "Cancellation window expired. You can only cancel within 10 minutes of booking."));
    }

    // Update booking status
    booking.status = "cancelled";
    await booking.save();

    // Free the parking slot in layout (if it's a layout slot)
    if (booking.property && booking.slotInfo) {
      const property = await ParkingProperty.findById(booking.property._id);
      if (property && property.layoutData && Array.isArray(property.layoutData)) {
        const slotToFree = property.layoutData.find(slot =>
          slot.slotNumber === booking.slotInfo.slotNumber ||
          slot.id === booking.slotInfo.id
        );

        if (slotToFree && slotToFree.isBooked) {
          slotToFree.isBooked = false;
          await property.save();
          console.log(`✅ Slot ${slotToFree.slotNumber} freed in property ${property.name}`);
        }
      } else {
        console.log('⚠️ LayoutData is not an array or does not exist, skipping slot freeing in layout');
      }
    }

    // Free the parking slot (legacy slot system)
    try {
      const slot = await ParkingSlot.findById(booking.slot);
      if (slot) {
        slot.isBooked = false;
        await slot.save();
        console.log(`✅ Legacy slot freed`);
      }
    } catch (err) {
      // Slot might not exist in legacy system, that's okay
      console.log('Legacy slot not found, skipping...');
    }

    // Add refund amount to user's wallet
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new (require("../util/ApiError"))(404, "User not found"));
    }

    const refundAmount = booking.totalAmount;
    user.wallet = (user.wallet || 0) + refundAmount;
    await user.save();

    // Create wallet transaction record
    await WalletTransaction.create({
      user: user._id,
      type: "credit",
      amount: refundAmount,
      description: `Refund for cancelled booking at ${booking.property?.name || 'parking'}`,
      relatedBooking: booking._id,
      balanceAfter: user.wallet,
      status: "completed"
    });

    console.log(`💰 Refund of ₹${refundAmount} added to wallet. New balance: ₹${user.wallet}`);

    // ✅ Send cancellation notification
    console.log("🔔 Sending cancellation notification to user:", req.user.id);
    try {
      await sendNotification(req.user.id, {
        type: 'booking_cancelled',
        title: '❌ Booking Cancelled',
        message: `Your parking booking at ${booking.property?.name || 'parking location'} has been cancelled. ₹${refundAmount} has been refunded to your wallet.`,
        priority: 'medium',
        relatedBooking: booking._id,
        relatedProperty: booking.property?._id,
        actionUrl: '/profile',
        actionText: 'View Wallet'
      });
      console.log("✅ Cancellation notification sent");
    } catch (notifError) {
      console.error("❌ Cancellation notification error:", notifError);
    }

    res.json({
      success: true,
      message: `Booking cancelled successfully. ₹${refundAmount} has been added to your wallet.`,
      booking,
      walletBalance: user.wallet,
      refundAmount
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server Error"));
  }
};

// GET ALL BOOKINGS (ADMIN)
exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find().populate("slot user");
    res.json(bookings);
  } catch (error) {
    console.error("Get All Bookings Error:", error);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server Error"));
  }
};
