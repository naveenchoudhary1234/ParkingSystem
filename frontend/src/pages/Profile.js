import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import { getWalletBalance, getWalletTransactions, addMoneyToWallet } from "../services/walletService";
import LayoutConsistencyChecker from "../components/LayoutConsistencyChecker";
import "../styles/improved-profile.css";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [propertyBookings, setPropertyBookings] = useState([]); // For owners' property bookings
  const [properties, setProperties] = useState([]); // For owners
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [rewardsSummary, setRewardsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchUserData();
    fetchUserBookings();
    if (user?.role === 'owner') {
      fetchOwnerProperties();
    }
    if (user?.role === 'user') {
      fetchWalletData();
      fetchRewardsData();
    }
  }, [user?.role]);

  const fetchWalletData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        getWalletBalance(),
        getWalletTransactions()
      ]);
      setWalletBalance(balanceRes.balance || 0);
      setWalletTransactions(transactionsRes.transactions || []);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    }
  };

  const fetchRewardsData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await apiRequest("/rewards/summary", "GET", null, token);
      setRewardsSummary(response.rewards);
    } catch (error) {
      console.error('Failed to fetch rewards data:', error);
    }
  };

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
      if (!token) {
        return;
      }

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

      // Fetch bookings for all owner properties
      if (approvedByOwner && approvedByOwner.length > 0) {
        try {
          const allPropertyBookings = await Promise.all(
            approvedByOwner.map(prop => 
              apiRequest(`/parking-property/${prop._id}/bookings`, "GET", null, token)
                .catch(() => [])
            )
          );
          // Flatten all booking arrays
          const flatBookings = allPropertyBookings.flat().filter(b => b);
          setPropertyBookings(flatBookings);
        } catch (bookingErr) {
          console.error("Error fetching property bookings:", bookingErr);
          setPropertyBookings([]);
        }
      }
    } catch (err) {
      console.error("Error fetching owner properties:", err);
      setProperties({ pending: [], approved: [], total: 0 });
      setPropertyBookings([]);
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
      
      // Calculate actual revenue from all non-cancelled bookings in owner's properties
      const actualRevenue = (propertyBookings || []).reduce((sum, booking) => {
        // Count all bookings except cancelled (includes pending and confirmed)
        if (booking.status !== 'cancelled') {
          const amount = booking.totalAmount || 0;
          return sum + amount;
        }
        return sum;
      }, 0) || 0;

      return {
        totalProperties: totalApproved + totalPending,
        approvedProperties: totalApproved,
        pendingProperties: totalPending,
        monthlyRevenue: actualRevenue,
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
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        completedBookings: bookings.filter(b => b.status === 'confirmed').length,
        totalSpent: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        thisMonthBookings: bookings.filter(b => new Date(b.createdAt) >= thisMonth).length,
        favoriteSpots: [...new Set(bookings.map(b => b.slot))].length
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
          action: `Parking ${booking.status} at ${booking.propertyName || 'Parking Spot'}`,
          time: formatTimeAgo(booking.createdAt),
          amount: booking.totalAmount ? `₹${booking.totalAmount}` : null,
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

  // ✅ Edit Profile State
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  // ✅ Add Money to Wallet State
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');

  const handleEditProfile = () => {
    setEditFormData({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || ''
    });
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Updating profile with data:", editFormData);

      const response = await apiRequest("/auth/profile", "PUT", editFormData, token);

      console.log("Profile update response:", response);

      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
      setEditMode(false);
      alert("✅ Profile updated successfully!");

      // Refresh user data
      await fetchUserData();
    } catch (err) {
      console.error("Profile update error:", err);
      alert("Failed to update profile: " + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  // ✅ Add Money to Wallet via Razorpay
  const handleAddMoney = async () => {
    const amount = parseFloat(addMoneyAmount);

    if (!amount || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount < 10) {
      alert("Minimum amount to add is ₹10");
      return;
    }

    if (amount > 50000) {
      alert("Maximum amount to add is ₹50,000");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      // Create Razorpay order for wallet topup
      const orderResponse = await apiRequest("/payment/create-order", "POST", {
        amount: amount,
        bookingData: {
          type: "wallet_topup",
          description: `Add ₹${amount} to wallet`
        }
      }, token);

      // Configure Razorpay options
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY || "rzp_test_vsLHHCgamWA71m",
        amount: orderResponse.amount,
        currency: orderResponse.currency || "INR",
        name: "ParkEasy Wallet",
        description: `Add ₹${amount} to your wallet`,
        order_id: orderResponse.orderId,
        handler: async function (response) {
          try {
            // Verify payment
            await apiRequest("/payment/verify", "POST", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            }, token);

            // Add money to wallet after successful payment
            const walletResponse = await addMoneyToWallet(amount, `Payment ID: ${response.razorpay_payment_id}`);
            setWalletBalance(walletResponse.balance);
            alert(`✅ Payment successful! ₹${amount} added to your wallet.`);
            setShowAddMoneyModal(false);
            setAddMoneyAmount('');

            // Refresh wallet data
            await fetchWalletData();
          } catch (err) {
            alert("Payment verification failed: " + err.message);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || "9999999999"
        },
        theme: {
          color: "#10b981"
        },
        modal: {
          ondismiss: function() {
            console.log("Payment cancelled");
            alert("Payment was cancelled. No money was added to wallet.");
          }
        }
      };

      // Open Razorpay payment
      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
        setShowAddMoneyModal(false); // Close our modal while Razorpay modal opens
      } else {
        throw new Error("Razorpay SDK not loaded. Please refresh the page.");
      }

    } catch (err) {
      alert("Failed to initiate payment: " + err.message);
    }
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
          { icon: "🅿️", title: "Book Parking", desc: "Find & book parking spots", link: "/parking" },
          { icon: "📋", title: "My Bookings", desc: "View your bookings", link: "/bookings" },
          { icon: "❤️", title: "Favorites", desc: "Your saved spots", link: "/favorites" },
          { icon: "🎁", title: "Rewards", desc: "Loyalty points & offers", link: "/rewards" }
        ];
    }
  };

  const favoriteSpots = [
    ...new Set(bookings.map(b => ({ 
      id: b.slot, 
      name: b.propertyName || 'Parking Spot',
      location: b.propertyAddress || 'Location not specified',
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
                        <h4>{booking.propertyName || 'Parking Spot'}</h4>
                        <p>Booking ID: {booking._id.slice(-6).toUpperCase()}</p>
                        <p>Date: {new Date(booking.createdAt).toLocaleDateString()}</p>
                        <p>Duration: {booking.hours || 'N/A'} hours</p>
                        {booking.startTime && <p>Start: {new Date(booking.startTime).toLocaleString()}</p>}
                        {booking.endTime && <p>End: {new Date(booking.endTime).toLocaleString()}</p>}
                      </div>
                      <div className="booking-status">
                        <span className={`status ${booking.status}`}>
                          {booking.status}
                        </span>
                        <div className="amount">
                          {booking.totalAmount ? `₹${booking.totalAmount}` : 'N/A'}
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

      case "wallet":
        return (
          <div className="tab-content">
            <div className="content-section">
              <h3>💰 My Wallet</h3>

              {/* Wallet Balance Card */}
              <div className="wallet-balance-card">
                <div className="balance-info">
                  <span className="balance-label">Available Balance</span>
                  <span className="balance-amount">₹{walletBalance}</span>
                </div>
                <div className="balance-actions">
                  <button className="btn-wallet-primary" onClick={() => setShowAddMoneyModal(true)}>
                    💰 Add Money
                  </button>
                  <button className="btn-secondary" onClick={() => alert('Coming soon!')}>
                    💸 Withdraw
                  </button>
                </div>
              </div>

              {/* Add Money Modal */}
              {showAddMoneyModal && (
                <div className="modal-overlay" onClick={() => setShowAddMoneyModal(false)}>
                  <div className="modal-content add-money-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>💰 Add Money to Wallet</h2>
                      <button className="modal-close" onClick={() => setShowAddMoneyModal(false)}>×</button>
                    </div>
                    <div className="modal-body">
                      <p style={{ color: '#64748b', marginBottom: '20px' }}>
                        Add money to your wallet for quick and seamless parking bookings. No payment hassles at checkout!
                      </p>

                      <div className="quick-amounts">
                        <button className="quick-amount-btn" onClick={() => setAddMoneyAmount('100')}>₹100</button>
                        <button className="quick-amount-btn" onClick={() => setAddMoneyAmount('500')}>₹500</button>
                        <button className="quick-amount-btn" onClick={() => setAddMoneyAmount('1000')}>₹1,000</button>
                        <button className="quick-amount-btn" onClick={() => setAddMoneyAmount('2000')}>₹2,000</button>
                      </div>

                      <div className="form-group" style={{ marginTop: '20px' }}>
                        <label>Enter Amount (₹10 - ₹50,000)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={addMoneyAmount}
                          onChange={(e) => setAddMoneyAmount(e.target.value)}
                          placeholder="Enter amount"
                          min="10"
                          max="50000"
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn-secondary" onClick={() => setShowAddMoneyModal(false)}>Cancel</button>
                      <button className="btn-primary" onClick={handleAddMoney}>
                        Add ₹{addMoneyAmount || '0'} to Wallet
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction History */}
              <h4 style={{ marginTop: '30px', marginBottom: '15px' }}>Transaction History</h4>
              {walletTransactions.length > 0 ? (
                <div className="transactions-list">
                  {walletTransactions.map((txn) => (
                    <div key={txn._id} className="transaction-item">
                      <div className="transaction-icon">
                        {txn.type === 'credit' ? '💵' : '💸'}
                      </div>
                      <div className="transaction-info">
                        <h5>{txn.description}</h5>
                        <p className="transaction-date">
                          {new Date(txn.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="transaction-amount">
                        <span className={`amount ${txn.type}`}>
                          {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                        </span>
                        <span className="balance-after">
                          Balance: ₹{txn.balanceAfter}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No transactions yet</p>
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    When you cancel bookings, refunds will appear here
                  </p>
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
              <h3>🎁 Rewards & Loyalty Points</h3>
              {!rewardsSummary ? (
                <div className="loading-state">Loading rewards...</div>
              ) : (
                <>
                  <div className="rewards-summary">
                    <div className="reward-card">
                      <div className="reward-icon">🎁</div>
                      <div className="reward-info">
                        <h4>Total Points</h4>
                        <p className="reward-value">{rewardsSummary.points || 0}</p>
                        <small>{rewardsSummary.pointsToNextTier > 0 ? `${rewardsSummary.pointsToNextTier} points to ${rewardsSummary.nextTier}` : 'Max tier reached!'}</small>
                      </div>
                    </div>
                    <div className="reward-card">
                      <div className="reward-icon">🏆</div>
                      <div className="reward-info">
                        <h4>Tier Status</h4>
                        <p className="reward-value">{rewardsSummary.tier || 'Bronze'}</p>
                        <small>{rewardsSummary.discount > 0 ? `${rewardsSummary.discount}% discount on bookings` : 'Earn points to unlock discounts'}</small>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {rewardsSummary && (
                <>
                  <h4 style={{marginTop: '30px'}}>📊 How It Works</h4>
                  <div className="rewards-list">
                    <div className="reward-item">
                      <div className="reward-icon">🎯</div>
                      <div className="reward-info">
                        <h4>Earn 50 Points per Booking</h4>
                        <p>Complete a parking booking and earn 50 loyalty points automatically!</p>
                      </div>
                    </div>

                    <div className="reward-item">
                      <div className="reward-icon" style={{fontSize: '32px'}}>🥉</div>
                      <div className="reward-info">
                        <h4>Silver Tier - 300 Points</h4>
                        <p>Get <strong>10% discount</strong> on all future bookings</p>
                        {rewardsSummary.points < 300 && (
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{width: `${Math.min((rewardsSummary.points / 300) * 100, 100)}%`}}
                            ></div>
                          </div>
                        )}
                        {rewardsSummary.points >= 300 && <span style={{color: '#10b981', fontWeight: 'bold'}}>✅ Unlocked!</span>}
                      </div>
                    </div>

                    <div className="reward-item">
                      <div className="reward-icon" style={{fontSize: '32px'}}>🥇</div>
                      <div className="reward-info">
                        <h4>Gold Tier - 500 Points</h4>
                        <p>Get <strong>15% discount</strong> on all future bookings</p>
                        {rewardsSummary.points < 500 && (
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{width: `${Math.min((rewardsSummary.points / 500) * 100, 100)}%`}}
                            ></div>
                          </div>
                        )}
                        {rewardsSummary.points >= 500 && <span style={{color: '#10b981', fontWeight: 'bold'}}>✅ Unlocked!</span>}
                      </div>
                    </div>

                    <div className="reward-item">
                      <div className="reward-icon" style={{fontSize: '32px'}}>💎</div>
                      <div className="reward-info">
                        <h4>Platinum Tier - 1000 Points</h4>
                        <p>Get <strong>20% discount</strong> on all future bookings</p>
                        {rewardsSummary.points < 1000 && (
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{width: `${Math.min((rewardsSummary.points / 1000) * 100, 100)}%`}}
                            ></div>
                          </div>
                        )}
                        {rewardsSummary.points >= 1000 && <span style={{color: '#10b981', fontWeight: 'bold'}}>✅ Unlocked!</span>}
                      </div>
                    </div>
                  </div>
                </>
              )}
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
                  {!editMode ? (
                    <>
                      <p>Update your personal information</p>
                      <p><strong>Name:</strong> {user.name}</p>
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
                      <p><strong>Address:</strong> {user.address || 'Not provided'}</p>
                      <button className="btn-primary" onClick={handleEditProfile}>Edit Profile</button>
                    </>
                  ) : (
                    <>
                      <p style={{ marginBottom: '15px' }}>Edit your profile information</p>
                      <div className="edit-form">
                        <div className="form-group">
                          <label>Name:</label>
                          <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                            placeholder="Enter your name"
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Phone:</label>
                          <input
                            type="tel"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                            placeholder="Enter your phone number"
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Address:</label>
                          <input
                            type="text"
                            value={editFormData.address}
                            onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                            placeholder="Enter your address"
                            className="form-input"
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                          <button className="btn-primary" onClick={handleSaveProfile}>💾 Save</button>
                          <button className="btn-secondary" onClick={handleCancelEdit}>✖ Cancel</button>
                        </div>
                      </div>
                    </>
                  )}
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
          <button className="btn-edit" onClick={() => { setActiveTab('settings'); handleEditProfile(); }}>Edit Profile</button>
          <button className="btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="quick-actions">
        {getQuickActions().map((action, index) => {
          // Special handling for Rewards & Favorites - switch to tab instead of navigate
          if (action.title === "Rewards") {
            return (
              <div
                key={index}
                className="quick-action"
                onClick={() => setActiveTab("rewards")}
                style={{ cursor: 'pointer' }}
              >
                <div className="action-icon">{action.icon}</div>
                <div className="action-info">
                  <h3>{action.title}</h3>
                  <p>{action.desc}</p>
                </div>
              </div>
            );
          }

          if (action.title === "Favorites") {
            return (
              <div
                key={index}
                className="quick-action"
                onClick={() => setActiveTab("favorites")}
                style={{ cursor: 'pointer' }}
              >
                <div className="action-icon">{action.icon}</div>
                <div className="action-info">
                  <h3>{action.title}</h3>
                  <p>{action.desc}</p>
                </div>
              </div>
            );
          }

          // Regular links for other actions
          return (
            <Link to={action.link} key={index} className="quick-action">
              <div className="action-icon">{action.icon}</div>
              <div className="action-info">
                <h3>{action.title}</h3>
                <p>{action.desc}</p>
              </div>
            </Link>
          );
        })}
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
              className={`tab ${activeTab === "wallet" ? "active" : ""}`}
              onClick={() => setActiveTab("wallet")}
            >
              💰 Wallet
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