import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import StarRating from "../components/StarRating";
import "../styles/favorites.css";

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/favorites/my-favorites", "GET");
      setFavorites(response.favorites || []);
    } catch (err) {
      console.error("Fetch favorites error:", err);
      setError(err.message || "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (propertyId) => {
    if (!window.confirm("Remove this property from favorites?")) return;

    try {
      await apiRequest(`/favorites/remove/${propertyId}`, "DELETE");
      setFavorites(favorites.filter((f) => f.property._id !== propertyId));
      alert("✅ Removed from favorites");
    } catch (err) {
      alert("Failed to remove favorite");
    }
  };

  const handleBookNow = (propertyId) => {
    navigate(`/book-slot?parkingSystemId=${propertyId}`);
  };

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="loading">Loading your favorites...</div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="favorites-container">
        <div className="favorites-header">
          <h1>❤️ My Favorite Parking Spots</h1>
          <p>Quick access to your saved parking locations</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {favorites.length === 0 ? (
          <div className="empty-favorites">
            <div className="empty-icon">💔</div>
            <h2>No Favorites Yet</h2>
            <p>Start adding your favorite parking spots for quick access!</p>
            <button onClick={() => navigate("/parking")} className="btn-primary">
              🔍 Browse Parking Spots
            </button>
          </div>
        ) : (
          <div className="favorites-grid">
            {favorites.map((fav) => (
              <div key={fav._id} className="favorite-card">
                {fav.property.photos && fav.property.photos.length > 0 && (
                  <div className="favorite-image">
                    <img
                      src={fav.property.photos[0]}
                      alt={fav.property.name}
                      onError={(e) => {
                        e.target.src =
                          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400";
                      }}
                    />
                  </div>
                )}

                <div className="favorite-content">
                  <div className="favorite-header">
                    <h3>{fav.nickname || fav.property.name}</h3>
                    {fav.property.averageRating > 0 && (
                      <StarRating
                        rating={fav.property.averageRating}
                        readonly={true}
                        size="small"
                      />
                    )}
                  </div>

                  <p className="favorite-address">
                    📍 {fav.property.address}
                  </p>

                  <div className="favorite-details">
                    <span className="detail-item">
                      💰 ₹{fav.property.pricePerHour}/hour
                    </span>
                    <span className="detail-item">
                      🚗 {fav.property.carSlots} cars
                    </span>
                    <span className="detail-item">
                      🏍️ {fav.property.bikeSlots} bikes
                    </span>
                  </div>

                  {fav.property.totalReviews > 0 && (
                    <p className="review-count">
                      ⭐ {fav.property.averageRating.toFixed(1)} (
                      {fav.property.totalReviews} reviews)
                    </p>
                  )}

                  <div className="favorite-actions">
                    <button
                      onClick={() => handleBookNow(fav.property._id)}
                      className="btn-book"
                    >
                      🎯 Book Now
                    </button>
                    <button
                      onClick={() => removeFavorite(fav.property._id)}
                      className="btn-remove"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
