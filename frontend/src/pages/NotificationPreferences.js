import React, { useState, useEffect } from "react";
import { 
  getNotificationPreferences, 
  updateNotificationPreferences,
  subscribeToPush,
  unsubscribeFromPush 
} from "../services/notificationService";
import "../styles/notification-preferences.css";

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    fetchPreferences();
    setPushSupported("Notification" in window && "serviceWorker" in navigator);
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await getNotificationPreferences();
      setPreferences(prefs || getDefaultPreferences());
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
      setPreferences(getDefaultPreferences());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPreferences = () => ({
    channels: { push: false, email: true, sms: false },
    bookings: { confirmed: true, reminder: true, endingSoon: true, cancelled: true, extended: true },
    payments: { received: true, refunded: true, failed: true },
    favorites: { available: true, priceDrop: true },
    reviews: { newReview: true, ownerResponse: true, reminder: true },
    promotions: { offers: true, newsletter: false },
    owner: { newBooking: true, propertyApproved: true, propertyRejected: true, paymentReceived: true },
    quietHours: { enabled: false, startTime: "22:00", endTime: "08:00" }
  });

  const handleToggle = (category, field) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: !prev[category][field]
      }
    }));
  };

  const handlePushToggle = async () => {
    try {
      if (!preferences.channels.push) {
        // Enable push
        await subscribeToPush();
        setPreferences(prev => ({
          ...prev,
          channels: { ...prev.channels, push: true }
        }));
        setMessage("✅ Push notifications enabled!");
      } else {
        // Disable push
        await unsubscribeFromPush();
        setPreferences(prev => ({
          ...prev,
          channels: { ...prev.channels, push: false }
        }));
        setMessage("🔕 Push notifications disabled");
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ " + error.message);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateNotificationPreferences(preferences);
      setMessage("✅ Preferences saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Failed to save preferences");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="notification-preferences-page">
        <div className="loading">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="notification-preferences-page">
      <div className="preferences-container">
        <h1>🔔 Notification Preferences</h1>
        <p className="subtitle">Manage how you receive notifications</p>

        {message && (
          <div className={`message ${message.includes("❌") ? "error" : "success"}`}>
            {message}
          </div>
        )}

        {/* Channels */}
        <section className="preference-section">
          <h2>📱 Notification Channels</h2>
          <div className="preference-item">
            <div className="preference-info">
              <h3>🔔 Push Notifications</h3>
              <p>Receive notifications in your browser</p>
              {!pushSupported && <small style={{color: 'red'}}>Not supported in this browser</small>}
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.channels.push}
                onChange={handlePushToggle}
                disabled={!pushSupported}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <h3>📧 Email Notifications</h3>
              <p>Receive notifications via email</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.channels.email}
                onChange={() => handleToggle("channels", "email")}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <h3>📱 SMS Notifications</h3>
              <p>Receive critical alerts via SMS</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.channels.sms}
                onChange={() => handleToggle("channels", "sms")}
              />
              <span className="slider"></span>
            </label>
          </div>
        </section>

        {/* Bookings */}
        <section className="preference-section">
          <h2>🅿️ Booking Notifications</h2>
          {Object.entries({
            confirmed: "Booking Confirmed",
            reminder: "Booking Reminder (before start)",
            endingSoon: "Parking Ending Soon (15 mins)",
            cancelled: "Booking Cancelled",
            extended: "Booking Extended"
          }).map(([key, label]) => (
            <div className="preference-item" key={key}>
              <div className="preference-info">
                <h3>{label}</h3>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.bookings[key]}
                  onChange={() => handleToggle("bookings", key)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </section>

        {/* Payments */}
        <section className="preference-section">
          <h2>💰 Payment Notifications</h2>
          {Object.entries({
            received: "Payment Successful",
            refunded: "Refund Processed",
            failed: "Payment Failed"
          }).map(([key, label]) => (
            <div className="preference-item" key={key}>
              <div className="preference-info">
                <h3>{label}</h3>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.payments[key]}
                  onChange={() => handleToggle("payments", key)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </section>

        {/* Promotions */}
        <section className="preference-section">
          <h2>🎁 Promotional Notifications</h2>
          {Object.entries({
            offers: "Discount Offers & Deals",
            newsletter: "Weekly Newsletter"
          }).map(([key, label]) => (
            <div className="preference-item" key={key}>
              <div className="preference-info">
                <h3>{label}</h3>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.promotions[key]}
                  onChange={() => handleToggle("promotions", key)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </section>

        {/* Quiet Hours */}
        <section className="preference-section">
          <h2>🌙 Quiet Hours</h2>
          <p className="section-desc">Don't send push notifications during these hours</p>
          <div className="preference-item">
            <div className="preference-info">
              <h3>Enable Quiet Hours</h3>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.quietHours.enabled}
                onChange={() => handleToggle("quietHours", "enabled")}
              />
              <span className="slider"></span>
            </label>
          </div>
          {preferences.quietHours.enabled && (
            <div className="time-inputs">
              <div className="time-input-group">
                <label>Start Time:</label>
                <input
                  type="time"
                  value={preferences.quietHours.startTime}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, startTime: e.target.value }
                  }))}
                />
              </div>
              <div className="time-input-group">
                <label>End Time:</label>
                <input
                  type="time"
                  value={preferences.quietHours.endTime}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, endTime: e.target.value }
                  }))}
                />
              </div>
            </div>
          )}
        </section>

        <div className="preferences-actions">
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
