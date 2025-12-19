const User = require("../model/User");
const bcrypt = require("bcryptjs");
const jwtHelper = require("../util/jwtHelper");
const { sendEmail } = require("../util/sendEmail");

/**
 * Register User + Generate OTP
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // check if already exist
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    // Create new user, use provided role if valid, else default to 'user'
    user = new User({
      name,
      email,
      phone,
      password,
      role: ["user", "owner", "rental"].includes(role) ? role : "user",
      otp,
      otpExpiry
    });

    await user.save();

    // Send OTP via email
    await sendEmail(email, "Verify your Account", `Your OTP is ${otp}`);

    console.log("📨 OTP generated for user:", email, " =>", otp);

    res.status(201).json({
      message: "User registered successfully. OTP sent.",
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("❌ Register Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Verify OTP
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: "OTP verified successfully!" });
  } catch (err) {
    console.error("❌ Verify OTP Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Login User
 */
exports.login = async (req, res) => {
  try {
    console.log("📩 Login API called");

    const { email, password } = req.body;
    console.log("📝 Login Request Body:", req.body);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("🔑 Hashed password in DB:", user.password);
    console.log("🔑 Password provided:", password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("✅ Password match result:", isMatch);

    if (!isMatch) {
      console.log("❌ Invalid credentials for email:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwtHelper.generateToken({ userId: user._id.toString() });
    console.log("✅ User logged in:", user.email);

    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error("❌ Login Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};




exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    let decoded;
    try {
      decoded = jwtHelper.verifyToken(token);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const userId = decoded.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword; // just assign plain text
    await user.save();           // pre-save hook will hash it automatically

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("❌ Reset Password Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};




/**
 * Forgot Password
 */
// controllers/authController.js
exports.forgotPassword = async (req, res) => {
  try {
    console.log("📩 Forgot Password API called");
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Wrap user._id in an object
    const resetToken = jwtHelper.generateToken({ userId: user._id }, "15m");

    // Send email with token
    await sendEmail(email, "Password Reset", `Your reset token: ${resetToken}`);

    console.log("📧 Password reset mail sent to:", email);

    res.json({ message: "Password reset link sent to email" });
  } catch (err) {
    console.error("❌ Forgot Password Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Reset Password
 */
// controllers/authController.js


/**
 * Get Profile
 */
exports.getProfile = async (req, res) => {
  try {
    console.log("📩 Get Profile API called");
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("✅ User profile retrieved:", user.email);

    res.json({ user });
  } catch (err) {
    console.error("❌ Get Profile Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // From authMiddleware
    const { currentPassword, newPassword } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    // Hash new password and save
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("❌ Change Password Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Update Profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user });
  } catch (error) {
    console.error("❌ Update Profile Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Delete User
 */
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Delete User Error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
