/**
 * AI Pricing Suggestion Component
 * Feature 4: AI-powered pricing optimization for rental owners
 */

import React, { useState } from 'react';
import { getPricingSuggestions } from '../services/aiService';
import '../styles/ai-pricing.css';

const AIPricingSuggestion = ({ propertyData, onApplyPrice }) => {
  const [loading, setLoading] = useState(false);
  const [pricingSuggestion, setPricingSuggestion] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState(null);

  const fetchPricingSuggestion = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getPricingSuggestions(propertyData);
      setPricingSuggestion(response.pricing);
      setShowDetails(true);
    } catch (err) {
      setError('Failed to get AI pricing suggestions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPrice = (price) => {
    if (onApplyPrice) {
      onApplyPrice(price);
    }
    setShowDetails(false);
  };

  return (
    <div className="ai-pricing-container">
      {!showDetails ? (
        <button
          className="ai-pricing-btn"
          onClick={fetchPricingSuggestion}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-small"></span>
              Analyzing market...
            </>
          ) : (
            <>
              <span className="ai-icon">🤖</span>
              Get AI Pricing Suggestions
            </>
          )}
        </button>
      ) : (
        <div className="ai-pricing-panel">
          <div className="pricing-header">
            <h3>
              <span className="ai-icon">🤖</span>
              AI Pricing Analysis
            </h3>
            <button
              className="close-btn"
              onClick={() => setShowDetails(false)}
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="pricing-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {pricingSuggestion && (
            <div className="pricing-content">
              {/* Suggested Price */}
              <div className="suggested-price-box">
                <div className="price-label">Recommended Price</div>
                <div className="price-value">
                  ₹{pricingSuggestion.suggestedPrice}
                  <span className="price-unit">/hour</span>
                </div>
                <div className="price-strategy">
                  Strategy: <span className="strategy-badge">
                    {pricingSuggestion.pricingStrategy}
                  </span>
                </div>
              </div>

              {/* Price Range */}
              <div className="price-range-section">
                <h4>Competitive Range</h4>
                <div className="price-range-bar">
                  <div className="range-min">
                    ₹{pricingSuggestion.priceRange.min}
                  </div>
                  <div className="range-indicator">
                    <div className="range-fill"></div>
                    <div 
                      className="range-marker"
                      style={{
                        left: `${((pricingSuggestion.suggestedPrice - pricingSuggestion.priceRange.min) / 
                                (pricingSuggestion.priceRange.max - pricingSuggestion.priceRange.min)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="range-max">
                    ₹{pricingSuggestion.priceRange.max}
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="pricing-reasoning">
                <h4>Why this price?</h4>
                <p>{pricingSuggestion.reasoning}</p>
              </div>

              {/* Demand Forecast */}
              <div className="demand-forecast">
                <h4>Demand Forecast</h4>
                <div className={`demand-badge demand-${pricingSuggestion.demandForecast}`}>
                  {pricingSuggestion.demandForecast.toUpperCase()}
                  {pricingSuggestion.demandForecast === 'high' && ' 🔥'}
                  {pricingSuggestion.demandForecast === 'medium' && ' 📊'}
                  {pricingSuggestion.demandForecast === 'low' && ' 📉'}
                </div>
              </div>

              {/* Tips */}
              {pricingSuggestion.tips && pricingSuggestion.tips.length > 0 && (
                <div className="pricing-tips">
                  <h4>💡 Pro Tips</h4>
                  <ul>
                    {pricingSuggestion.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pricing-actions">
                <button
                  className="apply-price-btn"
                  onClick={() => handleApplyPrice(pricingSuggestion.suggestedPrice)}
                >
                  Apply Suggested Price
                </button>
                <button
                  className="apply-min-price-btn"
                  onClick={() => handleApplyPrice(pricingSuggestion.priceRange.min)}
                >
                  Use Minimum (₹{pricingSuggestion.priceRange.min})
                </button>
                <button
                  className="apply-max-price-btn"
                  onClick={() => handleApplyPrice(pricingSuggestion.priceRange.max)}
                >
                  Use Maximum (₹{pricingSuggestion.priceRange.max})
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIPricingSuggestion;
