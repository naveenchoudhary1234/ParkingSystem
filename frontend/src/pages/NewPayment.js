import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

export default function Payment() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
      fetchSlots();
    }
  }, [propertyId]);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchPropertyDetails = async () => {
    try {
      const response = await apiRequest(`/parking-property/search-all`);
      const foundProperty = response.find(p => p._id === propertyId);
      setProperty(foundProperty);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSlots = async () => {
    try {
      const response = await apiRequest(`/parking-property/${propertyId}/slots`);
      // Filter only available slots
      const availableSlots = response.filter(slot => !slot.isBooked);
      setSlots(availableSlots);
    } catch (err) {
      setError(err.message);
    }
  };

  const calculateTotal = () => {
    if (selectedSlot && hours && property) {
      return property.pricePerHour * hours;
    }
    return 0;
  };

  const handleRazorpayPayment = async () => {
    if (!selectedSlot) {
      setError("Please select a parking slot");
      return;
    }

    try {
      setLoading(true);
      
      // Check if user is logged in
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      
      if (!token || !user) {
        setError("Please login first to book parking");
        navigate("/login");
        return;
      }

      const userData = JSON.parse(user);
      
      // First create a temporary booking
      const bookingData = {
        slot: selectedSlot._id,
        property: propertyId,
        hours: hours,
        totalAmount: calculateTotal(),
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      };

      console.log("Creating booking with data:", bookingData);
      const booking = await apiRequest('/booking/create', 'POST', bookingData);
      
      // Create Razorpay order
      const orderResponse = await apiRequest('/payment/create-order', 'POST', {
        bookingId: booking.booking._id
      });

      // Initialize Razorpay payment
      const options = {
        key: 'rzp_test_vsLHHCgamWA71m', // Your Razorpay key from .env
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'Parking System',
        description: `Parking slot booking for ${hours} hour(s)`,
        order_id: orderResponse.orderId,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await apiRequest('/payment/verify', 'POST', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            alert("Payment successful! Your parking slot has been booked.");
            navigate('/bookings');
          } catch (verifyError) {
            console.error("Payment verification failed:", verifyError);
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: userData.name,
          email: userData.email
        },
        theme: {
          color: '#2563eb'
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
      
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = () => {
    console.log("🗺️ Opening navigation for property:", property);
    console.log("📍 Property location data:", property?.location);
    
    if (!property) {
      alert("Property information not available for navigation.");
      return;
    }

    // Check if we have valid coordinates
    const coordinates = property.location?.coordinates;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      console.error("❌ Invalid coordinates for property:", property);
      
      // Try using fullAddress or address as fallback
      const address = property.fullAddress || property.address;
      if (address && address.trim()) {
        const encodedAddress = encodeURIComponent(address);
        console.log("🗺️ Using address fallback:", address);
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
        return;
      }
      
      alert("Navigation information not available for this property. Location coordinates are missing.");
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const [propLng, propLat] = coordinates;
          console.log("🧭 Navigating from:", latitude, longitude);
          console.log("🎯 Navigating to:", propLat, propLng);
          
          const googleMapsUrl = `https://www.google.com/maps/dir/${latitude},${longitude}/${propLat},${propLng}`;
          window.open(googleMapsUrl, '_blank');
        },
        (error) => {
          console.error("❌ Geolocation error:", error);
          // Fallback to destination-only navigation
          const [propLng, propLat] = coordinates;
          console.log("🗺️ Using destination-only navigation to:", propLat, propLng);
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${propLat},${propLng}`;
          window.open(googleMapsUrl, '_blank');
        }
      );
    } else {
      // Browser doesn't support geolocation, use destination-only
      const [propLng, propLat] = coordinates;
      console.log("🗺️ Browser doesn't support geolocation, using destination-only:", propLat, propLng);
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${propLat},${propLng}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  if (!property) {
    return <div className="text-center p-4">Loading property details...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Book Parking & Pay</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Property Details */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold">{property.name}</h2>
        <p className="text-gray-600">📍 {property.address}</p>
        <button
          onClick={openNavigation}
          className="mt-2 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
        >
          🗺️ Get Directions
        </button>
      </div>

      {/* Slot Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Available Parking Slots</h3>
        
        {slots.length === 0 ? (
          <p className="text-gray-500">No available slots at this property.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {slots.map((slot) => (
              <div
                key={slot._id}
                onClick={() => setSelectedSlot(slot)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedSlot?._id === slot._id
                    ? 'bg-blue-100 border-blue-500'
                    : 'bg-white border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="font-semibold">{slot.slotNumber}</div>
                <div className="text-sm text-gray-600">
                  {slot.type === 'car' ? '🚗' : '🏍️'} {slot.type.charAt(0).toUpperCase() + slot.type.slice(1)}
                </div>
                <div className="text-green-600 font-bold">₹{property?.pricePerHour || slot.pricePerHour}/hour</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duration Selection */}
      {selectedSlot && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            How many hours do you need parking?
          </label>
          <select
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            className="p-2 border border-gray-300 rounded"
          >
            {[1, 2, 3, 4, 5, 6, 8, 12, 24].map(h => (
              <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Payment Summary */}
      {selectedSlot && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-2">Payment Summary</h3>
          <div className="space-y-1">
            <p>Slot: {selectedSlot.slotNumber} ({selectedSlot.type})</p>
            <p>Duration: {hours} hour{hours > 1 ? 's' : ''}</p>
            <p>Rate: ₹{property.pricePerHour}/hour</p>
            <hr className="my-2" />
            <p className="text-xl font-bold text-green-600">
              Total: ₹{calculateTotal()}
            </p>
          </div>
        </div>
      )}

      {/* Payment Button */}
      {selectedSlot && (
        <button
          onClick={handleRazorpayPayment}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg text-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Processing..." : `Pay ₹${calculateTotal()} via Razorpay`}
        </button>
      )}
    </div>
  );
}