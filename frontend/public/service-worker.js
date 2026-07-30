/* eslint-disable no-restricted-globals */
// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {};
  
  try {
    notificationData = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Failed to parse push data:', error);
    notificationData = {
      title: 'New Notification',
      body: 'You have a new notification from ParkEasy',
      icon: '/logo192.png'
    };
  }

  const title = notificationData.title || 'ParkEasy';
  const options = {
    body: notificationData.body || notificationData.message || 'You have a new notification',
    icon: notificationData.icon || '/logo192.png',
    badge: notificationData.badge || '/badge.png',
    vibrate: [200, 100, 200],
    tag: notificationData.tag || 'parkeasy-notification',
    data: notificationData.data || {},
    actions: notificationData.actions || [
      { action: 'view', title: 'View', icon: '/view-icon.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/dismiss-icon.png' }
    ],
    requireInteraction: false,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification close analytics if needed
  // event.waitUntil(
  //   fetch('/api/analytics/notification-closed', {
  //     method: 'POST',
  //     body: JSON.stringify({ notificationId: event.notification.tag })
  //   })
  // );
});

// Handle background sync (optional - for offline support)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    // Fetch latest notifications when back online
    const response = await fetch('/api/notifications?limit=10');
    const data = await response.json();
    console.log('Synced notifications:', data);
  } catch (error) {
    console.error('Failed to sync notifications:', error);
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});

// Cache notification icons for offline use (optional)
self.addEventListener('fetch', (event) => {
  // Only cache notification-related assets
  if (event.request.url.includes('/logo') || 
      event.request.url.includes('/badge') ||
      event.request.url.includes('/icon')) {
    
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open('notification-icons').then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});
