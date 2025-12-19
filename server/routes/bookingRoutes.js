const express = require("express");
const bookingController = require("../controller/bookingController");
const authMiddleware = require("../middlware/authMiddleware");
const router = express.Router();

// Protected routes
router.post("/create", authMiddleware, bookingController.createBooking);
router.get("/my-bookings", authMiddleware, bookingController.getMyBookings);
router.delete("/cancel/:bookingId", authMiddleware, bookingController.cancelBooking);


router.get("/all", authMiddleware, bookingController.getAllBookings);

module.exports = router;
