import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import ParkingSlotSelector from "../components/ParkingSlotSelector";
import LayoutConsistencyChecker from "../components/LayoutConsistencyChecker";
import "../styles/booking.css";

export default function BookSlot() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const parkingSystemId = searchParams.get('parkingSystemId');
  
  const [parkingProperty, setParkingProperty] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState("car");
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  

  useEffect(() => {
    if (!parkingSystemId) {
      setError("Invalid parking system ID");
      setLoading(false);
      return;
    }
    loadParkingDetails();
  }, [parkingSystemId]);

  const loadParkingDetails = async () => {
    try {
      setLoading(true);
      // Get parking property details
      const property = await apiRequest(`/parking-property/${parkingSystemId}`, "GET");
      setParkingProperty(property);
      
      // Get available slots for this property
      const slots = await apiRequest(`/parking-property/${parkingSystemId}/slots`, "GET");
      setAvailableSlots(slots);
      
      // Separate booked slots
      const bookedSlotsList = slots.filter(slot => slot.isBooked);
      setBookedSlots(bookedSlotsList);
      
    } catch (err) {
      console.error("❌ Error loading parking details:", err);
      setError("Failed to load parking details. This property may not have any slots created yet.");
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setSelectedVehicleType(slot.vehicleType);
  };

  const handleVehicleTypeChange = (type) => {
    setSelectedVehicleType(type);
    setSelectedSlot(null); // Reset selected slot when vehicle type changes
  };

  const getSlotName = (slot) => {
    if (!slot) return "";
    return slot.slotNumber || slot._id;
  };

  const getTotalAmount = () => {
    if (!selectedSlot || !parkingProperty) return 0;
    return parkingProperty.pricePerHour * hours;
  };

  const getFilteredSlots = () => {
    if (!selectedVehicleType || !availableSlots.length) return [];
    return availableSlots.filter(slot => 
      slot.type === selectedVehicleType && !slot.isBooked
    );
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !selectedVehicleType) {
      setError("Please select vehicle type and parking slot");
      return;
    }

    setBooking(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const bookingAmount = hours * parkingProperty.pricePerHour;

      // Create Razorpay order first
  // Create Razorpay order
      const orderResponse = await apiRequest("/payment/create-order", "POST", {
        amount: bookingAmount,
        bookingData: {
          slot: selectedSlot,
          property: parkingSystemId,
          hours: parseInt(hours),
          totalAmount: bookingAmount,
          vehicleType: selectedVehicleType,
          propertyName: parkingProperty.name,
          slotName: getSlotName(selectedSlot)
        }
      }, token);

      

      // Configure Razorpay options
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY || "rzp_test_vsLHHCgamWA71m", // Your Razorpay public key
        amount: orderResponse.amount,
        currency: orderResponse.currency || "INR",
        name: "ParkingSystem",
        description: `Parking Slot: ${getSlotName(selectedSlot)} - ${hours} hour(s)`,
        order_id: orderResponse.orderId,
        handler: async function (response) {
          console.log("Payment successful:", response);
          await handlePaymentSuccess(response, orderResponse.orderId);
        },
        prefill: {
          name: "Customer",
          email: "customer@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#3b82f6"
        },
        modal: {
          ondismiss: function() {
            console.log("Payment dismissed");
            setBooking(false);
            setError("Payment was cancelled. Please try again.");
          }
        }
      };

      // Open Razorpay payment
      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        throw new Error("Razorpay SDK not loaded. Please refresh the page.");
      }

    } catch (err) {
      console.error("❌ Payment setup failed:", err);
      setError(err.message || "Payment setup failed. Please try again.");
      setBooking(false);
    }
  };

  const handlePaymentSuccess = async (paymentResponse, orderId) => {
    try {
      const token = localStorage.getItem("token");
      
      // Verify payment
      // Verify payment
      await apiRequest("/payment/verify", "POST", {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature
      }, token);
      // Create booking after successful payment
      const bookingData = {
        slot: selectedSlot,
        property: parkingSystemId,
        hours: parseInt(hours),
        totalAmount: hours * parkingProperty.pricePerHour
      };

      const booking = await apiRequest("/booking/create", "POST", bookingData, token);
      
      setSuccess(`Payment successful! Your slot ${getSlotName(selectedSlot)} is reserved.`);
      
      // Refresh slots to show updated availability
      await loadParkingDetails();
      
      // Clear selection since slot is now booked
      setSelectedSlot(null);
      
      // Redirect to bookings page after 3 seconds
      setTimeout(() => {
        navigate("/bookings");
      }, 3000);
      
    } catch (err) {
      console.error("❌ Payment verification or booking failed:", err);
      setError("Payment was successful but booking failed. Please contact support with your payment ID: " + paymentResponse.razorpay_payment_id);
    } finally {
      setBooking(false);
    }
  };

  

  if (loading) {
    return (
      <div className="booking-container">
        <div className="booking-card loading">
          <div className="loading-spinner"></div>
          <p>Loading parking details...</p>
        </div>
      </div>
    );
  }

  if (error && !parkingProperty) {
    return (
      <div className="booking-container">
        <div className="booking-card error">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/parking")} className="btn-back">
            ← Back to Parking Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-container">
      <div className="booking-card">
        <div className="booking-header">
          <button onClick={() => navigate("/parking")} className="btn-back">
            ← Back
          </button>
          <h2>🎯 Book Parking Slot</h2>
        </div>

        {/* Property Info */}
        {parkingProperty && (
          <div className="property-info">
            <h3>{parkingProperty.name}</h3>
            <p className="property-address">📍 {parkingProperty.address || parkingProperty.fullAddress}</p>
            <p className="property-price">💰 ₹{parkingProperty.pricePerHour}/hour</p>
            {parkingProperty.contactNumber && (
              <p className="property-contact">📞 {parkingProperty.contactNumber}</p>
            )}
            
            {/* Layout Consistency Check */}
            <LayoutConsistencyChecker 
              property={parkingProperty} 
              step="user-booking-view" 
            />
            
          </div>
        )}

        <form onSubmit={handleBook} className="booking-form">
          {/* Vehicle Type Selection */}
          <div className="form-group">
            <label className="form-label">🚗 Select Vehicle Type *</label>
            <div className="vehicle-type-grid">
              {parkingProperty?.carSlots > 0 && (
                <button
                  type="button"
                  className={`vehicle-type-btn ${selectedVehicleType === 'car' ? 'selected' : ''}`}
                  onClick={() => handleVehicleTypeChange('car')}
                >
                  <span className="vehicle-icon">🚗</span>
                  <span className="vehicle-label">Car</span>
                  <span className="vehicle-count">{parkingProperty.carSlots} slots</span>
                </button>
              )}
              
              {parkingProperty?.bikeSlots > 0 && (
                <button
                  type="button"
                  className={`vehicle-type-btn ${selectedVehicleType === 'bike' ? 'selected' : ''}`}
                  onClick={() => handleVehicleTypeChange('bike')}
                >
                  <span className="vehicle-icon">🏍️</span>
                  <span className="vehicle-label">Bike</span>
                  <span className="vehicle-count">{parkingProperty.bikeSlots} slots</span>
                </button>
              )}
            </div>
          </div>

          {/* Visual Slot Selection */}
          {selectedVehicleType && parkingProperty && (
            <div className="form-group">
              {parkingProperty.layoutData ? (
                <ParkingSlotSelector
                  parkingProperty={parkingProperty}
                  layoutData={parkingProperty.layoutData}
                  availableSlots={availableSlots}
                  bookedSlots={bookedSlots}
                  onSlotSelect={handleSlotSelect}
                  selectedSlot={selectedSlot}
                  vehicleType={selectedVehicleType}
                />
              ) : (
                <div className="fallback-slot-selection">
                  <div className="layout-warning">
                    ⚠️ <strong>Notice:</strong> Visual layout not available. Using simplified slot selection.
                    <br />
                    <small>The property owner hasn't created a visual layout yet.</small>
                  </div>
                  <label className="form-label">🅿️ Select {selectedVehicleType === 'car' ? 'Car' : 'Bike'} Slot *</label>
                  {getFilteredSlots().length > 0 ? (
                    <select 
                      value={selectedSlot?._id || ""} 
                      onChange={(e) => {
                        const slot = availableSlots.find(s => s._id === e.target.value);
                        setSelectedSlot(slot);
                      }}
                      className="form-select"
                      required
                    >
                      <option value="">Choose a slot</option>
                      {getFilteredSlots().map(slot => (
                        <option key={slot._id} value={slot._id}>
                          {slot.slotNumber} - ₹{parkingProperty.pricePerHour || slot.pricePerHour}/hr
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="no-slots">
                      ❌ No {selectedVehicleType} slots available at the moment
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hours Selection */}
          {selectedSlot && (
            <div className="form-group">
              <label className="form-label">⏰ Duration (Hours) *</label>
              <input 
                type="number" 
                min="1" 
                max="24"
                value={hours} 
                onChange={(e) => setHours(e.target.value)}
                className="form-input"
                required 
              />
            </div>
          )}

          {/* Total Amount */}
          {selectedSlot && parkingProperty && (
            <div className="booking-summary">
              <div className="summary-row">
                <span>Rate:</span>
                <span>₹{parkingProperty.pricePerHour}/hour</span>
              </div>
              <div className="summary-row">
                <span>Duration:</span>
                <span>{hours} hour{hours > 1 ? 's' : ''}</span>
              </div>
              <div className="summary-row total">
                <span>Total Amount:</span>
                <span>₹{getTotalAmount()}</span>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && <div className="error-message">❌ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn-book-slot"
            disabled={!selectedSlot || booking}
          >
            {booking ? '⏳ Processing Payment...' : `💳 Pay & Book - ₹${getTotalAmount()}`}
          </button>
        </form>
      </div>
    </div>
  );
}
