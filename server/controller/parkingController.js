const ParkingSlot = require("../model/ParkingSlot");


// Only admin can add slot (should be handled in parkingSystemController now)
exports.addParkingSlot = async (req, res) => {
  return res.status(403).json({ error: "Add slot only via parking system as admin." });
};

exports.getAvailableSlots = async (req, res) => {
  try {
    console.log("📩 Get Available Slots API called");
    const { parkingSystemId } = req.query;
    let filter = {};
    if (parkingSystemId) filter.parkingSystem = parkingSystemId;
    const slots = await ParkingSlot.find(filter);
    res.json(slots);
  } catch (err) {
    console.error("❌ Get Slots Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
