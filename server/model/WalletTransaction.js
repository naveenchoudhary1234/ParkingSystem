const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  balanceAfter: { type: Number, required: true },
  status: { type: String, enum: ["completed", "pending", "failed"], default: "completed" }
}, { timestamps: true });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
