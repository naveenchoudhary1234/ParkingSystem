import React, { useState, useCallback, useRef } from 'react';
import '../styles/GoogleMapPicker.css';

const GoogleMapPicker = ({ onLocationSelect, currentLocation, currentAddress }) => {
  const [latitude, setLatitude] = useState(currentLocation?.lat || '');
  const [longitude, setLongitude] = useState(currentLocation?.lng || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showMapHelper, setShowMapHelper] = useState(false);
  const mapRef = useRef(null);

  // Handle manual coordinate input
  const handleCoordinateChange = (type, value) => {
    if (type === 'lat') {
      setLatitude(value);
    } else {
      setLongitude(value);
    }
    
    // Auto-submit if both fields have valid values
    const lat = type === 'lat' ? parseFloat(value) : parseFloat(latitude);
    const lng = type === 'lng' ? parseFloat(value) : parseFloat(longitude);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      console.log("📍 Manual coordinates entered:", { lat, lng, currentAddress });
      
      onLocationSelect({
        lat: lat,
        lng: lng,
        address: currentAddress || null,
        coordinatesSource: 'manual'
      });
    }
  };

  // Get current GPS location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setLatitude(lat.toFixed(5));
          setLongitude(lng.toFixed(5));
          setIsLoading(false);
          
          console.log("📍 GPS location obtained:", { lat, lng, currentAddress });
          
          onLocationSelect({
            lat: lat,
            lng: lng,
            address: currentAddress || null,
            coordinatesSource: 'gps'
          });
        },
        (error) => {
          console.error("GPS Error:", error);
          setIsLoading(false);
          alert("Unable to get your location. Please enter coordinates manually or check location permissions.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  // Generate Google Maps URLs
  const getGoogleMapsSearchUrl = () => {
    const address = encodeURIComponent(currentAddress || 'parking location');
    return `https://www.google.com/maps/search/${address}`;
  };

  const getGoogleMapsCoordinateUrl = () => {
    if (latitude && longitude) {
      return `https://www.google.com/maps/@${latitude},${longitude},17z`;
    }
    return 'https://www.google.com/maps';
  };

  const getLatLongNetUrl = () => {
    const address = encodeURIComponent(currentAddress || '');
    return `https://www.latlong.net/convert-address-to-lat-long.html?address=${address}`;
  };

  // Copy coordinates to clipboard
  const copyCoordinates = () => {
    if (latitude && longitude) {
      const coords = `${latitude}, ${longitude}`;
      navigator.clipboard.writeText(coords).then(() => {
        alert('Coordinates copied to clipboard!');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = coords;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Coordinates copied to clipboard!');
      });
    }
  };

  return (
    <div className="google-map-picker">
      {/* Current Coordinates Display */}
      {latitude && longitude && (
        <div className="current-coordinates">
          <span className="coord-display">
            📍 Current: {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}
          </span>
          <button 
            type="button" 
            className="copy-btn"
            onClick={copyCoordinates}
            title="Copy coordinates to clipboard"
          >
            📋 Copy
          </button>
        </div>
      )}

      {/* Manual Coordinate Input */}
      <div className="coordinate-input-section">
        <div className="coordinate-inputs">
          <div className="input-group">
            <label>Latitude</label>
            <input
              type="number"
              step="any"
              placeholder="e.g., 28.6139"
              value={latitude}
              onChange={(e) => handleCoordinateChange('lat', e.target.value)}
              className="coordinate-input"
            />
          </div>
          <div className="input-group">
            <label>Longitude</label>
            <input
              type="number"
              step="any"
              placeholder="e.g., 77.2090"
              value={longitude}
              onChange={(e) => handleCoordinateChange('lng', e.target.value)}
              className="coordinate-input"
            />
          </div>
        </div>

        {/* GPS Button */}
        <button
          type="button"
          className="gps-btn"
          onClick={getCurrentLocation}
          disabled={isLoading}
        >
          {isLoading ? (
            <>🔄 Getting GPS...</>
          ) : (
            <>📡 Use My Location</>
          )}
        </button>
      </div>

      {/* Helper Links Section */}
      <div className="map-helper-section">
        <button 
          type="button"
          className="show-helper-btn"
          onClick={() => setShowMapHelper(!showMapHelper)}
        >
          🗺️ {showMapHelper ? 'Hide' : 'Show'} Location Helper Tools
        </button>

        {showMapHelper && (
          <div className="helper-tools">
            <h4>🎯 Find Your Exact Location:</h4>
            
            <div className="helper-links">
              <a 
                href={getGoogleMapsSearchUrl()}
                target="_blank" 
                rel="noopener noreferrer"
                className="helper-link google-maps"
              >
                🗺️ Search in Google Maps
                <small>Search for your address</small>
              </a>

              <a 
                href="https://www.google.com/maps"
                target="_blank" 
                rel="noopener noreferrer"
                className="helper-link google-maps-coords"
              >
                📍 Google Maps (Click Location)
                <small>Right-click any location to get coordinates</small>
              </a>

              <a 
                href={getLatLongNetUrl()}
                target="_blank" 
                rel="noopener noreferrer"
                className="helper-link latlong-net"
              >
                🌐 LatLong.net
                <small>Convert address to coordinates</small>
              </a>

              {latitude && longitude && (
                <a 
                  href={getGoogleMapsCoordinateUrl()}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="helper-link view-location"
                >
                  👁️ View Current Location
                  <small>See your coordinates on Google Maps</small>
                </a>
              )}
            </div>

            {/* Instructions */}
            <div className="helper-instructions">
              <h5>📋 How to get coordinates from Google Maps:</h5>
              <ol>
                <li>Click "Search in Google Maps" above</li>
                <li>Find your exact parking location</li>
                <li><strong>Right-click</strong> on the exact spot</li>
                <li>Click the coordinates that appear (e.g., "28.6139, 77.2090")</li>
                <li>Copy and paste them into the fields above</li>
              </ol>
              
              <div className="helper-tip">
                💡 <strong>Pro Tip:</strong> Zoom in close to your parking entrance for most accurate navigation!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Map Section - Using OpenStreetMap as fallback */}
      {currentAddress && (
        <div className="embedded-map-section">
          <h4>🗺️ Location Helper:</h4>
          
          {/* Direct Google Maps Links */}
          <div className="quick-map-links">
            <a 
              href={getGoogleMapsSearchUrl()}
              target="_blank" 
              rel="noopener noreferrer"
              className="quick-map-link primary"
            >
              🗺️ Open in Google Maps
            </a>
            
            <a 
              href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(currentAddress)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="quick-map-link secondary"
            >
              🌍 Open in OpenStreetMap
            </a>
          </div>

          <div className="map-instructions">
            <p><strong>📍 To get exact coordinates:</strong></p>
            <ol>
              <li>Click "Open in Google Maps" above</li>
              <li>Find your parking location and zoom in</li>
              <li><strong>Right-click</strong> on the exact spot</li>
              <li>Click the coordinates (numbers) that appear</li>
              <li>Copy and paste them into the coordinate fields above</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapPicker;