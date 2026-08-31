importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDTEiymT3bmrUGAfMWpJFH-quwUlB-fko",
  authDomain: "alsalam-team-app.firebaseapp.com",
  projectId: "alsalam-team-app",
  storageBucket: "alsalam-team-app.appspot.com",
  messagingSenderId: "810746194030",
  appId: "1:810746194030:web:669a273fafb48d5bfe5e7f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'إشعار من نادي السلام';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || payload.data?.message || '',
    icon: '/logo-salam.png',
    badge: '/logo-salam.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: payload.data || payload
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
