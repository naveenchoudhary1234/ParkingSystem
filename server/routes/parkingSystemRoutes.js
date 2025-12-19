const express = require("express");
const router = express.Router();
const parkingSystemController = require("../controller/parkingSystemController");
const authMiddleware = require("../middlware/authMiddleware");

// Admin only
router.post("/add", authMiddleware, parkingSystemController.addParkingSystem);
// User search
router.get("/search", parkingSystemController.searchNearby);
// Get all parking systems
router.get("/all", parkingSystemController.getAllParkingSystems);
// Get slots for a system
router.get("/:id/slots", parkingSystemController.getSlots);

module.exports = router;
