import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { registerAndroidNotificationChannel } from './services/notificationService.ts';

// 🚀 تسجيل قناة أندرويد الرسمية (salam_channel_id) فور فتح التطبيق
if (typeof window !== 'undefined') {
  registerAndroidNotificationChannel();
  window.addEventListener('load', () => {
    registerAndroidNotificationChannel();
    setTimeout(registerAndroidNotificationChannel, 1500);
  });
}

// 🌐 تسجيل الـ Service Worker لتمكين إشعارات الخلفية والعمل بدون إنترنت (Offline Mode & OneSignal Push)
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('⚡ [Service Worker] Registered with scope:', reg.scope);
      })
      .catch((err) => console.warn('⚠️ [Service Worker] Registration failed:', err));

    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((reg) => console.log('📲 [FCM SW] Messaging Service Worker registered:', reg.scope))
      .catch((err) => console.warn('⚠️ [FCM SW] Messaging service worker notice:', err));
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
