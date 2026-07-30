import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { getWalletBalance } from "../services/walletService";
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

  // ✅ Wallet Payment
  const [paymentMethod, setPaymentMethod] = useState("razorpay"); // 'razorpay' or 'wallet'
  const [walletBalance, setWalletBalance] = useState(0);

  // ✅ Rewards Discount
  const [rewardsDiscount, setRewardsDiscount] = useState(0); // Discount percentage
  const [originalAmount, setOriginalAmount] = useState(0);
  

  useEffect(() => {
    if (!parkingSystemId) {
      setError("Invalid parking system ID");
      setLoading(false);
      return;
    }
    loadParkingDetails();
    fetchWalletBalance();
    fetchRewardsDiscount();
  }, [parkingSystemId]);

  const fetchWalletBalance = async () => {
    try {
      const response = await getWalletBalance();
      setWalletBalance(response.balance || 0);
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
    }
  };

  const fetchRewardsDiscount = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await apiRequest("/rewards/discount-percentage", "GET", null, token);
      setRewardsDiscount(response.discountPercent || 0);
    } catch (error) {
      console.error("Failed to fetch rewards discount:", error);
      setRewardsDiscount(0);
    }
  };

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
    const baseAmount = parkingProperty.pricePerHour * hours;

    // Apply rewards discount
    if (rewardsDiscount > 0) {
      const discountAmount = (baseAmount * rewardsDiscount) / 100;
      return Math.round(baseAmount - discountAmount);
    }

    return baseAmount;
  };

  const getOriginalAmount = () => {
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

      // ✅ Handle Wallet Payment
      if (paymentMethod === "wallet") {
        if (walletBalance < bookingAmount) {
          setError(`Insufficient wallet balance. You need ₹${bookingAmount} but have ₹${walletBalance}`);
          setBooking(false);
          return;
        }

        // Book using wallet
        const bookingData = {
          slot: selectedSlot,
          property: parkingSystemId,
          hours: parseInt(hours),
          totalAmount: bookingAmount,
          paymentMethod: "wallet"
        };

        await apiRequest("/booking/create-with-wallet", "POST", bookingData, token);

        setSuccess(`✅ Booking successful! ₹${bookingAmount} deducted from wallet.`);
        await loadParkingDetails();
        await fetchWalletBalance();
        setSelectedSlot(null);

        setTimeout(() => {
          navigate("/bookings");
        }, 2000);

        setBooking(false);
        return;
      }

      // ✅ Handle Razorpay Payment
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

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY || "rzp_test_vsLHHCgamWA71m",
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

          {/* ✅ Payment Method Selection */}
          {selectedSlot && (
            <div className="form-group">
              <label className="form-label">💳 Payment Method *</label>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginTop: '12px',
                width: '100%'
              }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('razorpay')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '24px 20px',
                    background: paymentMethod === 'razorpay' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : '#ffffff',
                    border: paymentMethod === 'razorpay' ? '4px solid #10b981' : '3px solid #e5e7eb',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    width: '100%',
                    minHeight: '95px',
                    position: 'relative',
                    boxShadow: paymentMethod === 'razorpay' ? '0 8px 28px rgba(16, 185, 129, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.25s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (paymentMethod !== 'razorpay') {
                      e.currentTarget.style.borderColor = '#9ca3af';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (paymentMethod !== 'razorpay') {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                    }
                  }}
                >
                  {paymentMethod === 'razorpay' && (
                    <span style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: '#10b981',
                      color: 'white',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      boxShadow: '0 3px 10px rgba(16, 185, 129, 0.5)'
                    }}>✓</span>
                  )}
                  <span style={{ fontSize: '54px', lineHeight: '1', flexShrink: 0 }}>💳</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, color: paymentMethod === 'razorpay' ? '#065f46' : '#111827', fontSize: '18px', lineHeight: '1.3' }}>
                      Card/UPI/Net Banking
                    </span>
                    <span style={{ fontSize: '15px', color: paymentMethod === 'razorpay' ? '#059669' : '#6b7280', fontWeight: paymentMethod === 'razorpay' ? 700 : 600 }}>
                      Pay via Razorpay
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '24px 20px',
                    background: paymentMethod === 'wallet' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : '#ffffff',
                    border: paymentMethod === 'wallet' ? '4px solid #10b981' : '3px solid #e5e7eb',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    width: '100%',
                    minHeight: '95px',
                    position: 'relative',
                    boxShadow: paymentMethod === 'wallet' ? '0 8px 28px rgba(16, 185, 129, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.25s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (paymentMethod !== 'wallet') {
                      e.currentTarget.style.borderColor = '#9ca3af';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (paymentMethod !== 'wallet') {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                    }
                  }}
                >
                  {paymentMethod === 'wallet' && (
                    <span style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: '#10b981',
                      color: 'white',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      boxShadow: '0 3px 10px rgba(16, 185, 129, 0.5)'
                    }}>✓</span>
                  )}
                  <span style={{ fontSize: '54px', lineHeight: '1', flexShrink: 0 }}>💰</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, color: paymentMethod === 'wallet' ? '#065f46' : '#111827', fontSize: '18px', lineHeight: '1.3' }}>
                      Wallet Balance: ₹{walletBalance}
                    </span>
                    <span style={{ fontSize: '15px', color: paymentMethod === 'wallet' ? '#059669' : '#6b7280', fontWeight: paymentMethod === 'wallet' ? 700 : 600 }}>
                      {walletBalance >= getTotalAmount() ? '✅ Sufficient balance' : '❌ Insufficient balance'}
                    </span>
                  </div>
                </button>
              </div>
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
              {rewardsDiscount > 0 && (
                <>
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>₹{getOriginalAmount()}</span>
                  </div>
                  <div className="summary-row" style={{ color: '#10b981', fontWeight: '600' }}>
                    <span>🎁 Loyalty Discount ({rewardsDiscount}%):</span>
                    <span>-₹{getOriginalAmount() - getTotalAmount()}</span>
                  </div>
                </>
              )}
              <div className="summary-row total">
                <span>Total Amount:</span>
                <span>₹{getTotalAmount()}</span>
              </div>
              {paymentMethod === 'wallet' && (
                <div className="summary-row" style={{ color: walletBalance >= getTotalAmount() ? '#10b981' : '#ef4444' }}>
                  <span>Wallet Balance After:</span>
                  <span>₹{Math.max(0, walletBalance - getTotalAmount())}</span>
                </div>
              )}
            </div>
          )}

          {/* Error/Success Messages */}
          {error && <div className="error-message">❌ {error}</div>}
          {success && <div className="success-message">✅ {success}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-book-slot"
            disabled={!selectedSlot || booking || (paymentMethod === 'wallet' && walletBalance < getTotalAmount())}
          >
            {booking ? '⏳ Processing...' :
             paymentMethod === 'wallet' ?
              `💰 Pay via Wallet - ₹${getTotalAmount()}` :
              `💳 Pay & Book - ₹${getTotalAmount()}`
            }
          </button>
        </form>
      </div>
    </div>
  );
}
