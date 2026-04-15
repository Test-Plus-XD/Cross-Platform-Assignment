// Firebase Cloud Messaging Service Worker
// This runs in a separate context from the main application
// and handles background notifications when the app is closed or minimised

importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js');

// Initialise Firebase in service worker
// This must match your Firebase project configuration
firebase.initializeApp({
  apiKey: "AIzaSyCsVCZW7tF7ScW4e2SBdYtSQrl_GrK4zBk",
  authDomain: "cross-platform-assignmen-b97cc.firebaseapp.com",
  projectId: "cross-platform-assignmen-b97cc",
  storageBucket: "cross-platform-assignmen-b97cc.firebasestorage.app",
  messagingSenderId: "937491674619",
  appId: "1:937491674619:web:81eb1b44453eacdf3a475e",
  measurementId: "G-FQEV6WSNPC"
});

const messaging = firebase.messaging();

function resolveRoute(data) {
  if (!data) {
    return '/';
  }

  if (typeof data.route === 'string' && data.route.trim()) {
    return data.route.trim();
  }

  if (typeof data.url === 'string' && data.url.startsWith('pourrice://')) {
    try {
      const parsed = new URL(data.url);
      const slug = parsed.pathname.replace(/^\/+/, '');

      if (parsed.hostname === 'bookings') {
        return '/booking';
      }

      if (parsed.hostname === 'chat') {
        return `/chat${slug ? '/' + slug : ''}`;
      }

      if (parsed.hostname === 'menu' && slug) {
        return `/restaurant/${slug}`;
      }
    } catch (error) {
      console.warn('[firebase-messaging-sw.js] Failed to parse legacy URL:', error);
    }
  }

  if (typeof data.url === 'string' && data.url.trim()) {
    return data.url.trim();
  }

  return '/';
}

// Handle background messages
// This is triggered when the app is not in focus
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/assets/icon/icon.png',
    badge: '/assets/icon/icon.png',
    data: payload.data,
    tag: 'fcm-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200], // Vibration pattern for mobile devices
    actions: resolveRoute(payload.data) ? [
      { action: 'open', title: 'Open', icon: '/assets/icon/icon.png' }
    ] : []
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
// This is triggered when user clicks on a notification
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);

  event.notification.close();

  // Handle action buttons
  if (event.action === 'open' || !event.action) {
    const routeToOpen = resolveRoute(event.notification.data);
    const urlToOpen = new URL(routeToOpen, self.location.origin).href;

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if ('navigate' in client && client.url.startsWith(self.location.origin)) {
              return client.navigate(urlToOpen).then(() => client.focus());
            }
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if none exists
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle notification close
// Track when users dismiss notifications without clicking
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event.notification.tag);
});
