import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import LayoutConsistencyChecker from "../components/LayoutConsistencyChecker";
import "../styles/improved-profile.css";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]); // For owners
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchUserData();
    fetchUserBookings();
    if (user?.role === 'owner') {
      fetchOwnerProperties();
    }
  }, [user?.role]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found");
        setLoading(false);
        return;
      }

      const response = await apiRequest("/auth/profile", "GET", null, token);
      const userData = response.user || response;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError(err.message);
    }
  };

  const fetchOwnerProperties = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Fetch both pending and approved properties for owner
      const [pendingResponse, approvedResponse] = await Promise.all([
        apiRequest("/parking-property/pending", "GET", null, token),
        apiRequest("/parking-property/approved", "GET", null, token)
      ]);

      const currentUserId = localStorage.getItem('userId');
      const approvedByOwner = (approvedResponse || []).filter(prop => 
        prop.owner && prop.owner.toString() === currentUserId.toString()
      );

      setProperties({
        pending: pendingResponse || [],
        approved: approvedByOwner || [],
        total: (pendingResponse || []).length + (approvedByOwner || []).length
      });
    } catch (err) {
      console.error("Error fetching owner properties:", err);
      setProperties({ pending: [], approved: [], total: 0 });
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchUserBookings();
    if (user?.role === 'owner') {
      fetchOwnerProperties();
    }
  }, [user?.role]);

  const fetchUserBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await apiRequest("/booking/my-bookings", "GET", null, token);
        setBookings(response || []);
      } catch (bookingErr) {
        console.error("Error fetching bookings:", bookingErr);
        setBookings([]);
      }
    } catch (err) {
      console.error("Error in fetchUserBookings:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserStats = () => {
    if (user?.role === 'owner') {
      // Owner-specific stats
      const totalApproved = properties.approved?.length || 0;
      const totalPending = properties.pending?.length || 0;
      const totalRevenue = properties.approved?.reduce((sum, prop) => {
        // Estimate revenue based on property slots and hourly rate
        const totalSlots = (prop.carSlots || 0) + (prop.bikeSlots || 0);
        return sum + (totalSlots * (prop.pricePerHour || 0) * 24 * 30); // Monthly estimate
      }, 0) || 0;

      return {
        totalProperties: totalApproved + totalPending,
        approvedProperties: totalApproved,
        pendingProperties: totalPending,
        monthlyRevenue: totalRevenue,
        totalSlots: properties.approved?.reduce((sum, prop) => sum + (prop.carSlots || 0) + (prop.bikeSlots || 0), 0) || 0,
        avgPricePerHour: properties.approved?.length > 0 ? 
          (properties.approved.reduce((sum, prop) => sum + (prop.pricePerHour || 0), 0) / properties.approved.length).toFixed(0) : 0
      };
    } else {
      // User/customer stats
      if (!bookings.length) {
        return {
          totalBookings: 0,
          pendingBookings: 0,
          completedBookings: 0,
          totalSpent: 0,
          thisMonthBookings: 0,
          favoriteSpots: 0
        };
      }

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = {
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length,
        completedBookings: bookings.filter(b => b.status === 'completed' || b.status === 'paid').length,
        totalSpent: bookings.reduce((sum, b) => sum + (b.amount || 0), 0),
        thisMonthBookings: bookings.filter(b => new Date(b.createdAt) >= thisMonth).length,
        favoriteSpots: [...new Set(bookings.map(b => b.parkingSlotId))].length
      };

      return stats;
    }
  };

  const generateRecentActivities = () => {
    if (user?.role === 'owner') {
      // Owner activities - recent property approvals
      const activities = [];
      
      if (properties.approved?.length > 0) {
        properties.approved.slice(0, 3).forEach(prop => {
          activities.push({
            type: "approval",
            action: `Approved property: ${prop.name}`,
            time: "Recently",
            amount: `₹${prop.pricePerHour}/hr`,
            propertyId: prop._id
          });
        });
      }

      if (properties.pending?.length > 0) {
        properties.pending.slice(0, 2).forEach(prop => {
          activities.push({
            type: "pending",
            action: `Property awaiting approval: ${prop.name}`,
            time: "Pending",
            amount: `₹${prop.pricePerHour}/hr`,
            propertyId: prop._id
          });
        });
      }

      return activities.slice(0, 5);
    } else {
      // User activities - bookings
      if (!bookings.length) return [];

      return bookings
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(booking => ({
          type: "booking",
          action: `Parking ${booking.status} at ${booking.location || 'Parking Spot'}`,
          time: formatTimeAgo(booking.createdAt),
          amount: booking.amount ? `₹${booking.amount}` : null,
          bookingId: booking._id
        }));
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleEditProfile = () => {
    alert("Edit Profile feature - this would open a form to edit user information");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Profile</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <h2>User Not Found</h2>
        <p>Please log in to view your profile.</p>
        <Link to="/login" className="btn-primary">Go to Login</Link>
      </div>
    );
  }

  const stats = calculateUserStats();
  const recentActivities = generateRecentActivities();

  const getQuickActions = () => {
    switch (user.role) {
      case "admin":
        return [
          { icon: "🏢", title: "Manage Properties", desc: "Add & manage parking spaces", link: "/admin" },
          { icon: "👥", title: "User Management", desc: "Manage user accounts", link: "/admin" },
          { icon: "📊", title: "Analytics", desc: "View system analytics", link: "/admin" },
          { icon: "⚙️", title: "Settings", desc: "System configuration", link: "/admin" }
        ];
      case "owner":
        return [
          { icon: "🏢", title: "My Properties", desc: "Manage your properties", link: "/owner" },
          { icon: "📈", title: "Revenue", desc: "Track your earnings", link: "/owner" },
          { icon: "📝", title: "Add Property", desc: "List new parking space", link: "/owner" },
          { icon: "🔧", title: "Maintenance", desc: "Property maintenance", link: "/owner" }
        ];
      default:
        return [
          { icon: "🅿️", title: "Book Parking", desc: "Find & book parking spots", link: "/book-slot" },
          { icon: "📋", title: "My Bookings", desc: "View your bookings", link: "/my-bookings" },
          { icon: "❤️", title: "Favorites", desc: "Your saved spots", link: "/favorites" },
          { icon: "🎁", title: "Rewards", desc: "Loyalty points & offers", link: "/rewards" }
        ];
    }
  };

  const favoriteSpots = [
    ...new Set(bookings.map(b => ({ 
      id: b.parkingSlotId, 
      name: b.location || 'Parking Spot',
      location: b.address || 'Location not specified',
      rating: 4.5 + Math.random() * 0.5
    })))
  ].slice(0, 5);

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="tab-content">
            <div className="content-section">
              <h3>Recent Activities</h3>
              {recentActivities.length > 0 ? (
                <div className="activities-list">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">🅿️</div>
                      <div className="activity-info">
                        <h4>{activity.action}</h4>
                        <p className="activity-time">{activity.time}</p>
                      </div>
                      {activity.amount && (
                        <div className="activity-amount">{activity.amount}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No recent activities</p>
                  <Link to="/book-slot" className="btn-primary">Book Your First Spot</Link>
                </div>
              )}
            </div>
          </div>
        );

      case "bookings":
        return (
          <div className="tab-content">
            <div className="content-section">
              <h3>Your Bookings</h3>
              {bookings.length > 0 ? (
                <div className="bookings-list">
                  {bookings.map((booking) => (
                    <div key={booking._id} className="booking-item">
                      <div className="booking-info">
                        <h4>{booking.location || 'Parking Spot'}</h4>
                        <p>Booking ID: {booking._id.slice(-6).toUpperCase()}</p>
                        <p>Date: {new Date(booking.createdAt).toLocaleDateString()}</p>
                        <p>Duration: {booking.duration || 'N/A'}</p>
                        {booking.startTime && <p>Start: {new Date(booking.startTime).toLocaleString()}</p>}
                        {booking.endTime && <p>End: {new Date(booking.endTime).toLocaleString()}</p>}
                      </div>
                      <div className="booking-status">
                        <span className={`status ${booking.status}`}>
                          {booking.status}
                        </span>
                        <div className="amount">
                          {booking.amount ? `₹${booking.amount}` : 'Pending'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No bookings found</p>
                  <Link to="/book-slot" className="btn-primary">Book Your First Spot</Link>
                </div>
              )}
            </div>
          </div>
        );

      case "favorites":
        return (
          <div className="tab-content">
            <div className="content-section">
              <h3>Favorite Parking Spots</h3>
              {favoriteSpots.length > 0 ? (
                <div className="favorites-list">
                  {favoriteSpots.map((spot, index) => (
                    <div key={index} className="favorite-item">
                      <div className="favorite-info">
                        <h4>{spot.name}</h4>
                        <p>{spot.location}</p>
                        <p>Rating: ⭐ {spot.rating.toFixed(1)}</p>
                      </div>
                      <Link to="/book-slot" className="btn-secondary">Book Now</Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No favorite spots yet</p>
                  <Link to="/book-slot" className="btn-primary">Explore Parking Spots</Link>
                </div>
              )}
            </div>
          </div>
        );

      case "rewards":
        return (
          <div className="tab-content">
            <div className="content-section">
              <h3>Rewards & Loyalty Points</h3>
              <div className="rewards-summary">
                <div className="reward-card">
                  <div className="reward-icon">🎁</div>
                  <div className="reward-info">
                    <h4>Total Points</h4>
                    <p className="reward-value">{stats.totalBookings * 10}</p>
                  </div>
                </div>
                <div className="reward-card">
                  <div className="reward-icon">🏆</div>
                  <div className="reward-info">
                    <h4>Tier Status</h4>
                    <p className="reward-value">
                      {stats.totalBookings >= 20 ? 'Gold' : stats.totalBookings >= 10 ? 'Silver' : 'Bronze'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rewards-list">
                <div className="reward-item">
                  <div className="reward-icon">🎯</div>
                  <div className="reward-info">
                    <h4>Frequent Parker</h4>
                    <p>Complete 10 bookings to unlock 10% discount</p>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${Math.min((stats.totalBookings / 10) * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="reward-item">
                  <div className="reward-icon">⭐</div>
                  <div className="reward-info">
                    <h4>Monthly Challenge</h4>
                    <p>Book 5 parking spots this month</p>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${Math.min((stats.thisMonthBookings / 5) * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "properties":
        return (
          <div className="tab-content">
            <div className="content-section">
              <h3>My Properties</h3>
              {properties.approved?.length > 0 || properties.pending?.length > 0 ? (
                <div className="properties-overview">
                  {/* Approved Properties */}
                  {properties.approved?.length > 0 && (
                    <div className="property-section">
                      <h4>✅ Approved Properties ({properties.approved.length})</h4>
                      <div className="properties-grid">
                        {properties.approved.map((property) => (
                          <div key={property._id} className="property-card approved">
                            <h5>{property.name}</h5>
                            <p>📍 {property.address}</p>
                            <div className="property-stats">
                              <span>🚗 {property.carSlots} cars</span>
                              <span>🏍️ {property.bikeSlots} bikes</span>
                              <span>💰 ₹{property.pricePerHour}/hr</span>
                            </div>
                            <div className="property-status">
                              <span className="status-active">LIVE</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Pending Properties */}
                  {properties.pending?.length > 0 && (
                    <div className="property-section">
                      <h4>⏳ Pending Approval ({properties.pending.length})</h4>
                      <div className="properties-grid">
                        {properties.pending.map((property) => (
                          <div key={property._id} className="property-card pending">
                            <h5>{property.name}</h5>
                            <p>📍 {property.address}</p>
                            
                            {/* Layout Consistency Check for Owner Approval */}
                            <LayoutConsistencyChecker 
                              property={property} 
                              step="owner-approval-review" 
                            />
                            
                            <div className="property-stats">
                              <span>🚗 {property.carSlots} cars</span>
                              <span>🏍️ {property.bikeSlots} bikes</span>
                              <span>💰 ₹{property.pricePerHour}/hr</span>
                            </div>
                            <div className="property-status">
                              <span className="status-pending">PENDING</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No properties found</p>
                  <Link to="/owner" className="btn-primary">Go to Owner Dashboard</Link>
                </div>
              )}
            </div>
          </div>
        );

      case "revenue":
        return (
          <div className="tab-content">
            <div className="content-section">
              <h3>Revenue Analytics</h3>
              <div className="revenue-overview">
                <div className="revenue-cards">
                  <div className="revenue-card">
                    <h4>💰 Estimated Monthly Revenue</h4>
                    <p className="revenue-amount">₹{stats.monthlyRevenue.toLocaleString()}</p>
                    <span className="revenue-note">Based on {stats.totalSlots} slots at avg ₹{stats.avgPricePerHour}/hr</span>
                  </div>
                  <div className="revenue-card">
                    <h4>📊 Property Performance</h4>
                    <div className="performance-list">
                      {properties.approved?.map((property, index) => (
                        <div key={property._id} className="performance-item">
                          <span className="property-name">{property.name}</span>
                          <span className="property-revenue">
                            ₹{((property.carSlots + property.bikeSlots) * property.pricePerHour * 24 * 30).toLocaleString()}/mo
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "analytics":
        return (
          <div className="tab-content">
            <div className="content-section">
              <h3>Property Analytics</h3>
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h4>🏢 Property Distribution</h4>
                  <div className="chart-placeholder">
                    <p>Approved: {stats.approvedProperties}</p>
                    <p>Pending: {stats.pendingProperties}</p>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${stats.totalProperties > 0 ? (stats.approvedProperties / stats.totalProperties) * 100 : 0}%`}}
                      ></div>
                    </div>
                    <span>{stats.totalProperties > 0 ? Math.round((stats.approvedProperties / stats.totalProperties) * 100) : 0}% Approved</span>
                  </div>
                </div>
                <div className="analytics-card">
                  <h4>🅿️ Slot Utilization</h4>
                  <div className="utilization-stats">
                    <p>Total Slots: {stats.totalSlots}</p>
                    <p>Car Slots: {properties.approved?.reduce((sum, prop) => sum + (prop.carSlots || 0), 0) || 0}</p>
                    <p>Bike Slots: {properties.approved?.reduce((sum, prop) => sum + (prop.bikeSlots || 0), 0) || 0}</p>
                  </div>
                </div>
                <div className="analytics-card">
                  <h4>💵 Pricing Analysis</h4>
                  <div className="pricing-stats">
                    <p>Average Rate: ₹{stats.avgPricePerHour}/hr</p>
                    <p>Highest Rate: ₹{properties.approved?.reduce((max, prop) => Math.max(max, prop.pricePerHour || 0), 0) || 0}/hr</p>
                    <p>Lowest Rate: ₹{properties.approved?.reduce((min, prop) => Math.min(min, prop.pricePerHour || Infinity), Infinity) || 0}/hr</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="tab-content">
            <div className="content-section">
              <h3>Account Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <h4>Profile Information</h4>
                  <p>Update your personal information</p>
                  <p>Name: {user.name}</p>
                  <p>Email: {user.email}</p>
                  <p>Phone: {user.phone || 'Not provided'}</p>
                  <button className="btn-primary" onClick={handleEditProfile}>Edit Profile</button>
                </div>
                <div className="setting-item">
                  <h4>Notification Preferences</h4>
                  <p>Manage your notification settings</p>
                  <button className="btn-secondary">Configure</button>
                </div>
                <div className="setting-item">
                  <h4>Payment Methods</h4>
                  <p>Manage your payment options</p>
                  <button className="btn-secondary">Manage</button>
                </div>
                <div className="setting-item">
                  <h4>Account Actions</h4>
                  <p>Logout or delete your account</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btn-secondary" onClick={handleLogout}>Logout</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="user-avatar">
          <span className="avatar-text">{user.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="user-info">
          <h1>{user.name}</h1>
          <p className="user-email">{user.email}</p>
          <span className="user-role">{user.role}</span>
        </div>
        <div className="profile-actions">
          <button className="btn-edit" onClick={handleEditProfile}>Edit Profile</button>
          <button className="btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="quick-actions">
        {getQuickActions().map((action, index) => (
          <Link to={action.link} key={index} className="quick-action">
            <div className="action-icon">{action.icon}</div>
            <div className="action-info">
              <h3>{action.title}</h3>
              <p>{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="stats-grid">
        {user?.role === 'owner' ? (
          // Owner Stats
          <>
            <div className="stat-card">
              <div className="stat-icon">🏢</div>
              <div className="stat-info">
                <h3>{stats.totalProperties}</h3>
                <p>Total Properties</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <h3>{stats.approvedProperties}</h3>
                <p>Approved</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <h3>{stats.pendingProperties}</h3>
                <p>Pending Approval</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>₹{stats.monthlyRevenue.toLocaleString()}</h3>
                <p>Est. Monthly Revenue</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🅿️</div>
              <div className="stat-info">
                <h3>{stats.totalSlots}</h3>
                <p>Total Parking Slots</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💵</div>
              <div className="stat-info">
                <h3>₹{stats.avgPricePerHour}</h3>
                <p>Avg. Rate/Hour</p>
              </div>
            </div>
          </>
        ) : (
          // User/Customer Stats
          <>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <h3>{stats.totalBookings}</h3>
                <p>Total Bookings</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <h3>{stats.pendingBookings}</h3>
                <p>Pending</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <h3>{stats.completedBookings}</h3>
                <p>Completed</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>₹{stats.totalSpent}</h3>
                <p>Total Spent</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-info">
                <h3>{stats.thisMonthBookings}</h3>
                <p>This Month</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❤️</div>
              <div className="stat-info">
                <h3>{stats.favoriteSpots}</h3>
                <p>Favorite Spots</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        {user?.role === 'owner' ? (
          // Owner Tabs
          <>
            <button 
              className={`tab ${activeTab === "properties" ? "active" : ""}`}
              onClick={() => setActiveTab("properties")}
            >
              My Properties
            </button>
            <button 
              className={`tab ${activeTab === "revenue" ? "active" : ""}`}
              onClick={() => setActiveTab("revenue")}
            >
              Revenue
            </button>
            <button 
              className={`tab ${activeTab === "analytics" ? "active" : ""}`}
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
            </button>
          </>
        ) : (
          // User Tabs
          <>
            <button 
              className={`tab ${activeTab === "bookings" ? "active" : ""}`}
              onClick={() => setActiveTab("bookings")}
            >
              Bookings
            </button>
            <button 
              className={`tab ${activeTab === "favorites" ? "active" : ""}`}
              onClick={() => setActiveTab("favorites")}
            >
              Favorites
            </button>
            <button 
              className={`tab ${activeTab === "rewards" ? "active" : ""}`}
              onClick={() => setActiveTab("rewards")}
            >
              Rewards
            </button>
          </>
        )}
        <button 
          className={`tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      {renderTabContent()}
    </div>
  );
};

export default Profile;