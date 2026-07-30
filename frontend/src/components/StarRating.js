import React, { useState } from 'react';
import '../styles/star-rating.css';

const StarRating = ({ rating, setRating, readonly = false, size = 'medium' }) => {
  const [hover, setHover] = useState(0);

  const handleClick = (value) => {
    if (!readonly && setRating) {
      setRating(value);
    }
  };

  return (
    <div className={`star-rating ${size} ${readonly ? 'readonly' : 'interactive'}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star ${star <= (hover || rating) ? 'filled' : 'empty'}`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
        >
          ★
        </button>
      ))}
      {!readonly && rating > 0 && (
        <span className="rating-text">{rating} / 5</span>
      )}
    </div>
  );
};

export default StarRating;
