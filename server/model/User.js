const mongoose=require("mongoose");
const bcrypt=require("bcryptjs");



const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "owner", "rental"], default: "user" },
  address: { type: String }, // User address (optional)
  wallet: { type: Number, default: 0 }, // Wallet balance for refunds
  loyaltyPoints: { type: Number, default: 0 }, // Loyalty/Reward points
  otp: { type: String },
  otpExpiry: { type: Date },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date }
}, { timestamps: true });


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports=new mongoose.model("User", userSchema);
