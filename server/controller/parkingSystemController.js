const ParkingSystem = require("../model/ParkingSystem");
const ParkingSlot = require("../model/ParkingSlot");

// Admin: Add a new parking system
exports.addParkingSystem = async (req, res) => {
  try {
    const { 
      name, 
      address, 
      lat, 
      lng, 
      totalSlots, 
      pricePerHour,
      images,
      description,
      amenities,
      spaceType,
      evCharger,
      maxHeight,
      accessType,
      maxVehicleSize,
      length,
      width
    } = req.body;
    
    const createdBy = req.user._id;
    const parkingSystem = await ParkingSystem.create({
      name,
      address,
      location: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
      totalSlots,
      pricePerHour,
      images: images || [],
      description,
      amenities: amenities || [],
      spaceType,
      evCharger: evCharger || false,
      maxHeight,
      accessType,
      maxVehicleSize,
      dimensions: {
        length: parseFloat(length) || 0,
        width: parseFloat(width) || 0
      },
      createdBy
    });
    
    // Create slots for this system
    for (let i = 1; i <= totalSlots; i++) {
      await ParkingSlot.create({
        parkingSystem: parkingSystem._id,
        slotNumber: `S${i}`,
        isBooked: false,
        pricePerHour
      });
    }
    
    res.status(201).json({ message: "Parking system created", parkingSystem });
  } catch (err) {
    console.error("Add Parking System Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// User: Search parking systems by location (within specified radius)
exports.searchNearby = async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // default 5km radius
    
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }
    
    const systems = await ParkingSystem.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          distanceField: "distance",
          maxDistance: parseInt(radius),
          spherical: true
        }
      },
      {
        $lookup: {
          from: "parkingslots",
          localField: "_id",
          foreignField: "parkingSystem",
          as: "slots"
        }
      },
      {
        $addFields: {
          availableSlots: {
            $size: {
              $filter: {
                input: "$slots",
                cond: { $eq: ["$$this.isBooked", false] }
              }
            }
          },
          totalSlotsCount: { $size: "$slots" }
        }
      },
      {
        $project: {
          slots: 0 // Remove slots array from response to reduce payload
        }
      },
      {
        $sort: { distance: 1 } // Sort by nearest first
      }
    ]);
    
    res.json(systems);
  } catch (err) {
    console.error("Search Nearby Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get all parking systems with available slots (for general browsing)
exports.getAllParkingSystems = async (req, res) => {
  try {
    const systems = await ParkingSystem.aggregate([
      {
        $lookup: {
          from: "parkingslots",
          localField: "_id",
          foreignField: "parkingSystem",
          as: "slots"
        }
      },
      {
        $addFields: {
          availableSlots: {
            $size: {
              $filter: {
                input: "$slots",
                cond: { $eq: ["$$this.isBooked", false] }
              }
            }
          },
          totalSlotsCount: { $size: "$slots" }
        }
      },
      {
        $project: {
          slots: 0 // Remove slots array from response to reduce payload
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);
    
    res.json(systems);
  } catch (err) {
    console.error("Get All Parking Systems Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get all slots for a parking system
exports.getSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const slots = await ParkingSlot.find({ parkingSystem: id });
    res.json(slots);
  } catch (err) {
    console.error("Get Slots Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
