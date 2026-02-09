const express = require("express");
const router = express.Router();
const parkingSystemController = require("../controller/parkingSystemController");
const authMiddleware = require("../middlware/authMiddleware");


router.post("/add", authMiddleware, parkingSystemController.addParkingSystem);

router.get("/search", parkingSystemController.searchNearby);

router.get("/all", parkingSystemController.getAllParkingSystems);

router.get("/:id/slots", parkingSystemController.getSlots);

module.exports = router;
