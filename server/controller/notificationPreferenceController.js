const NotificationPreference = require("../model/NotificationPreference");
const ApiError = require("../util/ApiError");

/**
 * GET user's notification preferences
 */
exports.getPreferences = async (req, res, next) => {
  try {
    let preferences = await NotificationPreference.findOne({ user: req.user.id });
    
    // Create default if doesn't exist
    if (!preferences) {
      preferences = await NotificationPreference.createDefault(req.user.id);
    }

    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error("Get Preferences Error:", error);
    next(new ApiError(500, "Failed to fetch preferences"));
  }
};

/**
 * UPDATE notification preferences
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const updates = req.body;

    let preferences = await NotificationPreference.findOne({ user: req.user.id });
    
    if (!preferences) {
      preferences = await NotificationPreference.create({
        user: req.user.id,
        ...updates
      });
    } else {
      // Update fields
      if (updates.channels) preferences.channels = { ...preferences.channels, ...updates.channels };
      if (updates.bookings) preferences.bookings = { ...preferences.bookings, ...updates.bookings };
      if (updates.payments) preferences.payments = { ...preferences.payments, ...updates.payments };
      if (updates.favorites) preferences.favorites = { ...preferences.favorites, ...updates.favorites };
      if (updates.reviews) preferences.reviews = { ...preferences.reviews, ...updates.reviews };
      if (updates.promotions) preferences.promotions = { ...preferences.promotions, ...updates.promotions };
      if (updates.owner) preferences.owner = { ...preferences.owner, ...updates.owner };
      if (updates.quietHours) preferences.quietHours = { ...preferences.quietHours, ...updates.quietHours };
      
      await preferences.save();
    }

    res.json({
      success: true,
      message: "Preferences updated successfully",
      preferences
    });
  } catch (error) {
    console.error("Update Preferences Error:", error);
    next(new ApiError(500, "Failed to update preferences"));
  }
};

/**
 * SUBSCRIBE to push notifications
 */
exports.subscribePush = async (req, res, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return next(new ApiError(400, "Invalid push subscription"));
    }

    let preferences = await NotificationPreference.findOne({ user: req.user.id });
    
    if (!preferences) {
      preferences = await NotificationPreference.createDefault(req.user.id);
    }

    preferences.pushSubscription = subscription;
    preferences.channels.push = true;
    await preferences.save();

    res.json({
      success: true,
      message: "Push notifications enabled"
    });
  } catch (error) {
    console.error("Subscribe Push Error:", error);
    next(new ApiError(500, "Failed to subscribe to push notifications"));
  }
};

/**
 * UNSUBSCRIBE from push notifications
 */
exports.unsubscribePush = async (req, res, next) => {
  try {
    const preferences = await NotificationPreference.findOne({ user: req.user.id });
    
    if (preferences) {
      preferences.pushSubscription = undefined;
      preferences.channels.push = false;
      await preferences.save();
    }

    res.json({
      success: true,
      message: "Push notifications disabled"
    });
  } catch (error) {
    console.error("Unsubscribe Push Error:", error);
    next(new ApiError(500, "Failed to unsubscribe from push notifications"));
  }
};

/**
 * TEST notification (for development/testing)
 */
exports.testNotification = async (req, res, next) => {
  try {
    const { sendNotification } = require("../services/notificationService");
    
    await sendNotification(req.user.id, {
      type: 'discount_offer',
      title: 'Test Notification',
      message: 'This is a test notification from ParkEasy!',
      priority: 'medium',
      actionUrl: '/profile',
      actionText: 'View Profile'
    });

    res.json({
      success: true,
      message: "Test notification sent (check email, push, and in-app notifications)"
    });
  } catch (error) {
    console.error("Test Notification Error:", error);
    next(new ApiError(500, "Failed to send test notification"));
  }
};

/**
 * GET VAPID public key (for frontend to subscribe to push)
 */
exports.getVapidPublicKey = async (req, res, next) => {
  try {
    res.json({
      success: true,
      publicKey: process.env.VAPID_PUBLIC_KEY || null
    });
  } catch (error) {
    next(new ApiError(500, "Failed to get VAPID key"));
  }
};
