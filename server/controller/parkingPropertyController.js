const ParkingProperty = require("../model/ParkingProperty");
const Booking = require("../model/Booking");
const PropertySlot = require("../model/PropertySlot");

// Rental: Add a new parking property
exports.addProperty = async (req, res) => {
  try {
    console.log("🔍 DEBUG: addProperty called with request body:", JSON.stringify(req.body, null, 2));
    console.log("👤 DEBUG: User from token:", req.user);
    
    const { name, address, fullAddress, contactNumber, carSlots, bikeSlots, pricePerHour, photos, location, layoutData } = req.body;
    const rentalId = req.user._id || req.user.id;
    
    console.log("🆔 DEBUG: Rental ID extracted:", rentalId);
    console.log("📍 DEBUG: Address data received:", {
      address: address,
      fullAddress: fullAddress,
      isSelectedLocation: fullAddress === "Selected location",
      isPropertyLocation: fullAddress === "Property location"
    });
    
    console.log("🆔 DEBUG: Rental ID extracted:", rentalId);
    
    if (!rentalId) throw new Error("Rental ID is required");
    if (!contactNumber) throw new Error("Contact number is required");
    if (!fullAddress || fullAddress.trim().length < 10) {
      throw new Error("Complete address is required (minimum 10 characters) for user navigation");
    }
    
    // Validate coordinates are within valid range and reasonable for India
    const [lng, lat] = location.coordinates;
    console.log("📍 DEBUG: Coordinates extracted - lng:", lng, "lat:", lat);
    
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new Error("Invalid coordinates. Please select a valid address from the search results.");
    }
    
    // Additional validation for reasonable coordinates in India
    if (lng < 68 || lng > 97 || lat < 8 || lat > 37) {
      console.warn("⚠️  WARNING: Coordinates seem to be outside India region");
      console.warn(`  Provided: lng=${lng}, lat=${lat}`);
      console.warn("  Expected India range: lng=68-97, lat=8-37");
    }
    
    console.log("📝 DEBUG: Creating property with data:");
    console.log("  - name:", name);
    console.log("  - address:", address);
    console.log("  - fullAddress:", fullAddress);
    console.log("  - contactNumber:", contactNumber);
    console.log("  - location:", location);
    console.log("  - photos count:", photos ? photos.length : 0);
    console.log("  - carSlots:", carSlots);
    console.log("  - bikeSlots:", bikeSlots);
    console.log("  - pricePerHour:", pricePerHour);
    console.log("  - layoutData provided:", !!layoutData);
    
    const property = await ParkingProperty.create({
      rental: rentalId,
      name,
      address,
      fullAddress,
      contactNumber,
      location,
      photos: photos || [],
      carSlots,
      bikeSlots,
      pricePerHour,
      layoutData: layoutData || null
    });
    
    console.log("✅ DEBUG: Property created successfully with ID:", property._id);
    console.log("📋 DEBUG: Full property object:", JSON.stringify(property, null, 2));
    
    res.status(201).json({ message: "Parking property submitted for owner approval", property });
  } catch (err) {
    console.error("Add Property Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// User: Search parking properties by location (within specified radius)
exports.searchNearby = async (req, res) => {
  try {
    const { lat, lng, radius = 40000 } = req.query; // Default 40km radius
    
    console.log(`🔍 Searching nearby properties at lat=${lat}, lng=${lng}, radius=${radius}m`);
    console.log(`🔍 Parsed coordinates: lat=${parseFloat(lat)}, lng=${parseFloat(lng)}`);
    console.log(`🔍 Search point for MongoDB: [${parseFloat(lng)}, ${parseFloat(lat)}] (lng,lat format)`);
    
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }
    
    // First, let's check all approved properties to debug
    const allApproved = await ParkingProperty.find({ approved: true });
    console.log(`📊 Total approved properties in database: ${allApproved.length}`);
    
    allApproved.forEach((prop, index) => {
      const [propLng, propLat] = prop.location.coordinates;
      console.log(`  Property ${index + 1}: ${prop.name} at [${propLng}, ${propLat}] (lng,lat)`);
      
      // Calculate distance manually for debugging
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const R = 6371000; // Earth's radius in meters
      const dLat = (propLat - userLat) * Math.PI / 180;
      const dLon = (propLng - userLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(propLat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      console.log(`    Manual calculation: ${Math.round(distance)}m from user location`);
      console.log(`    Within ${radius}m radius? ${distance <= parseInt(radius) ? 'YES' : 'NO'}`);
    });
    
    // Check if we have the 2dsphere index
    const indexes = await ParkingProperty.collection.getIndexes();
    console.log(`📑 Available indexes:`, Object.keys(indexes));
    
    console.log(`🔍 Executing MongoDB $geoNear aggregation...`);
    const properties = await ParkingProperty.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          distanceField: "distance",
          maxDistance: parseInt(radius),
          spherical: true,
          query: { approved: true, active: { $ne: false } } // Only approved and active properties
        }
      },
      {
        $addFields: {
          lat: { $arrayElemAt: ["$location.coordinates", 1] },
          lng: { $arrayElemAt: ["$location.coordinates", 0] }
        }
      },
      {
        $sort: { distance: 1 } // Sort by nearest first
      }
    ]);
    
    console.log(`✅ MongoDB aggregation completed. Found ${properties.length} nearby approved properties`);
    
    console.log(`✅ Found ${properties.length} nearby approved properties`);
    console.log(`🎯 Search coordinates used: [${lng}, ${lat}] (lng,lat format for GeoJSON)`);
    
    properties.forEach((prop, index) => {
      console.log(`  Match ${index + 1}: ${prop.name} at distance ${Math.round(prop.distance)}m`);
    });
    
    res.json(properties);
  } catch (err) {
    console.error("❌ Search Nearby Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Owner: Approve property
exports.approveProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user._id || req.user.id;
    
    const property = await ParkingProperty.findByIdAndUpdate(
      id, 
      { approved: true, owner: ownerId }, 
      { new: true }
    );
    
    // Create slots for this property if not already created
    const PropertySlot = require("../model/PropertySlot");
    const existingSlots = await PropertySlot.find({ property: id });
    if (existingSlots.length === 0) {
      // Car slots
      for (let i = 1; i <= property.carSlots; i++) {
        await PropertySlot.create({
          property: id,
          slotNumber: `Car-${i}`,
          type: "car",
          isBooked: false,
          pricePerHour: property.pricePerHour
        });
      }
      // Bike slots
      for (let i = 1; i <= property.bikeSlots; i++) {
        await PropertySlot.create({
          property: id,
          slotNumber: `Bike-${i}`,
          type: "bike",
          isBooked: false,
          pricePerHour: property.pricePerHour
        });
      }
    }
    res.json({ message: "Property approved", property });
  } catch (err) {
    console.error("Approve Property Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Owner: Toggle property active status
exports.togglePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    // Find and update the property
    const property = await ParkingProperty.findByIdAndUpdate(
      id,
      { active: active },
      { new: true }
    );
    
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    
    res.json({ 
      message: `Property ${active ? 'activated' : 'deactivated'} successfully`,
      property: property
    });
  } catch (err) {
    console.error("Toggle Property Status Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Owner: Delete property
exports.deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if property exists
    const property = await ParkingProperty.findById(id);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    
    // Delete associated bookings first
    const Booking = require("../model/Booking");
    await Booking.deleteMany({ property: id });
    
    // Delete associated slots
    const PropertySlot = require("../model/PropertySlot");
    await PropertySlot.deleteMany({ property: id });
    
    // Delete the property
    await ParkingProperty.findByIdAndDelete(id);
    
    res.json({ message: "Property deleted successfully" });
  } catch (err) {
    console.error("Delete Property Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get all approved properties for users
exports.getApprovedProperties = async (req, res) => {
  try {
    const properties = await ParkingProperty.find({ 
      approved: true, 
      active: { $ne: false } 
    });
    res.json(properties);
  } catch (err) {
    console.error("Get Approved Properties Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get rental's own properties
exports.getMyProperties = async (req, res) => {
  try {
    const rentalId = req.user._id || req.user.id;
    const properties = await ParkingProperty.find({ rental: rentalId });
    res.json(properties);
  } catch (err) {
    console.error("Get My Properties Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get pending properties for owner approval
exports.getPendingProperties = async (req, res) => {
  try {
    const properties = await ParkingProperty.find({ approved: false }).populate('rental', 'name email');
    res.json(properties);
  } catch (err) {
    console.error("Get Pending Properties Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get single property by ID for booking
exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await ParkingProperty.findById(id);
    
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    
    if (!property.approved) {
      return res.status(400).json({ error: "Property is not approved yet" });
    }
    
    console.log("📋 Property details fetched:", property);
    res.json(property);
  } catch (err) {
    console.error("Get Property By ID Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get available slots for a property with real-time availability
exports.getPropertySlots = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if property exists and is approved
    const property = await ParkingProperty.findById(id);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    
    if (!property.approved) {
      return res.status(400).json({ error: "Property is not approved yet" });
    }
    
    // Check if property has layout data (new system)
    if (property.layoutData && property.layoutData.slots) {
      console.log(`🅿️ Using layout-based slots for property ${property.name}`);
      
      // Get active bookings for this property
      const activeBookings = await Booking.find({
        property: id,
        status: { $in: ['pending', 'confirmed', 'active'] },
        endTime: { $gt: new Date() } // Only future bookings
      });
      
      console.log(`📋 Found ${activeBookings.length} active bookings for property`);
      
      // Get booked slot IDs
      const bookedSlotIds = new Set(activeBookings.map(booking => booking.slot));
      
      // Convert layout slots to array format with real-time availability
      const slotsArray = Object.entries(property.layoutData.slots).map(([slotId, slotData]) => ({
        _id: slotId,
        slotNumber: slotData.slotNumber,
        type: slotData.vehicleType,
        pricePerHour: slotData.pricePerHour || property.pricePerHour,
        property: id,
        isBooked: bookedSlotIds.has(slotId) || slotData.status === 'booked',
        isAvailable: !bookedSlotIds.has(slotId) && slotData.status !== 'booked',
        status: bookedSlotIds.has(slotId) ? 'booked' : slotData.status || 'available'
      }));
      
      console.log(`✅ Returning ${slotsArray.length} layout-based slots`);
      return res.json(slotsArray);
    }
    
    // Fallback to old PropertySlot system for legacy properties
    const PropertySlot = require("../model/PropertySlot");
    const slots = await PropertySlot.find({ property: id });
    console.log(`🅿️ Using legacy PropertySlots for property ${property.name} - found ${slots.length} slots`);
    
    // Get active bookings for these slots
    const activeBookings = await Booking.find({
      slot: { $in: slots.map(slot => slot._id) },
      status: { $in: ['pending', 'confirmed', 'active'] },
      endTime: { $gt: new Date() } // Only future bookings
    });
    
    console.log(`📋 Found ${activeBookings.length} active bookings for legacy slots`);
    
    // Mark booked slots
    const bookedSlotIds = new Set(activeBookings.map(booking => booking.slot.toString()));
    
    // Add availability status to each slot
    const slotsWithAvailability = slots.map(slot => ({
      ...slot.toObject(),
      isBooked: bookedSlotIds.has(slot._id.toString()),
      isAvailable: !bookedSlotIds.has(slot._id.toString())
    }));
    
    res.json(slotsWithAvailability);
  } catch (err) {
    console.error("Get Property Slots Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get all parking properties (for general use) with real-time availability
exports.getAllProperties = async (req, res) => {
  try {
    console.log("🔍 DEBUG: getAllProperties called - fetching all properties with availability");
    
    const properties = await ParkingProperty.find();
    
    console.log("📊 DEBUG: Total properties found:", properties.length);
    
    // Calculate real-time availability for each property
    const propertiesWithAvailability = await Promise.all(properties.map(async (property) => {
      try {
        // Get all slots for this property
        const PropertySlot = require("../model/PropertySlot");
        const allSlots = await PropertySlot.find({ property: property._id });
        
        // Get active bookings (not cancelled)
        const activeBookings = await Booking.find({
          slot: { $in: allSlots.map(slot => slot._id) },
          status: { $in: ['pending', 'confirmed', 'active'] },
          endTime: { $gt: new Date() } // Only future bookings
        });
        
        // Calculate availability by vehicle type
        const carSlots = allSlots.filter(slot => slot.type === 'car');
        const bikeSlots = allSlots.filter(slot => slot.type === 'bike');
        
        const bookedCarSlots = activeBookings.filter(booking => {
          const slot = allSlots.find(s => s._id.toString() === booking.slot.toString());
          return slot && slot.type === 'car';
        }).length;
        
        const bookedBikeSlots = activeBookings.filter(booking => {
          const slot = allSlots.find(s => s._id.toString() === booking.slot.toString());
          return slot && slot.type === 'bike';
        }).length;
        
        const availableCarSlots = Math.max(0, property.carSlots - bookedCarSlots);
        const availableBikeSlots = Math.max(0, property.bikeSlots - bookedBikeSlots);
        
        return {
          ...property.toObject(),
          availability: {
            carSlots: {
              total: property.carSlots,
              booked: bookedCarSlots,
              available: availableCarSlots
            },
            bikeSlots: {
              total: property.bikeSlots,
              booked: bookedBikeSlots,
              available: availableBikeSlots
            }
          },
          isAvailable: availableCarSlots > 0 || availableBikeSlots > 0
        };
      } catch (error) {
        console.error(`Error calculating availability for property ${property._id}:`, error);
        // Return property with zero availability on error
        return {
          ...property.toObject(),
          availability: {
            carSlots: { total: property.carSlots, booked: 0, available: property.carSlots },
            bikeSlots: { total: property.bikeSlots, booked: 0, available: property.bikeSlots }
          },
          isAvailable: true
        };
      }
    }));
    
    console.log("📋 DEBUG: Properties with availability calculated");
    const pending = propertiesWithAvailability.filter(p => !p.approved);
    const approved = propertiesWithAvailability.filter(p => p.approved);
    console.log("  - Pending properties:", pending.length);
    console.log("  - Approved properties:", approved.length);
    
    if (propertiesWithAvailability.length > 0) {
      console.log("🏠 DEBUG: Sample property with availability:", {
        name: propertiesWithAvailability[0].name,
        availability: propertiesWithAvailability[0].availability
      });
    }
    
    res.json(propertiesWithAvailability);
  } catch (err) {
    console.error("❌ DEBUG: Get All Properties Error:", err.message);
    console.error("🔍 DEBUG: Full error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Owner: View bookings for their property
exports.getBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await Booking.find({ parking: id }).populate("user");
    res.json(bookings);
  } catch (err) {
    console.error("Get Bookings Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Rental: Get dashboard statistics
exports.getRentalStats = async (req, res) => {
  try {
    const rentalId = req.user._id || req.user.id;
    console.log("📊 DEBUG: Getting rental stats for:", rentalId);
    
    // Get all properties owned by this rental
    const properties = await ParkingProperty.find({ rental: rentalId });
    
    if (properties.length === 0) {
      return res.json({
        totalProperties: 0,
        totalCarSlots: 0,
        totalBikeSlots: 0,
        totalBookings: 0,
        activeBookings: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        carsBooked: 0,
        bikesBooked: 0,
        occupancyRate: 0
      });
    }
    
    // Calculate totals
    const totalCarSlots = properties.reduce((sum, p) => sum + p.carSlots, 0);
    const totalBikeSlots = properties.reduce((sum, p) => sum + p.bikeSlots, 0);
    
    // Get all slots for these properties
    const PropertySlot = require("../model/PropertySlot");
    const allSlots = await PropertySlot.find({ 
      property: { $in: properties.map(p => p._id) } 
    });
    
    // Get all bookings for these slots
    const allBookings = await Booking.find({
      slot: { $in: allSlots.map(slot => slot._id) }
    });
    
    // Calculate active bookings (not cancelled, not expired)
    const now = new Date();
    const activeBookings = allBookings.filter(booking => 
      booking.status !== 'cancelled' && new Date(booking.endTime) > now
    );
    
    // Calculate this month's data
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthBookings = allBookings.filter(booking => 
      new Date(booking.createdAt) >= thisMonth
    );
    
    // Calculate revenue
    const totalRevenue = allBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    const monthlyRevenue = thisMonthBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    // Calculate cars and bikes currently booked
    const currentlyBooked = activeBookings.filter(booking => {
      const slot = allSlots.find(s => s._id.toString() === booking.slot.toString());
      return slot;
    });
    
    const carsBooked = currentlyBooked.filter(booking => {
      const slot = allSlots.find(s => s._id.toString() === booking.slot.toString());
      return slot && slot.type === 'car';
    }).length;
    
    const bikesBooked = currentlyBooked.filter(booking => {
      const slot = allSlots.find(s => s._id.toString() === booking.slot.toString());
      return slot && slot.type === 'bike';
    }).length;
    
    // Calculate occupancy rate
    const totalSlots = totalCarSlots + totalBikeSlots;
    const occupancyRate = totalSlots > 0 ? ((carsBooked + bikesBooked) / totalSlots * 100) : 0;
    
    const stats = {
      totalProperties: properties.length,
      totalCarSlots,
      totalBikeSlots,
      totalBookings: allBookings.length,
      activeBookings: activeBookings.length,
      totalRevenue,
      monthlyRevenue,
      carsBooked,
      bikesBooked,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      availableCarSlots: totalCarSlots - carsBooked,
      availableBikeSlots: totalBikeSlots - bikesBooked
    };
    
    console.log("📈 DEBUG: Rental stats calculated:", stats);
    res.json(stats);
    
  } catch (error) {
    console.error("❌ Error getting rental stats:", error);
    res.status(500).json({ error: error.message });
  }
};

// Geocoding helper endpoint
exports.searchPlaces = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 3) {
      return res.json([]);
    }

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=IN&limit=5`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    
    const formattedResults = data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: item.display_name
    }));
    
    res.json(formattedResults);
  } catch (err) {
    console.error("Search Places Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Update parking property layout
exports.updatePropertyLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { layoutData } = req.body;
    const userId = req.user?.id || req.user?._id; // Fix: Get user ID from req.user

    console.log("🎯 Updating layout for property:", id, "by user:", userId);
    console.log("🔍 DEBUG: req.user =", req.user);

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Find the property and check ownership
    const property = await ParkingProperty.findById(id);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    console.log("🏢 Property found:", property.name, "owned by:", property.rental.toString());

    // Check if user is the rental owner of this property
    if (property.rental.toString() !== userId.toString()) {
      console.log("❌ Authorization failed: User", userId, "is not owner of property owned by", property.rental.toString());
      return res.status(403).json({ error: "Not authorized to update this property" });
    }

    // Update the layout data using findByIdAndUpdate to avoid full validation
    const updatedProperty = await ParkingProperty.findByIdAndUpdate(
      id,
      { layoutData: layoutData },
      { 
        new: true, 
        runValidators: false // Skip validation for other required fields
      }
    );

    console.log("✅ Layout updated successfully for property:", updatedProperty.name);

    res.json({
      message: "Layout updated successfully",
      property: updatedProperty
    });

  } catch (err) {
    console.error("Update Layout Error:", err.message);
    console.error("Full error:", err);
    res.status(500).json({ error: err.message });
  }
};
