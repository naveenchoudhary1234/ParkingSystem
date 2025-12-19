import React, { useState, useEffect } from "react";
import { apiRequest } from "../api";
import "../styles/OwnerDashboard.css";

export default function OwnerDashboard() {
  const [pendingProperties, setPendingProperties] = useState([]);
  const [approvedProperties, setApprovedProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeView, setActiveView] = useState("pending"); // "pending" or "approved"

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPendingProperties();
    fetchApprovedProperties();
  }, []);

  const fetchPendingProperties = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/parking-property/pending', 'GET', null, token);
      setPendingProperties(response || []);
    } catch (err) {
      setError("Failed to load pending properties: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedProperties = async () => {
    try {
      // Get all approved properties
      const response = await apiRequest('/parking-property/approved', 'GET', null, token);
      
      // Filter by current owner (if we have owner info)
      const currentUserId = localStorage.getItem('userId');
      let approvedByThisOwner = response || [];
      
      // If we have owner field, filter by it
      if (currentUserId) {
        approvedByThisOwner = (response || []).filter(prop => 
          prop.owner && prop.owner.toString() === currentUserId.toString()
        );
      }
      
      setApprovedProperties(approvedByThisOwner);
      
      console.log('All approved properties:', response?.length);
      console.log('Approved by this owner:', approvedByThisOwner?.length);
      console.log('Current user ID:', currentUserId);
    } catch (err) {
      setError("Failed to load approved properties: " + err.message);
    }
  };

  const handleApprove = async (propertyId) => {
    if (!window.confirm("Are you sure you want to approve this property?")) {
      return;
    }

    try {
      setLoading(true);
      await apiRequest(`/parking-property/approve/${propertyId}`, 'PUT', null, token);
      
      setSuccess("Property approved successfully! Slots have been created.");
      setError("");
      
      // Refresh both lists
      fetchPendingProperties();
      fetchApprovedProperties();
    } catch (err) {
      setError("Failed to approve property: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      await apiRequest(`/parking-property/${propertyId}`, 'DELETE', null, token);
      
      setSuccess("Property deleted successfully!");
      setError("");
      
      // Refresh both lists
      fetchPendingProperties();
      fetchApprovedProperties();
    } catch (err) {
      setError("Failed to delete property: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPropertyImage = (property) => {
    if (property.photos && property.photos.length > 0) {
      return property.photos[0];
    }
    return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60';
  };

  return (
    <div className="owner-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🏢 Property Owner Dashboard</h1>
            <p>Manage your parking spaces and track approvals</p>
          </div>
          <div className="stats-quick">
            <div className="stat-item">
              <span className="stat-value pending">{pendingProperties.length}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item">
              <span className="stat-value approved">{approvedProperties.length}</span>
              <span className="stat-label">Approved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          ✅ {success}
        </div>
      )}

      {/* View Toggle Buttons */}
      <div className="view-toggle-container">
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${activeView === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveView('pending')}
          >
            ⏳ Pending Approvals ({pendingProperties.length})
          </button>
          <button 
            className={`toggle-btn ${activeView === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveView('approved')}
          >
            ✅ Approved Properties ({approvedProperties.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading properties...</p>
          </div>
        ) : activeView === 'pending' ? (
          // Pending Properties View
          <div className="properties-section">
            <div className="section-header">
              <h2>⏳ Properties Waiting for Approval</h2>
              <p>Review and approve properties submitted by property owners</p>
            </div>
            
            {pendingProperties.length === 0 ? (
              <div className="no-properties">
                <div className="empty-state">
                  <h3>🎉 All Caught Up!</h3>
                  <p>No pending properties to review at this time.</p>
                </div>
              </div>
            ) : (
              <div className="properties-grid">
                {pendingProperties.map(property => (
                  <div key={property._id} className="property-card pending-card">
                    <div className="property-image">
                      <img 
                        src={getPropertyImage(property)} 
                        alt={property.name}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60';
                        }}
                      />
                      <div className="property-badge">
                        {property.spaceType === 'Underground' ? '🚇' : 
                         property.spaceType === 'Covered' ? '🏠' : '🌞'}
                      </div>
                      <div className="status-badge pending">
                        ⏳ Pending Review
                      </div>
                    </div>
                    
                    <div className="property-content">
                      <h3>{property.name}</h3>
                      <p className="property-address">📍 {property.address}</p>
                      
                      <div className="property-details">
                        <div className="detail-row">
                          <span>🚗 Car Slots:</span>
                          <span>{property.carSlots || 0}</span>
                        </div>
                        <div className="detail-row">
                          <span>🏍️ Bike Slots:</span>
                          <span>{property.bikeSlots || 0}</span>
                        </div>
                        <div className="detail-row">
                          <span>💰 Rate:</span>
                          <span>₹{property.pricePerHour}/hr</span>
                        </div>
                        <div className="detail-row">
                          <span>👤 Owner:</span>
                          <span>{property.rental?.name || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="property-actions">
                        <button 
                          className="action-btn approve-btn"
                          onClick={() => handleApprove(property._id)}
                          disabled={loading}
                          title="Approve this property"
                        >
                          ✅ Approve
                        </button>
                        <button 
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(property._id)}
                          disabled={loading}
                          title="Delete this property"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Approved Properties View
          <div className="properties-section">
            <div className="section-header">
              <h2>✅ Approved Properties</h2>
              <p>These properties are live and accepting bookings</p>
            </div>
            
            {approvedProperties.length === 0 ? (
              <div className="no-properties">
                <div className="empty-state">
                  <h3>📋 No Approved Properties</h3>
                  <p>Properties will appear here once you approve them.</p>
                </div>
              </div>
            ) : (
              <div className="approved-properties-container">
                <div className="approved-properties-row">
                  {approvedProperties.map(property => (
                    <div key={property._id} className="approved-property-card">
                      <div className="card-image">
                        <img 
                          src={getPropertyImage(property)} 
                          alt={property.name}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60';
                          }}
                        />
                        <div className="live-indicator">
                          <span className="pulse-dot"></span>
                          LIVE
                        </div>
                      </div>
                      
                      <div className="card-content">
                        <div className="card-header">
                          <h3>{property.name}</h3>
                          <div className="status-active">
                            ✅ Active
                          </div>
                        </div>
                        
                        <p className="card-address">📍 {property.address}</p>
                        
                        <div className="card-stats">
                          <div className="stat">
                            <span className="stat-icon">🚗</span>
                            <span className="stat-value">{property.carSlots || 0}</span>
                            <span className="stat-label">Cars</span>
                          </div>
                          <div className="stat">
                            <span className="stat-icon">🏍️</span>
                            <span className="stat-value">{property.bikeSlots || 0}</span>
                            <span className="stat-label">Bikes</span>
                          </div>
                          <div className="stat">
                            <span className="stat-icon">💰</span>
                            <span className="stat-value">₹{property.pricePerHour}</span>
                            <span className="stat-label">/hour</span>
                          </div>
                        </div>
                        
                        <div className="card-actions">
                          <button 
                            className="card-action-btn delete-btn"
                            onClick={() => handleDelete(property._id)}
                            disabled={loading}
                            title="Delete this property"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}