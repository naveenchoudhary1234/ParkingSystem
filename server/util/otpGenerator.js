const crypto = require("crypto");

const generateOTP = (length = 6) => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

const generateSecureOTP = (length = 6) => {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
};

module.exports = { generateOTP, generateSecureOTP };
