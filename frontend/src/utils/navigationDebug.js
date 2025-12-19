// Navigation Debug Helper
// Add this temporarily to MyBookings.js to debug navigation issues

const debugNavigationData = (booking) => {
  console.log("🔍 Navigation Debug Information:");
  console.log("=====================================");
  console.log("1. Booking Object Keys:", Object.keys(booking));
  console.log("2. Booking Coordinates:", booking.coordinates);
  console.log("3. Property Address:", booking.propertyAddress);
  console.log("4. Property Object:", booking.property);
  
  if (booking.property) {
    console.log("5. Property Keys:", Object.keys(booking.property));
    console.log("6. Property FullAddress:", booking.property.fullAddress);
    console.log("7. Property Address:", booking.property.address);
    console.log("8. Property Location:", booking.property.location);
    console.log("9. Property Coordinates:", booking.property.coordinates);
  }
  
  console.log("=====================================");
  
  // Test what navigation URL would be generated
  let address = null;
  let coordinates = null;

  if (booking.property?.fullAddress && booking.property.fullAddress.trim()) {
    address = booking.property.fullAddress;
  } else if (booking.propertyAddress && booking.propertyAddress.trim()) {
    address = booking.propertyAddress;
  }

  if (booking.coordinates && Array.isArray(booking.coordinates) && booking.coordinates.length === 2) {
    coordinates = booking.coordinates;
  } else if (booking.property?.location?.coordinates && Array.isArray(booking.property.location.coordinates)) {
    coordinates = booking.property.location.coordinates;
  }

  console.log("🎯 Final Navigation Decision:");
  console.log("Address to use:", address);
  console.log("Coordinates to use:", coordinates);
  
  if (address) {
    console.log("📍 Would open:", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  } else if (coordinates) {
    const [lng, lat] = coordinates;
    console.log("📍 Would open:", `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  } else {
    console.log("❌ No navigation data available");
  }
};

// To use this, temporarily add this line in the handleNavigate function:
// debugNavigationData(booking);

export default debugNavigationData;