import { apiRequest } from "../api";

/**
 * Get user's notifications
 */
export const getNotifications = async (limit = 20, unreadOnly = false) => {
  try {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams({ limit, unreadOnly });
    const response = await apiRequest(`/notifications?${params}`, "GET", null, token);
    return response;
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    throw error;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await apiRequest("/notifications/unread-count", "GET", null, token);
    return response.unreadCount || 0;
  } catch (error) {
    console.error("Failed to fetch unread count:", error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    const token = localStorage.getItem("token");
    await apiRequest(`/notifications/${notificationId}/read`, "PUT", null, token);
  } catch (error) {
    console.error("Failed to mark as read:", error);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  try {
    const token = localStorage.getItem("token");
    await apiRequest("/notifications/read-all", "PUT", null, token);
  } catch (error) {
    console.error("Failed to mark all as read:", error);
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const token = localStorage.getItem("token");
    await apiRequest(`/notifications/${notificationId}`, "DELETE", null, token);
  } catch (error) {
    console.error("Failed to delete notification:", error);
  }
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await apiRequest("/notifications/preferences", "GET", null, token);
    return response.preferences;
  } catch (error) {
    console.error("Failed to fetch preferences:", error);
    throw error;
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (preferences) => {
  try {
    const token = localStorage.getItem("token");
    const response = await apiRequest("/notifications/preferences", "PUT", preferences, token);
    return response.preferences;
  } catch (error) {
    console.error("Failed to update preferences:", error);
    throw error;
  }
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async () => {
  try {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
      throw new Error("This browser does not support notifications");
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission denied");
    }

    // Get VAPID public key
    const token = localStorage.getItem("token");
    const vapidResponse = await apiRequest("/notifications/push/vapid-key", "GET");
    
    if (!vapidResponse.publicKey) {
      throw new Error("VAPID key not configured on server");
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    
    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidResponse.publicKey)
    });

    // Send subscription to backend
    await apiRequest("/notifications/push/subscribe", "POST", { subscription }, token);
    
    return true;
  } catch (error) {
    console.error("Failed to subscribe to push:", error);
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async () => {
  try {
    const token = localStorage.getItem("token");
    
    // Get service worker registration
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }

    // Notify backend
    await apiRequest("/notifications/push/unsubscribe", "POST", null, token);
    
    return true;
  } catch (error) {
    console.error("Failed to unsubscribe from push:", error);
    throw error;
  }
};

/**
 * Helper: Convert VAPID key
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
