const express = require("express");
const availabilityController = require("../controller/availabilityController");
const router = express.Router();

// Public routes
router.get("/:propertyId/live", availabilityController.getLiveAvailability);
router.get("/:propertyId/occupancy", availabilityController.getOccupancyStats);

module.exports = router;
