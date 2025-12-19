const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_EXPIRY = "1d";


exports.generateToken = (payload) => {
  console.log("[jwtHelper] Generating token for payload:", payload);
  try {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    console.log("[jwtHelper] Token generated successfully");
    return token;
  } catch (error) {
    console.error("[jwtHelper] Error generating token:", error.message);
    throw error;
  }
};


exports.verifyToken = (token) => {
  console.log("[jwtHelper] Verifying token:", token);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("[jwtHelper] Token verified. Decoded payload:", decoded);
    return decoded;
  } catch (error) {
    console.error("[jwtHelper] Invalid token:", error.message);
    throw error;
  }
};


exports.refreshToken = (payload) => {
  console.log("[jwtHelper] Refreshing token for payload:", payload);
  try {
    const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    console.log("[jwtHelper] Token refreshed successfully");
    return newToken;
  } catch (error) {
    console.error("[jwtHelper] Error refreshing token:", error.message);
    throw error;
  }
};
