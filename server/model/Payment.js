const mongoose=require("mongoose");

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["success", "failed", "pending"], default: "pending" },
  transactionId: { type: String }
}, { timestamps: true });

module.exports=new mongoose.model("Payment", paymentSchema);
