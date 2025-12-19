import React, { useState } from 'react';
import '../styles/LocationSearchComponent.css';

const LocationSearchComponent = ({ onLocationSelect, currentLocation, currentAddress }) => {
  const [latitude, setLatitude] = useState(currentLocation?.lat || '');
  const [longitude, setLongitude] = useState(currentLocation?.lng || '');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-submit when values change
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
      // Don't overwrite the existing address - keep the user's original address
      console.log("📍 LocationSearchComponent - Manual coordinates entered:", {
        lat: lat,
        lng: lng,
        currentAddress: currentAddress,
        willPreserveAddress: true
      });
      
      onLocationSelect({
        lat: lat,
        lng: lng,
        address: currentAddress || null, // Keep original address, don't use coordinates as address
        coordinatesSource: 'manual'
      });
    }
  };

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
          
          // Don't overwrite address with coordinates - keep original address
          onLocationSelect({
            lat: lat,
            lng: lng,
            address: currentAddress || null, // Keep original address
            coordinatesSource: 'gps'
          });
        },
        (error) => {
          setIsLoading(false);
          alert('Unable to get your current location. Please enter coordinates manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className="simple-location-container">
      <div className="location-inputs">
        <div className="coordinate-group">
          <label className="coordinate-label">Latitude:</label>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => handleCoordinateChange('lat', e.target.value)}
            placeholder="30.12345"
            className="coordinate-input"
          />
        </div>
        
        <div className="coordinate-group">
          <label className="coordinate-label">Longitude:</label>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => handleCoordinateChange('lng', e.target.value)}
            placeholder="76.78901"
            className="coordinate-input"
          />
        </div>
      </div>
      
      <div className="location-actions">
        <button 
          type="button"
          onClick={getCurrentLocation}
          className="gps-btn"
          disabled={isLoading}
        >
          {isLoading ? '📍 Getting Location...' : '📍 Use GPS'}
        </button>
      </div>
      
      <div className="location-help">
        <div className="help-section">
          <p><strong>📝 Instructions:</strong></p>
          <ol>
            <li>First, enter your complete address in the "Full Address" field above</li>
            <li>Then enter coordinates here (these won't change your address)</li>
            <li>Or click "Use GPS" to get your current coordinates</li>
          </ol>
        </div>
        <div className="help-note">
          <p><small>💡 <strong>Note:</strong> Coordinates are used for location mapping, but your address will be used for navigation.</small></p>
        </div>
      </div>
    </div>
  );
};

export default LocationSearchComponent;