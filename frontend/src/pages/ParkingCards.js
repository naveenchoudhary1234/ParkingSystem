import React, { useState, useEffect } from "react";
import { apiRequest } from "../api";
import AIRecommendations from "../components/AIRecommendations";
import StarRating from "../components/StarRating"; // ✅ Batch 1: Star ratings
import FavoriteButton from "../components/FavoriteButton"; // ✅ Batch 1: Favorites
import "../styles/parking-cards.css";

export default function ParkingCards() {
  const [searchQuery, setSearchQuery] = useState("");
  const [parkingSpots, setParkingSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 
  useEffect(() => {
    fetchParkingSpots();
  }, []);


  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSpots(parkingSpots);
    } else {
      const filtered = parkingSpots.filter(spot =>
        spot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.fullAddress?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSpots(filtered);
    }
  }, [searchQuery, parkingSpots]);

  const fetchParkingSpots = async () => {
    try {
      setLoading(true);
      // Use the enhanced getAllProperties endpoint that includes availability
      const response = await apiRequest('/parking-property/search-all');
      console.log("🏢 Loaded parking properties with availability:", response);
      
      // Filter only approved properties with available slots
      const approvedAndAvailable = response.filter(spot => 
        spot.approved && (
          (spot.availability?.carSlots?.available > 0) || 
          (spot.availability?.bikeSlots?.available > 0)
        )
      );
      
      setParkingSpots(approvedAndAvailable);
      setError("");
    } catch (err) {
      console.error("❌ Error fetching parking spots:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleBookParking = (parkingId) => {
    // Navigate to payment page first, then booking
    window.location.href = `/payment/${parkingId}`;
  };

  const openNavigation = (destination) => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Open Google Maps with directions
          const googleMapsUrl = `https://www.google.com/maps/dir/${latitude},${longitude}/${destination.coordinates[1]},${destination.coordinates[0]}`;
          window.open(googleMapsUrl, '_blank');
        },
        (error) => {
          alert("Unable to get your location. Please enable location services.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  if (loading) {
    return (
      <div className="parking-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Finding the best parking spots for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="parking-page">
      {/* Hero Section */}
      <section className="parking-hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">Find Your Perfect Parking Spot</h1>
            <p className="hero-subtitle">
              Discover available parking spaces near your destination with real-time availability
            </p>
            
            {/* Advanced Search Bar */}
            <div className="search-container">
              <div className="search-box">
                <div className="search-icon">🔍</div>
                <input
                  type="text"
                  placeholder="Search by location (e.g., Karol Bagh, Connaught Place, CP Metro)"
                  value={searchQuery}
                  onChange={handleSearch}
                  className="search-input"
                />
                {searchQuery && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="results-section">
        <div className="container">
          {error && (
            <div className="error-banner">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <h3>Something went wrong</h3>
                <p>{error}</p>
              </div>
              <button className="retry-btn" onClick={fetchParkingSpots}>
                Try Again
              </button>
            </div>
          )}

          {/* Results Header */}
          <div className="results-header">
            <h2 className="results-title">
              {searchQuery 
                ? `Results for "${searchQuery}"` 
                : "Available Parking Spots"
              }
            </h2>
            <p className="results-count">
              {filteredSpots.length} {filteredSpots.length === 1 ? 'spot' : 'spots'} found
            </p>
          </div>

          {/* Parking Cards Grid */}
          <div className="parking-grid">
            {filteredSpots.map((spot) => (
              <div key={spot._id} className="parking-card">
                {/* ✅ Batch 1: Favorite Button */}
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                  <FavoriteButton propertyId={spot._id} size="medium" />
                </div>

                {/* Property image if available */}
                {Array.isArray(spot.photos) && spot.photos.length > 0 && (
                  <div className="card-media">
                    <img src={spot.photos[0]} alt={`${spot.name} parking`} />
                  </div>
                )}
                <div className="card-header">
                  <div className="card-badge">
                    {spot.carSlots > 0 && spot.bikeSlots > 0 ? '🚗🏍️' : spot.carSlots > 0 ? '🚗' : '🏍️'}
                  </div>
                  <div className="price-tag">
                    ₹{spot.pricePerHour}<span>/hour</span>
                  </div>
                </div>

                <div className="card-content">
                  <h3 className="spot-name">{spot.name}</h3>

                  {/* ✅ Batch 1: Star Rating Display */}
                  {spot.averageRating > 0 && (
                    <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StarRating rating={spot.averageRating} readonly={true} size="small" />
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        ({spot.totalReviews} {spot.totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  )}
                  <div className="location-info">
                    <div className="location-icon">📍</div>
                    <p className="location-text">{spot.fullAddress || spot.address}</p>
                  </div>
                  
                  <div className="availability-grid">
                    <div className="availability-item">
                      <div className="availability-icon">🚗</div>
                      <div className="availability-details">
                        <span className="availability-label">Cars Available</span>
                        <span className={`availability-count ${
                          (spot.availability?.carSlots?.available || 0) === 0 ? 'full' : 
                          (spot.availability?.carSlots?.available || 0) <= 2 ? 'low' : 'available'
                        }`}>
                          {spot.availability?.carSlots?.available || 0}/{spot.availability?.carSlots?.total || spot.carSlots || 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="availability-item">
                      <div className="availability-icon">🏍️</div>
                      <div className="availability-details">
                        <span className="availability-label">Bikes Available</span>
                        <span className={`availability-count ${
                          (spot.availability?.bikeSlots?.available || 0) === 0 ? 'full' : 
                          (spot.availability?.bikeSlots?.available || 0) <= 2 ? 'low' : 'available'
                        }`}>
                          {spot.availability?.bikeSlots?.available || 0}/{spot.availability?.bikeSlots?.total || spot.bikeSlots || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card-actions">
                  <button
                    onClick={() => handleBookParking(spot._id)}
                    className="btn btn-primary btn-book"
                  >
                    Book Now & Pay
                  </button>
                  
                  <button
                    onClick={() => openNavigation(spot.location)}
                    className="btn btn-outline btn-directions"
                  >
                    <span className="btn-icon">🗺️</span>
                    Get Directions
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* AI Recommendations - Show when we have parking spots */}
          {filteredSpots.length > 0 && (
            <AIRecommendations
              parkingOptions={filteredSpots}
              userContext={{
                vehicleType: 'car',
                location: searchQuery || 'your search'
              }}
              onSelectParking={(parking) => {
                handleBookParking(parking._id);
              }}
            />
          )}

          {/* Empty State */}
          {filteredSpots.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🚗</div>
              <h3 className="empty-title">
                {searchQuery ? "No parking spots found" : "No parking available"}
              </h3>
              <p className="empty-description">
                {searchQuery
                  ? `We couldn't find any parking spots matching "${searchQuery}". Try searching for a different location.`
                  : "There are no parking spots available at the moment. Please check back later."
                }
              </p>
              {searchQuery && (
                <button
                  className="btn btn-primary"
                  onClick={() => setSearchQuery("")}
                >
                  Show All Spots
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}