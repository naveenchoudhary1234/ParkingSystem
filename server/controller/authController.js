const User = require("../model/User");
const bcrypt = require("bcryptjs");
const jwtHelper = require("../util/jwtHelper");
const { sendEmail } = require("../util/sendEmail");


exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    
    let user = await User.findOne({ email });
    if (user) {
      const ApiError = require("../util/ApiError");
      return next(new ApiError(400, "User already exists"));
    }

  
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

   
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

    
    await sendEmail(email, "Verify your Account", `Your OTP is ${otp}`);

    console.log("📨 OTP generated for user:", email, " =>", otp);

    res.status(201).json({ success: true, message: "User registered successfully. OTP sent.", user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    console.error("❌ Register Error:", error.message);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server error"));
  }
};


exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return next(new (require("../util/ApiError"))(404, "User not found"));

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return next(new (require("../util/ApiError"))(400, "Invalid or expired OTP"));
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "OTP verified successfully!" });
  } catch (err) {
    console.error("❌ Verify OTP Error:", err.message);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server error"));
  }
};


exports.login = async (req, res, next) => {
  try {
    console.log("📩 Login API called");

    const { email, password } = req.body;
    console.log("📝 Login Request Body:", req.body);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found for email:", email);
      return next(new (require("../util/ApiError"))(404, "User not found"));
    }

    console.log("🔑 Hashed password in DB:", user.password);
    console.log("🔑 Password provided:", password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("✅ Password match result:", isMatch);

    if (!isMatch) {
      console.log("❌ Invalid credentials for email:", email);
      return next(new (require("../util/ApiError"))(400, "Invalid credentials"));
    }

    const token = jwtHelper.generateToken({ userId: user._id.toString() });
    console.log("✅ User logged in:", user.email);

    res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error("❌ Login Error:", err.message);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server error"));
  }
};




exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return next(new (require("../util/ApiError"))(400, "Token and new password are required"));
    }

    let decoded;
    try {
      decoded = jwtHelper.verifyToken(token);
    } catch (err) {
      return next(new (require("../util/ApiError"))(400, "Invalid or expired token"));
    }

    const userId = decoded.userId;
    const user = await User.findById(userId);
    if (!user) return next(new (require("../util/ApiError"))(404, "User not found"));

    user.password = newPassword; // just assign plain text
    await user.save();           // pre-save hook will hash it automatically

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("❌ Reset Password Error:", err.message);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server error"));
  }
};





exports.forgotPassword = async (req, res, next) => {
  try {
    console.log("📩 Forgot Password API called");
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return next(new (require("../util/ApiError"))(404, "User not found"));

    const resetToken = jwtHelper.generateToken({ userId: user._id }, "15m");

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendBase}/reset-password?token=${resetToken}`;

  
    await sendEmail(
      email,
      "Password Reset",
      `Your password reset link (valid 15 minutes): ${resetLink}\nIf the link is not clickable, copy and paste it into your browser. Token: ${resetToken}`,
      `<p>Your password reset link (valid 15 minutes):</p><p><a href="${resetLink}">${resetLink}</a></p><p>If the link is not clickable, copy and paste it into your browser.</p><p>Token: <code>${resetToken}</code></p>`
    );

    console.log("📧 Password reset mail sent to:", email);

    res.json({ success: true, message: "Password reset link sent to email" });
  } catch (err) {
    console.error("❌ Forgot Password Error:", err.message);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server error"));
  }
};



exports.getProfile = async (req, res, next) => {
  try {
    console.log("📩 Get Profile API called");
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password");
    if (!user) return next(new (require("../util/ApiError"))(404, "User not found"));

    console.log("✅ User profile retrieved:", user.email);

    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ Get Profile Error:", err.message);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server error"));
  }
};


exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id; // From authMiddleware
    const { currentPassword, newPassword } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) return next(new (require("../util/ApiError"))(404, "User not found"));

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return next(new (require("../util/ApiError"))(400, "Current password is incorrect"));

    // Hash new password and save
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("❌ Change Password Error:", err.message);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server error"));
  }
};



exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone },
      { new: true }
    ).select("-password");

    if (!user) return next(new (require("../util/ApiError"))(404, "User not found"));

    res.json({ success: true, message: "Profile updated", user });
  } catch (error) {
    console.error("❌ Update Profile Error:", error.message);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server error"));
  }
};


exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Delete User Error:", error.message);
    const ApiError = require("../util/ApiError");
    next(new ApiError(500, "Server error"));
  }
};
