import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import '../styles/favorite-button.css';

const FavoriteButton = ({ propertyId, size = 'medium' }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);

  useEffect(() => {
    checkFavoriteStatus();
  }, [propertyId]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await apiRequest(`/favorites/check/${propertyId}`, 'GET');
      setIsFavorite(response.isFavorited);
      setFavoriteId(response.favoriteId);
    } catch (error) {
      console.error('Check favorite error:', error);
    }
  };

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    setLoading(true);
    try {
      if (isFavorite) {
        await apiRequest(`/favorites/remove/${propertyId}`, 'DELETE');
        setIsFavorite(false);
        setFavoriteId(null);
        alert('❌ Removed from favorites');
      } else {
        const response = await apiRequest('/favorites/add', 'POST', { propertyId });
        setIsFavorite(true);
        setFavoriteId(response.favorite._id);

        // Show success message with link
        const goToFavorites = window.confirm(
          '✅ Added to favorites!\n\n👉 View all your favorites now?'
        );

        if (goToFavorites) {
          window.location.href = '/profile?tab=favorites';
        }
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      alert(error.message || 'Please login to add favorites');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`favorite-btn ${size} ${isFavorite ? 'favorited' : ''} ${loading ? 'loading' : ''}`}
      onClick={toggleFavorite}
      disabled={loading}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );
};

export default FavoriteButton;
