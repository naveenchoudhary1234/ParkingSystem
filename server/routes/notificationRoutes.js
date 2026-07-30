const express = require("express");
const notificationController = require("../controller/notificationController");
const preferenceController = require("../controller/notificationPreferenceController");
const authMiddleware = require("../middlware/authMiddleware");
const router = express.Router();

// All routes require authentication
router.get("/", authMiddleware, notificationController.getNotifications);
router.get("/unread-count", authMiddleware, notificationController.getUnreadCount);
router.put("/:notificationId/read", authMiddleware, notificationController.markAsRead);
router.put("/read-all", authMiddleware, notificationController.markAllAsRead);
router.delete("/:notificationId", authMiddleware, notificationController.deleteNotification);

// Notification Preferences
router.get("/preferences", authMiddleware, preferenceController.getPreferences);
router.put("/preferences", authMiddleware, preferenceController.updatePreferences);

// Push Notifications
router.post("/push/subscribe", authMiddleware, preferenceController.subscribePush);
router.post("/push/unsubscribe", authMiddleware, preferenceController.unsubscribePush);
router.get("/push/vapid-key", preferenceController.getVapidPublicKey);

// Test notification (development only)
router.post("/test", authMiddleware, preferenceController.testNotification);

module.exports = router;
