// Firebase Cloud Messaging Service Worker
// This runs in the background to handle push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyCRu443o3OXZwY3mR0PPd9XbexCj-4w3TU",
  authDomain: "rakshanet-9a0a5.firebaseapp.com",
  projectId: "rakshanet-9a0a5",
  storageBucket: "rakshanet-9a0a5.firebasestorage.app",
  messagingSenderId: "1076423396657",
  appId: "1:1076423396657:web:a6fcd752acfcce35603410",
  measurementId: "G-P2WFP52PQG"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || '🚨 Emergency Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'Someone nearby needs your help!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'emergency-alert',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: payload.data?.url || '/',
      chatId: payload.data?.chatId,
      emergencyId: payload.data?.emergencyId,
    },
    actions: [
      {
        action: 'open',
        title: 'View Emergency',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Get chatId from notification data for proper routing
  const chatId = event.notification.data?.chatId;
  const emergencyId = event.notification.data?.emergencyId;
  const urlToOpen = event.notification.data?.url || '/chat';
  
  // Build URL with chatId if available for proper routing
  const finalUrl = chatId ? `${urlToOpen}?chatId=${chatId}&emergencyId=${emergencyId}` : urlToOpen;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(finalUrl);
          return;
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(finalUrl);
      }
    })
  );
});
