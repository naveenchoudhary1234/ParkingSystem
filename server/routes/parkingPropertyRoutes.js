const express = require("express");
const router = express.Router();
const parkingPropertyController = require("../controller/parkingPropertyController");
const layoutDebugController = require("../controller/layoutDebugController");
const authMiddleware = require("../middlware/authMiddleware");

// Rental: Add property
router.post("/add", authMiddleware, parkingPropertyController.addProperty);
// User: Search nearby
router.get("/search", parkingPropertyController.searchNearby);
// User: Get all approved properties
router.get("/approved", parkingPropertyController.getApprovedProperties);
// Geocoding helper for address search
router.get("/geocode/search", parkingPropertyController.searchPlaces);
// Debug: Check layout consistency for a property (moved up to avoid conflicts)
router.get("/:id/debug-layout", layoutDebugController.debugLayoutConsistency);
// Rental: Get my properties
router.get("/my-properties", authMiddleware, parkingPropertyController.getMyProperties);
// Rental: Get dashboard statistics
router.get("/rental-stats", authMiddleware, parkingPropertyController.getRentalStats);
// Owner: Get pending properties for approval
router.get("/pending", authMiddleware, parkingPropertyController.getPendingProperties);
// Owner: Get all properties (for dashboard)
router.get("/search-all", parkingPropertyController.getAllProperties);
// Get single property by ID (for booking)
router.get("/:id", parkingPropertyController.getPropertyById);
// Update property layout
router.put("/:id/layout", authMiddleware, parkingPropertyController.updatePropertyLayout);
// Get slots for a ParkingProperty  
router.get("/:id/slots", parkingPropertyController.getPropertySlots);
// Get slots with different URL pattern for booking component
router.get("/parking-slots/:id", parkingPropertyController.getPropertySlots);
// Owner: Approve property
router.put("/approve/:id", authMiddleware, parkingPropertyController.approveProperty);
// Owner: Toggle property active status
router.put("/toggle-status/:id", authMiddleware, parkingPropertyController.togglePropertyStatus);
// Owner: Delete property
router.delete("/:id", authMiddleware, parkingPropertyController.deleteProperty);
// Owner: Get bookings for property
router.get("/:id/bookings", authMiddleware, parkingPropertyController.getBookings);

module.exports = router;
