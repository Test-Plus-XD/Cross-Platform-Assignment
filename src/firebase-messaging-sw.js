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
    actions: payload.data?.url ? [
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
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
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
