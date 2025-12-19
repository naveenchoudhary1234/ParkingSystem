const express = require("express");
const authController = require("../controller/authController");
const authMiddleware = require("../middlware/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-otp", authController.verifyOtp);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/change-password", authMiddleware, authController.changePassword);

router.get("/test-auth", authMiddleware, (req, res) => {
  res.json({ 
    message: "Authentication successful", 
    user: req.user 
  });
});


router.get("/profile", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, authController.updateProfile);
router.delete("/profile", authMiddleware, authController.deleteUser);

module.exports = router;
