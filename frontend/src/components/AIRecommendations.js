/**
 * AI Recommendations Component
 * Feature 1: Display AI-powered parking recommendations
 */

import React, { useState, useEffect } from 'react';
import { getAIRecommendations } from '../services/aiService';
import '../styles/ai-recommendations.css';

const AIRecommendations = ({ parkingOptions, userContext, onSelectParking }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const fetchRecommendations = async () => {
    if (!parkingOptions || parkingOptions.length === 0) {
      setError('No parking options available for recommendations');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getAIRecommendations(parkingOptions, userContext);
      setRecommendations(response.recommendations || []);
      setSummary(response.summary || '');
      setShowRecommendations(true);
    } catch (err) {
      setError('Failed to get AI recommendations. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Find parking object by ID
  const findParkingById = (parkingId) => {
    return parkingOptions.find(p => p._id === parkingId);
  };

  if (!parkingOptions || parkingOptions.length === 0) {
    return null;
  }

  return (
    <div className="ai-recommendations-container">
      {!showRecommendations ? (
        <button 
          className="ai-suggest-btn"
          onClick={fetchRecommendations}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-small"></span>
              Analyzing options...
            </>
          ) : (
            <>
              <span className="ai-icon">🤖</span>
              Get AI Recommendations
            </>
          )}
        </button>
      ) : (
        <div className="ai-recommendations-panel">
          <div className="ai-panel-header">
            <h3>
              <span className="ai-icon">🤖</span>
              AI-Powered Recommendations
            </h3>
            <button 
              className="close-btn"
              onClick={() => setShowRecommendations(false)}
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="ai-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {summary && (
            <div className="ai-summary">
              <p>{summary}</p>
            </div>
          )}

          <div className="ai-recommendations-list">
            {recommendations.map((rec, index) => {
              const parking = findParkingById(rec.parkingId);
              if (!parking) return null;

              return (
                <div key={rec.parkingId} className="ai-recommendation-card">
                  <div className="rec-rank">#{rec.rank}</div>
                  <div className="rec-content">
                    <div className="rec-header">
                      <h4>{parking.name}</h4>
                      <div className="rec-score">
                        Score: {rec.score}/100
                      </div>
                    </div>
                    <p className="rec-address">{parking.address}</p>
                    <p className="rec-reason">
                      <strong>Why:</strong> {rec.reason}
                    </p>
                    <div className="rec-highlights">
                      {rec.highlights?.map((highlight, idx) => (
                        <span key={idx} className="highlight-tag">
                          ✓ {highlight}
                        </span>
                      ))}
                    </div>
                    <div className="rec-actions">
                      <button
                        className="view-details-btn"
                        onClick={() => window.location.href = `/parking-details/${parking._id}`}
                      >
                        📋 View Details
                      </button>
                      <button
                        className="book-now-btn"
                        onClick={() => window.location.href = `/book-slot?parkingSystemId=${parking._id}`}
                      >
                        🎯 Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            className="refresh-btn"
            onClick={fetchRecommendations}
            disabled={loading}
          >
            🔄 Refresh Recommendations
          </button>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
