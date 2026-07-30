/**
 * Smart Search Component
 * Feature 2: Natural language parking search with AI query parsing
 */

import React, { useState } from 'react';
import { parseSearchQuery } from '../services/aiService';
import '../styles/smart-search.css';

const SmartSearch = ({ onSearchResults, onParsedQuery }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const exampleQueries = [
    "cheap parking near CP metro",
    "bike parking for 2 hours in Karol Bagh",
    "covered car parking near me",
    "24x7 parking with EV charging",
    "secure parking under ₹50/hour"
  ];

  const handleSmartSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await parseSearchQuery(query);
      const parsed = response.parsed;
      setParsedData(parsed);

      console.log('🤖 AI Parsed Query:', parsed);

      // Callback to parent with parsed parameters
      if (onParsedQuery) {
        onParsedQuery(parsed);
      }

      // If location is extracted, trigger geocoding search
      if (parsed.location && onSearchResults) {
        // This would ideally trigger a geocoding lookup and then nearby search
        // For now, just pass the parsed data
        onSearchResults(parsed);
      }

    } catch (error) {
      console.error('Smart search error:', error);
      alert('Failed to parse search query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example) => {
    setQuery(example);
    setShowSuggestions(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSmartSearch();
    }
  };

  return (
    <div className="smart-search-container">
      <div className="smart-search-box">
        <div className="search-input-wrapper">
          <span className="ai-badge">🤖 AI</span>
          <input
            type="text"
            className="smart-search-input"
            placeholder="Try: 'cheap parking near CP metro' or 'bike parking for 2 hours'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(true)}
          />
          <button 
            className="smart-search-btn"
            onClick={handleSmartSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? '🔄' : '🔍'}
          </button>
        </div>

        {showSuggestions && (
          <div className="search-suggestions">
            <div className="suggestions-header">
              <span>💡 Try these examples:</span>
              <button 
                className="close-suggestions"
                onClick={() => setShowSuggestions(false)}
              >
                ✕
              </button>
            </div>
            {exampleQueries.map((example, idx) => (
              <div 
                key={idx}
                className="suggestion-item"
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </div>
            ))}
          </div>
        )}
      </div>

      {parsedData && (
        <div className="parsed-query-display">
          <div className="parsed-header">
            <span className="ai-icon">🤖</span>
            <strong>AI understood your query:</strong>
          </div>
          <div className="parsed-details">
            {parsedData.location && (
              <span className="parsed-tag">📍 {parsedData.location}</span>
            )}
            {parsedData.vehicleType && (
              <span className="parsed-tag">
                {parsedData.vehicleType === 'car' ? '🚗' : '🏍️'} {parsedData.vehicleType}
              </span>
            )}
            {parsedData.duration && (
              <span className="parsed-tag">⏱️ {parsedData.duration} hours</span>
            )}
            {parsedData.priceRange?.max && (
              <span className="parsed-tag">💰 Under ₹{parsedData.priceRange.max}/hr</span>
            )}
            {parsedData.preferences?.map((pref, idx) => (
              <span key={idx} className="parsed-tag">
                ✓ {pref}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
