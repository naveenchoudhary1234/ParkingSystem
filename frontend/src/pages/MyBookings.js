import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../api";
import StarRating from "../components/StarRating"; // ✅ Batch 1: Reviews
import "../styles/modern.css";
import "../styles/MyBookings.css";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 0,
    title: "",
    comment: "",
    cleanliness: 0,
    security: 0,
    accessibility: 0,
    valueForMoney: 0
  });
  const user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      const response = await apiRequest("/booking/my-bookings");
      setBookings(response);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Batch 1: Submit Review
  const handleSubmitReview = async () => {
    if (reviewData.rating === 0) {
      alert("Please select a rating");
      return;
    }

    try {
      // Get property ID - handle both populated and non-populated cases
      const propertyId = selectedBooking.property?._id || selectedBooking.property;
      const propertyName = selectedBooking.property?.name || selectedBooking.propertyName || 'Parking Spot';

      if (!propertyId) {
        alert("Error: Property information is missing");
        return;
      }

      await apiRequest("/reviews/create", "POST", {
        propertyId: propertyId,
        bookingId: selectedBooking._id,
        rating: reviewData.rating,
        title: reviewData.title || `Review for ${propertyName}`,
        comment: reviewData.comment,
        cleanliness: reviewData.cleanliness || reviewData.rating,
        security: reviewData.security || reviewData.rating,
        accessibility: reviewData.accessibility || reviewData.rating,
        valueForMoney: reviewData.valueForMoney || reviewData.rating
      });

      alert("✅ Review submitted successfully!");
      setShowReviewModal(false);
      setReviewData({
        rating: 0,
        title: "",
        comment: "",
        cleanliness: 0,
        security: 0,
        accessibility: 0,
        valueForMoney: 0
      });
      setSelectedBooking(null);

      // Refresh bookings to show updated data
      fetchMyBookings();
    } catch (err) {
      alert("Failed to submit review: " + err.message);
    }
  };

  const openReviewModal = (booking) => {
    setSelectedBooking(booking);
    setShowReviewModal(true);
  };

  // Check if booking has expired
  const isBookingExpired = (booking) => {
    const endTime = new Date(booking.endTime);
    const now = new Date();
    return now > endTime;
  };

  // Get booking status with expiry check
  const getBookingStatus = (booking) => {
    if (booking.status === 'cancelled') return 'cancelled';
    if (isBookingExpired(booking)) return 'completed';
    return booking.status;
  };

  // Separate bookings into active and completed
  const activeBookings = bookings.filter(booking => {
    const status = getBookingStatus(booking);
    return status === 'confirmed' || status === 'pending';
  });

  const completedBookings = bookings.filter(booking => {
    const status = getBookingStatus(booking);
    return status === 'completed' || status === 'cancelled';
  });

  if (user?.role !== "user") return <Navigate to="/" />;

  const handleNavigate = (booking) => {
    console.log("🗺️ Attempting navigation for booking:", booking);
    console.log("📍 Available location data:", {
      coordinates: booking.coordinates,
      propertyAddress: booking.propertyAddress,
      fullAddress: booking.property?.fullAddress,
      address: booking.property?.address,
      propertyName: booking.propertyName
    });

    // Try multiple sources for address/location data
    let address = null;
    let coordinates = null;

    // 1. Try property fullAddress first (most complete)
    if (booking.property?.fullAddress && booking.property.fullAddress.trim() && 
        booking.property.fullAddress !== "Selected location" && 
        booking.property.fullAddress !== "Property location") {
      address = booking.property.fullAddress;
    }
    // 2. Try propertyAddress from booking data
    else if (booking.propertyAddress && booking.propertyAddress.trim() && 
             booking.propertyAddress !== "Selected location" && 
             booking.propertyAddress !== "Property location") {
      address = booking.propertyAddress;
    }
    // 3. Try property address as fallback
    else if (booking.property?.address && booking.property.address.trim() && 
             booking.property.address !== "Selected location" && 
             booking.property.address !== "Property location") {
      address = booking.property.address;
    }
    // 4. Try property name as last resort
    else if (booking.propertyName && booking.propertyName.trim()) {
      address = booking.propertyName;
    }

    // Get coordinates from multiple possible sources
    if (booking.coordinates && Array.isArray(booking.coordinates) && booking.coordinates.length === 2) {
      coordinates = booking.coordinates;
    } else if (booking.property?.location?.coordinates && Array.isArray(booking.property.location.coordinates) && booking.property.location.coordinates.length === 2) {
      coordinates = booking.property.location.coordinates;
    } else if (booking.property?.coordinates && Array.isArray(booking.property.coordinates) && booking.property.coordinates.length === 2) {
      coordinates = booking.property.coordinates;
    }

    console.log("🎯 Final navigation data:", { address, coordinates });

    // Use address if available (better for navigation)
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      console.log("🗺️ Opening Google Maps with address:", address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
    }
    // Fallback to coordinates
    else if (coordinates) {
      const [lng, lat] = coordinates;
      console.log("🗺️ Opening Google Maps with coordinates:", lat, lng);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
    }
    // No navigation data available
    else {
      console.error("❌ No navigation data available for booking:", booking);
      alert("Navigation information not available for this booking. Please contact support.");
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      try {
        await apiRequest(`/booking/cancel/${bookingId}`, 'DELETE');
        alert('Booking cancelled successfully!');
        fetchMyBookings(); // Refresh the list
      } catch (error) {
        alert('Error cancelling booking: ' + error.message);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: { color: 'success', icon: '✅', text: 'Confirmed' },
      pending: { color: 'warning', icon: '⏳', text: 'Pending' },
      cancelled: { color: 'error', icon: '❌', text: 'Cancelled' },
      completed: { color: 'completed', icon: '🏁', text: 'Completed' }
    };
    return statusConfig[status] || { color: 'text-light', icon: '📋', text: 'Unknown' };
  };

  // Calculate time remaining for active bookings
  const getTimeRemaining = (booking) => {
    const endTime = new Date(booking.endTime);
    const now = new Date();
    const diff = endTime - now;
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  // Render booking details (shared between active and history)
  const renderBookingDetails = (booking, currentStatus, isHistory = false) => {
    return (
      <>
        {/* Card Body */}
        <div className="booking-details">
          <div className="details-row">
            <div className="detail-item">
              <div className="detail-icon">🅿️</div>
              <div className="detail-content">
                <span className="detail-label">Parking Slot</span>
                <span className="detail-value">{booking.slotNumber || 'N/A'}</span>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">⏱️</div>
              <div className="detail-content">
                <span className="detail-label">Duration</span>
                <span className="detail-value">{booking.hours} hour{booking.hours > 1 ? 's' : ''}</span>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">💰</div>
              <div className="detail-content">
                <span className="detail-label">Total Amount</span>
                <span className="detail-value">₹{booking.totalAmount}</span>
              </div>
            </div>
          </div>

          <div className="details-row">
            <div className="detail-item">
              <div className="detail-icon">🕐</div>
              <div className="detail-content">
                <span className="detail-label">Start Time</span>
                <span className="detail-value">{formatDate(booking.startTime)}</span>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">🕐</div>
              <div className="detail-content">
                <span className="detail-label">End Time</span>
                <span className="detail-value">{formatDate(booking.endTime)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Actions */}
        <div className="booking-actions">
          <button 
            onClick={() => handleNavigate(booking)}
            className="action-btn primary"
            title="Get directions to your parking spot"
          >
            🗺️ Get Directions
          </button>
          
          {/* Active booking actions */}
          {!isHistory && currentStatus === 'confirmed' && (
            <button 
              onClick={() => handleCancelBooking(booking._id)}
              className="action-btn danger"
              title="Cancel this booking"
            >
              ❌ Cancel Booking
            </button>
          )}
          
          {/* Share action for all bookings */}
          <button 
            onClick={() => {
              // Share booking details
              if (navigator.share) {
                navigator.share({
                  title: 'My Parking Booking',
                  text: `Parking at ${booking.property?.name || 'Unknown Location'}\nStart: ${formatDate(booking.startTime)}\nDuration: ${booking.hours} hours`,
                });
              } else {
                // Fallback: copy to clipboard
                const text = `Parking Booking\nLocation: ${booking.property?.name || 'Unknown Location'}\nAddress: ${booking.property?.fullAddress || 'N/A'}\nStart: ${formatDate(booking.startTime)}\nDuration: ${booking.hours} hours\nAmount: ₹${booking.totalAmount}`;
                navigator.clipboard.writeText(text);
                alert('Booking details copied to clipboard!');
              }
            }}
            className="action-btn secondary"
            title="Share booking details"
          >
            📤 Share
          </button>

          {/* History-specific actions */}
          {isHistory && currentStatus === 'completed' && (
            <>
              <button
                className="action-btn success"
                disabled
                title="This booking has been completed"
              >
                ✅ Completed
              </button>
              {/* ✅ Batch 1: Review Button */}
              <button
                className="action-btn primary"
                onClick={() => openReviewModal(booking)}
                title="Write a review for this parking"
              >
                ⭐ Write Review
              </button>
            </>
          )}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center p-4">
          <div className="loading"></div>
          <p className="mt-2 text-light">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 fade-in mybookings-page">
      <div className="mb-4">
        <h1 className="text-center mb-2 page-title">
          My Bookings
        </h1>
        <p className="text-center text-light">Manage and track your parking reservations</p>
      </div>
      
      {error && (
        <div className="error mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="booking-tabs">
        <button 
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          🚗 Active Bookings ({activeBookings.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 History ({completedBookings.length})
        </button>
      </div>

      {/* Active Bookings Tab */}
      {activeTab === 'active' && (
        <div className="tab-content">
          {activeBookings.length === 0 ? (
            <div className="card text-center">
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🅿️</div>
              <h3>No active bookings</h3>
              <p className="text-light">You don't have any active parking reservations.</p>
              <a href="/parking" className="btn btn-primary mt-3">
                Find Parking Spots
              </a>
            </div>
          ) : (
            <div className="bookings-container">
              {activeBookings.map((booking) => {
                const currentStatus = getBookingStatus(booking);
                const statusConfig = getStatusBadge(currentStatus);
                const timeRemaining = getTimeRemaining(booking);
                
                return (
                  <div key={booking._id} className="booking-card active-booking">
                    {/* Time Remaining Indicator */}
                    {currentStatus === 'confirmed' && timeRemaining && (
                      <div className="time-remaining">
                        ⏰ {timeRemaining}
                      </div>
                    )}
                    
                    {/* Card Header */}
                    <div className="booking-header">
                      <div className="property-info">
                        <h3 className="property-name">
                          {booking.property?.name || booking.propertyName || 'Unknown Property'}
                        </h3>
                        <p className="property-address">
                          📍 {booking.property?.fullAddress || booking.propertyAddress || 'Address not available'}
                        </p>
                      </div>
                      <div className="status-badge">
                        <span className={`status-pill status-${currentStatus}`}>
                          {statusConfig.icon} {statusConfig.text}
                        </span>
                      </div>
                    </div>

                    {renderBookingDetails(booking, currentStatus)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="tab-content">
          {completedBookings.length === 0 ? (
            <div className="card text-center">
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
              <h3>No booking history</h3>
              <p className="text-light">Your completed and cancelled bookings will appear here.</p>
            </div>
          ) : (
            <div className="bookings-container">
              {completedBookings.map((booking) => {
                const currentStatus = getBookingStatus(booking);
                const statusConfig = getStatusBadge(currentStatus);
                
                return (
                  <div key={booking._id} className="booking-card history-booking">
                    {/* Card Header */}
                    <div className="booking-header">
                      <div className="property-info">
                        <h3 className="property-name">
                          {booking.property?.name || booking.propertyName || 'Unknown Property'}
                        </h3>
                        <p className="property-address">
                          📍 {booking.property?.fullAddress || booking.propertyAddress || 'Address not available'}
                        </p>
                      </div>
                      <div className="status-badge">
                        <span className={`status-pill status-${currentStatus}`}>
                          {statusConfig.icon} {statusConfig.text}
                        </span>
                      </div>
                    </div>

                    {renderBookingDetails(booking, currentStatus, true)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ✅ Batch 1: Review Modal */}
      {showReviewModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⭐ Write a Review</h2>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <h4>{selectedBooking.property?.name || selectedBooking.propertyName || 'Parking Spot'}</h4>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>
                📍 {selectedBooking.property?.address || selectedBooking.propertyAddress || 'Location'}
              </p>

              <div className="form-group">
                <label>Overall Rating *</label>
                <StarRating
                  rating={reviewData.rating}
                  setRating={(r) => setReviewData({...reviewData, rating: r})}
                  size="large"
                />
              </div>

              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Great parking spot!"
                  value={reviewData.title}
                  onChange={(e) => setReviewData({...reviewData, title: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>

              <div className="form-group">
                <label>Your Review</label>
                <textarea
                  placeholder="Share your experience..."
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                  rows="4"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>

              <div className="rating-categories" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Cleanliness</label>
                  <StarRating
                    rating={reviewData.cleanliness}
                    setRating={(r) => setReviewData({...reviewData, cleanliness: r})}
                    size="medium"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Security</label>
                  <StarRating
                    rating={reviewData.security}
                    setRating={(r) => setReviewData({...reviewData, security: r})}
                    size="medium"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Accessibility</label>
                  <StarRating
                    rating={reviewData.accessibility}
                    setRating={(r) => setReviewData({...reviewData, accessibility: r})}
                    size="medium"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Value for Money</label>
                  <StarRating
                    rating={reviewData.valueForMoney}
                    setRating={(r) => setReviewData({...reviewData, valueForMoney: r})}
                    size="medium"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitReview}
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
