import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import "../styles/parking.css";

export default function Parking() {
  // console.log('🚗 Parking component initializing...'); // Removed to reduce spam
  const navigate = useNavigate();
  const [parkingSystems, setParkingSystems] = useState([]);
  const [filteredSystems, setFilteredSystems] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('🚀 Starting automatic location detection...');
  const [searchLocation, setSearchLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [filters, setFilters] = useState({
    spaceType: '',
    evCharger: '',
    maxVehicleSize: '',
    sortBy: 'distance'
  });
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  // Get user's current location automatically
  const getCurrentLocation = useCallback(() => {
    // Prevent multiple simultaneous calls
    if (gettingLocation) {
      console.log('🔄 Location detection already in progress, skipping...');
      return;
    }
    
    console.log('🎯 Starting automatic location detection...');
    setGettingLocation(true);
    setLocationStatus('📍 Automatically detecting your location to find nearby parking...');
    setError('');
    
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      setLocationStatus('❌ Geolocation is not supported by your browser');
      setError('Geolocation not supported - showing all parking areas');
      setGettingLocation(false);
      loadAllParkingSystems();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        const accuracy = position.coords.accuracy;
        
        console.log('✅ Location detected:', location);
        console.log('📍 GPS Accuracy:', accuracy, 'meters');
        console.log('🗺️ Detected location appears to be near:', 
          location.lat > 31 ? 'Chandigarh/Haryana region' : 
          location.lat > 30.5 ? 'Punjab region' : 'Southern Punjab region');
        
        // Check GPS accuracy
        if (accuracy > 10000) { // More than 10km inaccuracy
          console.warn('⚠️ GPS accuracy is very poor:', accuracy, 'meters');
          setLocationStatus(`⚠️ GPS accuracy is poor (±${Math.round(accuracy/1000)}km). Consider using manual search or try again.`);
          setError(`GPS accuracy is poor (±${Math.round(accuracy/1000)}km). Results may not be accurate.`);
        } else {
          setLocationStatus(`✅ Location detected! Searching for nearby parking areas...`);
        }
        
        setUserLocation(location);
        
        try {
          await searchNearbyParking(location.lat, location.lng);
        } catch (err) {
          console.error('❌ Nearby search failed:', err);
          setError('Failed to search nearby parking');
          setLocationStatus('❌ Could not find nearby parking - showing all areas');
          loadAllParkingSystems();
        }
        setGettingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        let errorMessage = '❌ Unable to get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access to find nearby parking.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        setLocationStatus(errorMessage);
        setError(errorMessage);
        setGettingLocation(false);
        // Load all parking systems as fallback
        loadAllParkingSystems();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [gettingLocation]); // Add gettingLocation as dependency

  // Debug: Manual location override for testing
  const testNearChitkara = () => {
    const testLocation = { lat: 30.6, lng: 76.6 }; // Closer to Chitkara for testing
    console.log('🧪 Testing with manual coordinates near Chitkara:', testLocation);
    setUserLocation(testLocation);
    setLocationStatus('🧪 Testing with manual coordinates near Chitkara...');
    searchNearbyParking(testLocation.lat, testLocation.lng);
  };

  // Manual coordinate search
  const handleManualCoordSearch = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Please enter valid coordinates (Lat: -90 to 90, Lng: -180 to 180)');
      return;
    }
    
    const manualLocation = { lat, lng };
    console.log('📍 Manual coordinate search:', manualLocation);
    setUserLocation(manualLocation);
    setLocationStatus(`📍 Using manual coordinates: ${lat}, ${lng}`);
    setError('');
    searchNearbyParking(lat, lng);
    setShowManualCoords(false);
  };

  // Search for nearby parking properties using the correct API
  const searchNearbyParking = async (lat, lng, radius = 40000) => { // Increased to 40km for testing
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      console.log(`🔍 Searching nearby parking at lat=${lat}, lng=${lng}`);
      
      const response = await apiRequest(
        `/parking-property/search?lat=${lat}&lng=${lng}&radius=${radius}`, 
        "GET", 
        null, 
        token
      );
      
      if (response && Array.isArray(response)) {
        // Calculate distances and add to the response
        const systemsWithDistance = response.map(system => ({
          ...system,
          distance: calculateDistance(lat, lng, system.lat, system.lng)
        }));
        
        // Sort by distance by default
        systemsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        
        setParkingSystems(systemsWithDistance);
        setFilteredSystems(systemsWithDistance);
        setLocationStatus(`🎯 Found ${systemsWithDistance.length} parking areas within ${radius/1000}km radius`);
        setError('');
        
        // Add debugging information
        console.log('🎯 Nearby parking search results:', {
          userLat: lat,
          userLng: lng,
          radius: radius,
          foundSystems: systemsWithDistance.length,
          systems: systemsWithDistance.map(s => ({ 
            name: s.name, 
            distance: s.distance?.toFixed(2) + 'km',
            lat: s.lat,
            lng: s.lng
          }))
        });
        
        if (systemsWithDistance.length === 0) {
          console.log('🚨 ZERO results found - triggering fallback to load all properties');
          setLocationStatus('❌ No parking found in your area - loading all available properties...');
          
          // Fallback: Load all approved properties 
          try {
            console.log('🔄 Executing fallback: loadAllParkingSystems()');
            await loadAllParkingSystems();
          } catch (fallbackErr) {
            console.error('❌ Fallback loading failed:', fallbackErr);
          }
        }
      } else {
        console.log('❌ No nearby parking found - trying to load all approved properties as fallback');
        setParkingSystems([]);
        setFilteredSystems([]);
        setLocationStatus('❌ No parking found in your area - showing all available properties');
        
        // Fallback: Load all approved properties 
        try {
          await loadAllParkingSystems();
        } catch (fallbackErr) {
          console.error('❌ Fallback loading failed:', fallbackErr);
        }
      }
    } catch (err) {
      console.error('Search nearby error:', err);
      setError('Failed to search nearby parking. Please try again.');
      setLocationStatus('❌ Search failed');
      // Try to load all parking as fallback
      loadAllParkingSystems();
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Load all approved parking properties (fallback)
  const loadAllParkingSystems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      console.log('🔄 Loading all approved parking properties...');
      const response = await apiRequest('/parking-property/approved', 'GET', null, token);
      
      if (response && Array.isArray(response)) {
        setParkingSystems(response);
        setFilteredSystems(response);
        setLocationStatus(`📍 Showing all ${response.length} available parking areas`);
        setError('');
      } else {
        setParkingSystems([]);
        setFilteredSystems([]);
        setLocationStatus('❌ No parking systems found');
      }
    } catch (err) {
      console.error('Load all error:', err);
      setError('Failed to load parking systems');
      setLocationStatus('❌ Unable to load parking data');
      setParkingSystems([]);
      setFilteredSystems([]);
    } finally {
      setLoading(false);
    }
  };

  // Search by address with geocoding simulation
  const handleSearchByAddress = async () => {
    if (!searchLocation.trim()) {
      setError('Please enter a location to search');
      return;
    }
    
    setLoading(true);
    setLocationStatus(`🔍 Searching for parking near "${searchLocation}"...`);
    setError('');
    
    try {
      // For now, filter by address matching
      // In production, you'd want to geocode the address first using Google Maps API or similar
      const filtered = parkingSystems.filter(system => {
        const searchTerm = searchLocation.toLowerCase();
        return system.address?.toLowerCase().includes(searchTerm) ||
               system.name?.toLowerCase().includes(searchTerm) ||
               system.description?.toLowerCase().includes(searchTerm);
      });
      
      setFilteredSystems(filtered);
      setLocationStatus(`🎯 Found ${filtered.length} results for "${searchLocation}"`);
      
      if (filtered.length === 0) {
        setError('No parking found for this location. Try a different search term.');
      }
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced filter application
  const applyFilters = useCallback(() => {
    let filtered = [...parkingSystems];

    // Apply filters
    if (filters.spaceType) {
      filtered = filtered.filter(system => system.spaceType === filters.spaceType);
    }

    if (filters.evCharger) {
      const needsEvCharger = filters.evCharger === 'yes';
      filtered = filtered.filter(system => system.evCharger === needsEvCharger);
    }

    if (filters.maxVehicleSize) {
      filtered = filtered.filter(system => system.maxVehicleSize === filters.maxVehicleSize);
    }

    // Sort by selected criteria
    if (filters.sortBy === 'distance' && userLocation) {
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (filters.sortBy === 'price') {
      filtered.sort((a, b) => (a.pricePerHour || 0) - (b.pricePerHour || 0));
    } else if (filters.sortBy === 'availability') {
      filtered.sort((a, b) => (b.availableSlots || 0) - (a.availableSlots || 0));
    } else if (filters.sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    setFilteredSystems(filtered);
  }, [parkingSystems, filters, userLocation]);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  // Format distance for display
  const formatDistance = (distance) => {
    if (!distance) return '';
    if (distance < 1000) {
      return `${Math.round(distance)}m away`;
    }
    return `${(distance / 1000).toFixed(1)}km away`;
  };

  // Get parking image or default
  const getParkingImage = (system) => {
    // Check for photos first (ParkingProperty), then images (ParkingSystem)
    if (system.photos && system.photos.length > 0) {
      return system.photos[0];
    }
    if (system.images && system.images.length > 0) {
      return system.images[0];
    }
    // Default parking image
    return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60';
  };

  // Handle booking navigation
  const handleBookParking = (parkingSystem) => {
    const totalSlots = (parkingSystem.carSlots || 0) + (parkingSystem.bikeSlots || 0);
    const availableSlots = parkingSystem.availableSlots || totalSlots;
    
    if (!totalSlots || totalSlots <= 0) {
      setError('No parking slots available in this property');
      return;
    }
    
    if (availableSlots <= 0) {
      setError('All slots are currently booked');
      return;
    }
    
    // Navigate to booking page with parking property ID
    navigate(`/book-slot?parkingSystemId=${parkingSystem._id}`);
  };

  // Show more details
  const handleShowDetails = (parkingSystem) => {
    navigate(`/parking-details/${parkingSystem._id}`);
  };

  // Auto-detect location on component mount
  useEffect(() => {
    // Only run if we don't have location and aren't already getting it
    if (!userLocation && !gettingLocation) {
      console.log('🚗 useEffect triggered! Component mounted - automatically detecting location...');
      console.log('📊 Component state:', { gettingLocation, userLocation, locationStatus });
      console.log('🌍 Navigator geolocation available:', !!navigator.geolocation);
      
      // Add a small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        console.log('⏰ Timer executed - calling getCurrentLocation');
        getCurrentLocation();
      }, 100);
      
      return () => {
        console.log('🧹 Component cleanup - clearing timer');
        clearTimeout(timer);
      };
    }
  }, []); // Empty dependency array - only run once on mount

  // Apply filters when they change
  useEffect(() => {
    if (parkingSystems.length > 0) { // Only apply filters if we have data
      console.log('🔄 Applying filters due to data change...');
      applyFilters();
    }
  }, [parkingSystems, filters, userLocation]); // Direct dependencies instead of applyFilters

  return (
    <div className="parking-search-container">
      <div className="parking-search-wrapper">
        {/* Enhanced Header */}
        <div className="parking-header">
          <h1 className="parking-title">🚗 Find Your Perfect Parking Spot</h1>
          <p className="parking-subtitle">
            Discover convenient parking spaces near you with real-time availability,
            secure booking, and competitive pricing. Click the location button to automatically
            find nearby parking or search by address.
          </p>
        </div>

        {/* Enhanced Location Search */}
        <div className="location-search-section">
          <div className="search-controls">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="🔍 Enter address, landmark, or area to search..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="location-input"
                onKeyPress={(e) => e.key === 'Enter' && handleSearchByAddress()}
              />
              <button 
                onClick={handleSearchByAddress}
                className="search-btn"
                disabled={loading}
                title="Search by address"
              >
                {loading ? '⏳' : '🔍'} Search
              </button>
              
              {/* Quick actions */}
              <button
                onClick={loadAllParkingSystems}
                className="show-all-btn"
                disabled={loading}
                title="Show all approved parking properties"
              >
                🏢 Show All Parking
              </button>
            </div>
            
            {/* Manual Coordinates Input */}
            {showManualCoords && (
              <div style={{ 
                marginTop: '15px', 
                padding: '15px', 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <h4 style={{ color: 'var(--text-dark)', marginBottom: '10px' }}>
                  📍 Enter Exact Coordinates
                </h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (e.g., 30.5157)"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'var(--text-dark)',
                      minWidth: '150px'
                    }}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (e.g., 76.6592)"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'var(--text-dark)',
                      minWidth: '150px'
                    }}
                  />
                  <button 
                    onClick={handleManualCoordSearch}
                    className="search-btn"
                    style={{ backgroundColor: '#4caf50' }}
                  >
                    🔍 Search
                  </button>
                  <button 
                    onClick={() => {
                      setManualLat('30.5157');
                      setManualLng('76.6592');
                    }}
                    className="search-btn"
                    style={{ backgroundColor: '#2196f3', fontSize: '0.8rem' }}
                    title="Fill with Chitkara University coordinates"
                  >
                    🎯 Chitkara Coords
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '8px', marginBottom: '0' }}>
                  Tip: Use Google Maps to get exact coordinates. Right-click any location → coordinates will appear.
                </p>
              </div>
            )}
            
            <button 
              onClick={getCurrentLocation}
              className={`location-btn ${gettingLocation ? 'getting-location' : ''}`}
              disabled={gettingLocation}
              title="Get nearby parking using your current location"
            >
              {gettingLocation ? (
                <>⏳ Getting Location...</>
              ) : (
                <>📍 Find Nearby Parking</>
              )}
            </button>
          </div>
          
          {locationStatus && (
            <div className={`location-status ${
              error ? 'error' : 
              gettingLocation || loading ? 'loading' : 
              'success'
            }`}>
              {locationStatus}
            </div>
          )}
          
          {userLocation && (
            <div className="location-info">
              ✅ Location services enabled - showing results sorted by distance
            </div>
          )}
        </div>

        {/* Enhanced Filters */}
        <div className="parking-filters">
          <h3 className="filter-title">🎯 Refine Your Search</h3>
          <div className="filter-grid">
            <div className="filter-group">
              <label className="filter-label">🏢 Space Type</label>
              <select 
                className="filter-select"
                value={filters.spaceType}
                onChange={(e) => handleFilterChange('spaceType', e.target.value)}
              >
                <option value="">Any Type</option>
                <option value="Open">🌤️ Open Air</option>
                <option value="Covered">🏠 Covered</option>
                <option value="Underground">🚇 Underground</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">⚡ EV Charger</label>
              <select 
                className="filter-select"
                value={filters.evCharger}
                onChange={(e) => handleFilterChange('evCharger', e.target.value)}
              >
                <option value="">No Preference</option>
                <option value="yes">✅ Required</option>
                <option value="no">❌ Not Required</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">🚙 Vehicle Size</label>
              <select 
                className="filter-select"
                value={filters.maxVehicleSize}
                onChange={(e) => handleFilterChange('maxVehicleSize', e.target.value)}
              >
                <option value="">Any Size</option>
                <option value="Small Car">🚗 Small Car</option>
                <option value="Large Car">🚙 Large Car</option>
                <option value="SUV">🚐 SUV</option>
                <option value="Truck">🚛 Truck</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">📊 Sort By</label>
              <select 
                className="filter-select"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="distance">📍 Distance</option>
                <option value="price">💰 Price (Low to High)</option>
                <option value="availability">🅿️ Availability</option>
                <option value="rating">⭐ Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced Results Section */}
        <div className="parking-results">
          {!loading && !gettingLocation && (
            <div className="results-header">
              <div className="results-count">
                🎯 <strong>{filteredSystems.length}</strong> parking {filteredSystems.length === 1 ? 'area' : 'areas'} found
                {userLocation && ' - sorted by distance from your location'}
              </div>
            </div>
          )}

          {(loading || gettingLocation) ? (
            <div className="parking-loading">
              <div className="loading-spinner"></div>
              <div className="loading-text">
                {gettingLocation ? '📍 Getting your location and finding nearby parking...' : 
                 '🔍 Finding perfect parking spots for you...'}
              </div>
            </div>
          ) : filteredSystems.length === 0 ? (
            <div className="parking-empty">
              <div className="empty-icon">🚗💨</div>
              <h3 className="empty-title">No Parking Found</h3>
              <p className="empty-description">
                We couldn't find any parking spaces matching your criteria. 
                Try adjusting your filters, search in a different area, or enable location services.
              </p>
              <div className="empty-actions">
                <button 
                  onClick={() => {
                    setFilters({ spaceType: '', evCharger: '', maxVehicleSize: '', sortBy: 'distance' });
                    setSearchLocation('');
                    getCurrentLocation();
                  }}
                  className="try-again-btn"
                >
                  📍 Try Current Location
                </button>
                <button 
                  onClick={loadAllParkingSystems}
                  className="show-all-btn"
                >
                  🏢 Show All Parking
                </button>
              </div>
            </div>
          ) : (
            <div className="parking-grid">
              {filteredSystems.map((system) => (
                <div key={system._id} className="parking-card">
                  <div className="parking-card-image">
                    <img 
                      src={getParkingImage(system)} 
                      alt={system.name}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60';
                      }}
                    />
                    {system.distance && (
                      <div className="distance-badge">
                        📍 {formatDistance(system.distance)}
                      </div>
                    )}
                    <div className="availability-badge">
                      {system.carSlots > 0 ? (
                        <span className="available">✅ {system.carSlots} Car Slots</span>
                      ) : (
                        <span className="full">❌ No Slots</span>
                      )}
                      {system.bikeSlots > 0 && (
                        <span className="available">🏍️ {system.bikeSlots} Bike Slots</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="parking-card-content">
                    <div className="parking-card-header">
                      <h3 className="parking-name">{system.name}</h3>
                      <div className="parking-rating">
                        ⭐ {system.rating || '4.5'}
                      </div>
                    </div>

                    <div className="parking-address">
                      📍 {system.address || system.fullAddress}
                    </div>

                    {system.contactNumber && (
                      <div className="parking-contact">
                        📞 <a href={`tel:${system.contactNumber}`} className="contact-link">{system.contactNumber}</a>
                      </div>
                    )}

                    <div className="parking-features">
                      <span className="feature-tag type">🏢 Parking</span>
                      <span className="feature-tag slots">🚗 {system.carSlots} Cars</span>
                      {system.bikeSlots > 0 && <span className="feature-tag slots">🏍️ {system.bikeSlots} Bikes</span>}
                    </div>

                    <div className="parking-info">
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-icon">💰</span>
                          <div>
                            <span className="info-value">₹{system.pricePerHour || 50}</span>
                            <span className="info-label">per hour</span>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon">🅿️</span>
                          <div>
                            <span className="info-value">{system.carSlots + (system.bikeSlots || 0)}</span>
                            <span className="info-label">total slots</span>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon">�</span>
                          <div>
                            <span className="info-value">{system.approved ? 'Active' : 'Pending'}</span>
                            <span className="info-label">status</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="parking-actions">
                      <button 
                        onClick={() => handleBookParking(system)}
                        className={`book-btn ${system.carSlots <= 0 ? 'disabled' : ''}`}
                        disabled={system.carSlots <= 0}
                      >
                        {system.carSlots > 0 ? '🎯 Book Now' : '❌ No Slots'}
                      </button>
                      <button 
                        onClick={() => handleShowDetails(system)}
                        className="details-btn"
                      >
                        📋 View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && !loading && !gettingLocation && (
          <div className="error-notification">
            ❌ {error}
            <button 
              className="dismiss-error" 
              onClick={() => setError('')}
              title="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
