
const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");


dotenv.config();


const connectDB = require("./config/database");


const app = express();


app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use("/api/parking-property", require("./routes/parkingPropertyRoutes"));

console.log("✅ Middlewares configured successfully");


connectDB();



// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/booking", require("./routes/bookingRoutes"));
app.use("/api/parking", require("./routes/parkingRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/parking-system", require("./routes/parkingSystemRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));

app.get("/", (req, res) => {
  console.log("📥 Request received on / route");
  res.send("🚀 Parking System API is running...");
});


const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`✅ Server running on port: ${PORT}`);
});
