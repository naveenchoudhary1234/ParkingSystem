const Notification = require("../model/Notification");
const ApiError = require("../util/ApiError");

// GET USER NOTIFICATIONS
exports.getNotifications = async (req, res, next) => {
  try {
    const { limit = 20, unreadOnly = false } = req.query;

    const filter = { user: req.user.id };
    if (unreadOnly === 'true') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('relatedProperty', 'name address')
      .populate('relatedBooking', 'slotInfo startTime endTime');

    const unreadCount = await Notification.countDocuments({ 
      user: req.user.id, 
      isRead: false 
    });

    res.json({ 
      success: true, 
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// MARK AS READ
exports.markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return next(new ApiError(404, "Notification not found"));
    }

    res.json({ 
      success: true, 
      message: "Marked as read",
      notification
    });
  } catch (error) {
    console.error("Mark As Read Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// MARK ALL AS READ
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ 
      success: true, 
      message: "All notifications marked as read" 
    });
  } catch (error) {
    console.error("Mark All As Read Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// DELETE NOTIFICATION
exports.deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({ 
      _id: notificationId, 
      user: req.user.id 
    });

    if (!notification) {
      return next(new ApiError(404, "Notification not found"));
    }

    res.json({ 
      success: true, 
      message: "Notification deleted" 
    });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// CREATE NOTIFICATION (Internal use)
exports.createNotification = async (userId, data) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedBooking: data.relatedBooking,
      relatedProperty: data.relatedProperty,
      relatedReview: data.relatedReview,
      actionUrl: data.actionUrl,
      actionText: data.actionText,
      priority: data.priority || 'medium',
      expiresAt: data.expiresAt
    });

    return notification;
  } catch (error) {
    console.error("Create Notification Error:", error);
    return null;
  }
};

// GET UNREAD COUNT
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.user.id, 
      isRead: false 
    });

    res.json({ 
      success: true, 
      unreadCount: count 
    });
  } catch (error) {
    console.error("Get Unread Count Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};
