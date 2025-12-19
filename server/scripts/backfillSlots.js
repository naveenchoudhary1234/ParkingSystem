// Script to backfill slots for all approved properties
// Usage: node scripts/backfillSlots.js

const mongoose = require('mongoose');
const ParkingProperty = require('../model/ParkingProperty');
const PropertySlot = require('../model/PropertySlot');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/parkingsystem';

async function backfillSlots() {
  await mongoose.connect(MONGO_URI);
  const properties = await ParkingProperty.find({ approved: true });
  let created = 0;
  for (const property of properties) {
    const existingSlots = await PropertySlot.find({ property: property._id });
    if (existingSlots.length === 0) {
      // Car slots
      for (let i = 1; i <= property.carSlots; i++) {
        await PropertySlot.create({
          property: property._id,
          slotNumber: `Car-${i}`,
          type: 'car',
          isBooked: false,
          pricePerHour: property.pricePerHour
        });
        created++;
      }
      // Bike slots
      for (let i = 1; i <= property.bikeSlots; i++) {
        await PropertySlot.create({
          property: property._id,
          slotNumber: `Bike-${i}`,
          type: 'bike',
          isBooked: false,
          pricePerHour: property.pricePerHour
        });
        created++;
      }
      console.log(`Slots created for property: ${property.name}`);
    }
  }
  console.log(`Backfill complete. Total slots created: ${created}`);
  await mongoose.disconnect();
}

backfillSlots().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});
