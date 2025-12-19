
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Booking = require("../model/Booking");
require("dotenv").config();


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const { bookingId, amount, bookingData } = req.body;
    
    let orderAmount;
    let receipt;
    
    if (bookingId) {
      // Existing booking flow
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      orderAmount = booking.totalAmount * 100; // Convert to paise
      receipt = `order_rcptid_${booking._id}`;
    } else if (amount && bookingData) {
      // New booking flow - create order before booking
      orderAmount = amount * 100; // Convert to paise
      receipt = `order_rcptid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } else {
      return res.status(400).json({ message: "Either bookingId or amount with bookingData is required" });
    }

    const options = {
      amount: orderAmount,
      currency: "INR",
      receipt: receipt,
    };

    console.log("Creating Razorpay order with options:", options);
    const order = await razorpay.orders.create(options);
    
    console.log("Razorpay order created:", order);

    res.json({ 
      orderId: order.id, 
      currency: order.currency, 
      amount: order.amount 
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    res.json({ message: "Payment successful", paymentId: razorpay_payment_id });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
