const express = require("express");
const parkingController = require("../controller/parkingController");
const router = express.Router();

// Deprecated: Only admin can add slot via parking system
// router.post("/add", parkingController.addParkingSlot);

// Get all slots or by parkingSystemId
router.get("/available", parkingController.getAvailableSlots);

module.exports = router;
