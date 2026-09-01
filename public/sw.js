// 🌐 Service Worker لتطبيق فريق السلام بكثيبة
// 📲 يدعم العمل بدون إنترنت (Offline Mode) + إشعارات الخلفية (Background Push Notifications عبر OneSignal & Median)

// 📲 استيراد OneSignal Service Worker لدعم إشعارات الخلفية في تطبيق Median والمتصفحات
try {
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
} catch (e) {
  console.warn('[Service Worker] Failed to load OneSignal SDK worker via importScripts:', e);
}

const CACHE_NAME = 'alsalam-app-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/logo-salam.png',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/manifest.json'
];

// 1️⃣ Install Event - Pre-caching App Shell & Offline Fallback Page
self.addEventListener('install', (event) => {
  console.log('⚡ [Service Worker] Installing Service Worker & Pre-caching App Shell...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Pre-cache core files resiliently
      const cachePromises = ASSETS_TO_CACHE.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'reload' });
          if (response && response.status === 200) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn(`[Service Worker] Could not pre-cache ${url}:`, err);
        }
      });
      return Promise.allSettled(cachePromises);
    }).then(() => self.skipWaiting())
  );
});

// 2️⃣ Activate Event - Cleaning Old Caches and claiming clients
self.addEventListener('activate', (event) => {
  console.log('🚀 [Service Worker] Activating Service Worker & Claiming Clients...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing Old Cache Bucket:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3️⃣ Fetch Event - Smart Caching Strategy for Web & Android WebView
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Ensure request is HTTP/HTTPS to prevent WebView custom scheme/file crashes
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Skip real-time databases and external API endpoints
  if (
    url.hostname.includes('firestore.googleapis.com') || 
    url.hostname.includes('firebaseinstallations') ||
    url.hostname.includes('fcmregistrations') ||
    url.hostname.includes('onesignal.com') ||
    url.pathname.startsWith('/api/chat') ||
    url.pathname.startsWith('/api/ai')
  ) {
    return;
  }

  // 📄 A. Navigation / HTML Requests (Loading App Routes / Main Pages)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(event.request, responseToCache.clone());
                cache.put('/', responseToCache.clone());
                cache.put('/index.html', responseToCache);
              } catch (e) {}
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // 1. Return cached index.html or cached root
          const cachedApp = await caches.match(event.request)
            || await caches.match('/index.html') 
            || await caches.match('/');
          if (cachedApp) {
            return cachedApp;
          }
          // 2. If app shell is not found in cache, display the branded offline page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
          return new Response(
            '<div style="font-family:sans-serif;text-align:center;padding:40px;direction:rtl;"><h1>🇧🇹 فريق السلام بكثيبة</h1><p>أنت غير متصل بالإنترنت حالياً.</p></div>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 📦 B. Static Assets (Vite Bundles, JS, CSS, Fonts, Images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Background fetch to refresh cache
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(event.request, responseToCache);
              } catch (e) {}
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          // If image fails and no cache, fallback to logo
          if (event.request.destination === 'image') {
            return caches.match('/logo-salam.png');
          }
          return undefined;
        });

      // If available in cache, return immediately; otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// 🔔 4️⃣ استقبال ومعالجة إشعارات الخلفية (Background Push Notifications)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Background Push notification event received:', event);
  
  let data = {
    title: '🇧🇹 إشعار من فريق السلام بكثيبة',
    body: 'لديك إشعار وتحديث جديد من إدارة النادي',
    icon: '/logo-salam.png',
    badge: '/logo-salam.png',
    tag: `salam-push-${Date.now()}`,
    data: {}
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed) {
        data.title = parsed.title || parsed.heading || parsed.custom?.a?.title || data.title;
        data.body = parsed.body || parsed.message || parsed.alert || parsed.custom?.a?.message || data.body;
        data.icon = parsed.icon || '/logo-salam.png';
        data.badge = parsed.badge || '/logo-salam.png';
        data.data = parsed.data || parsed.custom?.a || parsed;
        if (parsed.tag) data.tag = parsed.tag;
      }
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text() || data.body;
    }
  }

  // التأكد من وجود أيقونة النادي 🇧🇹 في بداية العنوان
  const title = data.title.startsWith('🇧🇹') ? data.title : `🇧🇹 ${data.title}`;
  const notifPayload = data.data || {};
  const isTraining = notifPayload.type === 'training' || Boolean(notifPayload.trainingSessionId);
  const origin = self.location.origin || '';
  const fullLogoUrl = data.icon && data.icon.startsWith('http') ? data.icon : `${origin}/logo-salam.png`;
  const fullBadgeUrl = data.badge && data.badge.startsWith('http') ? data.badge : `${origin}/logo-salam.png`;
  const fullImageUrl = data.image && data.image.startsWith('http') ? data.image : (notifPayload.image || null);

  let defaultActions = [
    { action: 'open', title: 'فتح التطبيق' },
    { action: 'dismiss', title: 'إغلاق' }
  ];

  if (isTraining) {
    defaultActions = [
      { action: 'confirm_attendance', title: '✅ تأكيد الحضور' },
      { action: 'apologize_attendance', title: '❌ اعتذار' },
      { action: 'open', title: 'فتح التمرين' }
    ];
  }

  const options = {
    body: data.body,
    icon: fullLogoUrl,
    badge: fullBadgeUrl,
    image: fullImageUrl || undefined,
    dir: 'rtl',
    lang: 'ar',
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || (isTraining ? 'salam_training_channel' : 'd375dad7-cf17-40a3-9cb2-10d3aacffa67'),
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: { ...(data.data || {}), channelId: 'd375dad7-cf17-40a3-9cb2-10d3aacffa67' },
    actions: defaultActions
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 🔔 5️⃣ التعامل مع إرسال إشعار فوري من صفحات التطبيق عبر postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const cleanTitle = (title || '🇧🇹 إشعار من فريق السلام').startsWith('🇧🇹') 
      ? (title || '🇧🇹 إشعار من فريق السلام') 
      : `🇧🇹 ${title || 'إشعار من فريق السلام'}`;

    const isTraining = options?.data?.type === 'training' || Boolean(options?.data?.trainingSessionId);
    let actions = options?.actions || [
      { action: 'open', title: 'فتح التطبيق' },
      { action: 'dismiss', title: 'إغلاق' }
    ];

    if (isTraining) {
      actions = [
        { action: 'confirm_attendance', title: '✅ تأكيد الحضور' },
        { action: 'apologize_attendance', title: '❌ اعتذار' },
        { action: 'open', title: 'فتح التمرين' }
      ];
    }

    self.registration.showNotification(cleanTitle, {
      body: options?.body || '',
      icon: options?.icon || '/logo-salam.png',
      badge: options?.badge || '/logo-salam.png',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [250, 100, 250],
      requireInteraction: false,
      actions,
      ...options,
    });
  }
});

