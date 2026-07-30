const ParkingProperty = require("../model/ParkingProperty");
const Booking = require("../model/Booking");
const ApiError = require("../util/ApiError");

// GET REAL-TIME AVAILABILITY
exports.getLiveAvailability = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const property = await ParkingProperty.findById(propertyId);
    if (!property) {
      return next(new ApiError(404, "Property not found"));
    }

    // Count active bookings
    const now = new Date();
    const activeBookings = await Booking.countDocuments({
      property: propertyId,
      status: 'confirmed',
      startTime: { $lte: now },
      endTime: { $gte: now }
    });

    // Calculate availability
    const totalSlots = (property.carSlots || 0) + (property.bikeSlots || 0);
    const availableSlots = Math.max(0, totalSlots - activeBookings);
    const occupancyRate = totalSlots > 0 ? ((activeBookings / totalSlots) * 100).toFixed(1) : 0;

    // Determine status
    let status = 'available';
    let urgencyMessage = null;

    if (availableSlots === 0) {
      status = 'full';
      urgencyMessage = 'No slots available';
    } else if (availableSlots <= 3) {
      status = 'limited';
      urgencyMessage = `Only ${availableSlots} slot${availableSlots > 1 ? 's' : ''} left!`;
    } else if (availableSlots <= 10) {
      status = 'filling';
      urgencyMessage = `${availableSlots} slots available`;
    }

    // Get detailed slot availability
    let slotDetails = null;
    if (property.layoutData && Array.isArray(property.layoutData)) {
      const bookedSlots = property.layoutData.filter(slot => slot.isBooked).length;
      const totalLayoutSlots = property.layoutData.length;
      
      slotDetails = {
        total: totalLayoutSlots,
        booked: bookedSlots,
        available: totalLayoutSlots - bookedSlots,
        carSlots: {
          total: property.layoutData.filter(s => s.type === 'car').length,
          available: property.layoutData.filter(s => s.type === 'car' && !s.isBooked).length
        },
        bikeSlots: {
          total: property.layoutData.filter(s => s.type === 'bike').length,
          available: property.layoutData.filter(s => s.type === 'bike' && !s.isBooked).length
        }
      };
    }

    res.json({
      success: true,
      propertyId,
      status,
      urgencyMessage,
      availability: {
        total: totalSlots,
        booked: activeBookings,
        available: availableSlots,
        occupancyRate: parseFloat(occupancyRate)
      },
      slotDetails,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error("Get Live Availability Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// GET OCCUPANCY STATS
exports.getOccupancyStats = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { period = '24h' } = req.query;

    const property = await ParkingProperty.findById(propertyId);
    if (!property) {
      return next(new ApiError(404, "Property not found"));
    }

    // Calculate time range
    const now = new Date();
    let startTime = new Date();
    
    if (period === '24h') startTime.setHours(now.getHours() - 24);
    else if (period === '7d') startTime.setDate(now.getDate() - 7);
    else if (period === '30d') startTime.setDate(now.getDate() - 30);

    // Get bookings in period
    const bookings = await Booking.find({
      property: propertyId,
      createdAt: { $gte: startTime },
      status: { $in: ['confirmed', 'completed'] }
    });

    // Calculate hourly stats (for 24h period)
    const hourlyStats = [];
    if (period === '24h') {
      for (let i = 0; i < 24; i++) {
        const hourStart = new Date(now);
        hourStart.setHours(now.getHours() - (23 - i), 0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hourStart.getHours() + 1);

        const hourBookings = bookings.filter(b => 
          new Date(b.createdAt) >= hourStart && new Date(b.createdAt) < hourEnd
        ).length;

        hourlyStats.push({
          hour: hourStart.getHours(),
          bookings: hourBookings,
          label: `${hourStart.getHours()}:00`
        });
      }
    }

    // Peak hours
    const peakHour = hourlyStats.reduce((max, curr) => 
      curr.bookings > max.bookings ? curr : max, 
      { hour: 0, bookings: 0 }
    );

    res.json({
      success: true,
      period,
      stats: {
        totalBookings: bookings.length,
        averagePerDay: (bookings.length / (period === '24h' ? 1 : period === '7d' ? 7 : 30)).toFixed(1),
        peakHour: peakHour.hour,
        peakBookings: peakHour.bookings
      },
      hourlyStats: period === '24h' ? hourlyStats : null
    });
  } catch (error) {
    console.error("Get Occupancy Stats Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};
