import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import '../styles/parking-details.css';

export default function ParkingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageLoaded, setImageLoaded] = useState(true);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const res = await apiRequest(`/parking-property/${id}`);
        setProperty(res || null);

        // try to load slots (not all APIs return slots, so tolerate failures)
        try {
          const slotRes = await apiRequest(`/parking-property/${id}/slots`);
          if (Array.isArray(slotRes)) setSlots(slotRes);
        } catch (e) {
          // ignore
        }

        setError('');
      } catch (err) {
        console.error('Failed to load property', err);
        setError(err.message || 'Failed to load property');
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  const openNavigation = (loc) => {
    if (!loc) return alert('Location not available');
    const lat = loc.coordinates ? loc.coordinates[1] : loc.lat || loc.latitude;
    const lng = loc.coordinates ? loc.coordinates[0] : loc.lng || loc.longitude;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const googleMapsUrl = `https://www.google.com/maps/dir/${latitude},${longitude}/${lat},${lng}`;
          window.open(googleMapsUrl, '_blank');
        },
        () => {
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
          window.open(googleMapsUrl, '_blank');
        }
      );
    } else {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleBook = () => {
    // Navigate to booking flow - reuse existing book-slot route
    navigate(`/book-slot?parkingSystemId=${id}`);
  };

  if (loading) return (
    <div className="parking-details-page">
      <div className="pd-loading">Loading property...</div>
    </div>
  );

  if (error) return (
    <div className="parking-details-page">
      <div className="pd-error">Error: {error}</div>
    </div>
  );

  if (!property) return (
    <div className="parking-details-page">
      <div className="pd-empty">Property not found</div>
    </div>
  );

  const mainImage = property.photos?.[0] || property.images?.[0] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=60';
  const lat = property.location?.coordinates ? property.location.coordinates[1] : property.lat || property.latitude;
  const lng = property.location?.coordinates ? property.location.coordinates[0] : property.lng || property.longitude;

  return (
    <div className="parking-details-page">
      <section className="pd-hero">
        <div className="container">
          <div className="pd-hero-grid">
            <div className="pd-image">
              {imageLoaded ? (
                <img
                  src={mainImage}
                  alt={property.name}
                  className="pd-image-img"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(false)}
                />
              ) : (
                <div className="pd-image-fallback" aria-hidden>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <rect width="24" height="24" rx="4" fill="#e6f0ff"/>
                    <path d="M4 15l4-5 3 4 5-7 4 7v2H4v-1z" fill="#cfe3ff"/>
                  </svg>
                  <div className="pd-image-fallback-text">No image available</div>
                </div>
              )}
            </div>
            <div className="pd-summary">
              <h1 className="pd-title">{property.name}</h1>
              <p className="pd-address">📍 {property.fullAddress || property.address}</p>
              <div className="pd-meta">
                <div className="pd-price">₹{property.pricePerHour || '—'} / hour</div>
                <div className="pd-rating">⭐ {property.rating || '—'}</div>
              </div>

              <p className="pd-description">{property.description || 'No description available.'}</p>

              <div className="pd-actions">
                <button className="btn btn-primary" onClick={handleBook}>Book Now</button>
                <button className="btn btn-outline" onClick={() => openNavigation(property.location)}>Get Directions</button>
                {property.contactNumber && (
                  <a className="btn btn-secondary" href={`tel:${property.contactNumber}`}>Call: {property.contactNumber}</a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pd-details container">
        <div className="pd-columns">
          <div className="pd-left">
            <h3>Availability</h3>
            <div className="pd-availability">
              <div className="pd-availability-item">
                <div className="label">Cars</div>
                <div className={`count ${((property.availability?.carSlots?.available || property.carSlots || 0) === 0) ? 'full' : 'available'}`}>
                  {property.availability?.carSlots?.available ?? property.carSlots ?? 0}
                </div>
              </div>
              <div className="pd-availability-item">
                <div className="label">Bikes</div>
                <div className={`count ${((property.availability?.bikeSlots?.available || property.bikeSlots || 0) === 0) ? 'full' : 'available'}`}>
                  {property.availability?.bikeSlots?.available ?? property.bikeSlots ?? 0}
                </div>
              </div>
            </div>

            <h3>Features</h3>
            <div className="pd-features">
              {property.evCharger && <span className="feature">⚡ EV Charger</span>}
              {property.covered && <span className="feature">🏠 Covered</span>}
              {property.security && <span className="feature">🔒 Security</span>}
              {property.maxVehicleSize && <span className="feature">🚗 {property.maxVehicleSize}</span>}
            </div>

            <h3>Slots</h3>
            <div className="pd-slots">
              {slots.length === 0 ? (
                <p className="muted">Slot-level information is not available for this property.</p>
              ) : (
                <ul>
                  {slots.map((s, idx) => {
                    const label = s.name || s.slotId || `Slot ${idx + 1}`;
                    const status = (s.status || 'available').toLowerCase();
                    return (
                      <li key={s._id || idx} className="slot-item">
                        <div className="slot-name">{label}</div>
                        <div className={`slot-status ${status}`}>{status}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <aside className="pd-right">
            <div className="pd-map-card">
              <h4>Map</h4>
              {lat && lng ? (
                <iframe
                  title="property-map"
                  src={`https://www.google.com/maps?q=${lat},${lng}&output=embed`}
                  loading="lazy"
                />
              ) : (
                <p className="muted">Location coordinates not available.</p>
              )}
            </div>

            <div className="pd-contact-card">
              <h4>Contact</h4>
              <p className="muted">{property.contactName || 'Owner'}</p>
              {property.contactNumber && <a href={`tel:${property.contactNumber}`} className="contact-link">{property.contactNumber}</a>}
              {property.email && <a href={`mailto:${property.email}`} className="contact-link">{property.email}</a>}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