// 🖱️ 6️⃣ عند نقر المستخدم على الإشعار من شريط الهاتف أو شاشة القفل (معالجة النقر والتوجيه المباشر Deep Linking)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notifData = event.notification.data || {};
  const isTraining = notifData.type === 'training' || Boolean(notifData.trainingSessionId) || notifData.screen === 'training_confirm';
  const trainingSessionId = notifData.trainingSessionId || '';
  const isGallery = notifData.deepLink === 'gallery' || notifData.type === 'gallery' || Boolean(notifData.galleryPostId);
  const galleryPostId = notifData.galleryPostId || notifData.postId || '';

  let actionParam = '';
  if (event.action === 'confirm_attendance' || event.action === 'confirm') {
    actionParam = 'confirm';
  } else if (event.action === 'apologize_attendance' || event.action === 'apologize') {
    actionParam = 'apologize';
  }

  let targetUrl = '/';
  let targetScreen = 'home';

  if (isTraining) {
    targetScreen = 'home';
    targetUrl = `/?screen=home&trainingSessionId=${encodeURIComponent(trainingSessionId)}${actionParam ? `&action=${actionParam}` : ''}`;
  } else if (isGallery) {
    targetScreen = 'gallery';
    targetUrl = `/?screen=gallery${galleryPostId ? `&galleryPostId=${encodeURIComponent(galleryPostId)}` : ''}`;
  }

  // ضمان إنشاء رابط كامل وموثوق يتبع نطاق التطبيق الفعلي
  const absoluteAppUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // إذا كان التطبيق مفتوحاً في نافذة أو إطار Median، يتم التركيز عليه وإرسال الحدث
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'ONESIGNAL_NOTIFICATION_CLICK',
            data: notifData,
            targetScreen,
            action: actionParam,
            trainingSessionId,
            galleryPostId,
          });
          return client.focus();
        }
      }
      // إذا كان التطبيق مغلقاً تماماً، يتم فتحه في واجهة التطبيق مباشرة
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteAppUrl);
      }
    })
  );
});

