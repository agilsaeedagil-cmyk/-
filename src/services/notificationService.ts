// 🔔 خدمة إدارة الإشعارات الفورية لنظام التشغيل والمتصفح (Native Push & System Notifications)

export const SALAM_ANDROID_CHANNEL_ID = 'salam_channel_id';

export interface AndroidChannelConfig {
  id: string;
  name: string;
  description: string;
  importance: 'high' | 'max' | 4 | 5;
  sound: boolean;
  vibration: boolean;
  vibrationPattern?: number[];
  bypassDnd: boolean;
  lights?: boolean;
  lightColor?: string;
  lockscreenVisibility?: 'public' | 1;
}

export const SALAM_CHANNEL_SPEC: AndroidChannelConfig = {
  id: SALAM_ANDROID_CHANNEL_ID,
  name: 'إشعارات نادي السلام الرسمية',
  description: 'إشعارات التمارين، المباريات والأخبار العاجلة لنادي السلام بكثيبة',
  importance: 'high',
  sound: true,
  vibration: true,
  vibrationPattern: [0, 250, 100, 250, 100, 250],
  bypassDnd: true,
  lights: true,
  lightColor: '#FFD70000',
  lockscreenVisibility: 'public',
};

/**
 * 📢 دالة إنشاء وتسجيل قناة أندرويد الرسمية (salam_channel_id) برمجياً
 * عبر جسر Median Native و OneSignal SDK لضمان إظهار البنر العائم (Heads-up) والصوت والاهتزاز
 */
export function registerAndroidNotificationChannel(): boolean {
  if (typeof window === 'undefined') return false;

  let channelRegistered = false;
  const channelPayload = {
    id: SALAM_CHANNEL_SPEC.id,
    name: SALAM_CHANNEL_SPEC.name,
    description: SALAM_CHANNEL_SPEC.description,
    importance: 4, // IMPORTANCE_HIGH in Android (4) / MAX (5)
    sound: true,
    vibrate: true,
    vibration: true,
    vibrationPattern: SALAM_CHANNEL_SPEC.vibrationPattern,
    bypassDnd: true,
    lights: true,
    lightColor: '#FFD70000',
    lockscreenVisibility: 1, // VISIBILITY_PUBLIC
  };

  try {
    // 1. استدعاء جسر Median Android Notifications
    const median = (window as any).median;
    const gonative = (window as any).gonative;

    if (median?.android?.notifications?.createChannel) {
      median.android.notifications.createChannel(channelPayload);
      console.log('✅ [Median] Created Android notification channel via median.android.notifications.createChannel:', SALAM_ANDROID_CHANNEL_ID);
      channelRegistered = true;
    } else if (median?.push?.createNotificationChannel) {
      median.push.createNotificationChannel(channelPayload);
      console.log('✅ [Median] Created Android notification channel via median.push.createNotificationChannel:', SALAM_ANDROID_CHANNEL_ID);
      channelRegistered = true;
    } else if (median?.push?.setNotificationChannel) {
      median.push.setNotificationChannel(channelPayload);
      console.log('✅ [Median] Created Android notification channel via median.push.setNotificationChannel:', SALAM_ANDROID_CHANNEL_ID);
      channelRegistered = true;
    } else if (gonative?.android?.notifications?.createChannel) {
      gonative.android.notifications.createChannel(channelPayload);
      console.log('✅ [GoNative] Created Android notification channel:', SALAM_ANDROID_CHANNEL_ID);
      channelRegistered = true;
    }

    // 2. ضبط القناة الافتراضية في OneSignal Web/Native إذا كان متاحاً
    const OneSignal = (window as any).OneSignal;
    if (OneSignal?.Notifications?.setNotificationChannel) {
      OneSignal.Notifications.setNotificationChannel(SALAM_ANDROID_CHANNEL_ID);
      console.log('✅ [OneSignal] Set default channel to:', SALAM_ANDROID_CHANNEL_ID);
      channelRegistered = true;
    }
  } catch (err) {
    console.warn('ℹ️ [Channel Register Note]:', err);
  }

  return channelRegistered;
}

/**
 * 📲 دالة تفعيل الإشعارات وتوجيه المستخدم لإعدادات التطبيق لتمكين العرض على الشاشة (Heads-up / Pop on screen)
 */
export const enableNotificationsAndGoToSettings = async (): Promise<void> => {
  const win = window as any;
  try {
    if (win.plugins && win.plugins.OneSignal) {
      await win.plugins.OneSignal.Notifications.requestPermission(true);
    } else if (win.OneSignal && win.OneSignal.Notifications) {
      await win.OneSignal.Notifications.requestPermission(true);
    } else if (typeof Notification !== 'undefined' && 'requestPermission' in Notification) {
      await Notification.requestPermission();
    }
  } catch (err) {
    console.warn("⚠️ [Notification Permission Error]:", err);
  }

  setTimeout(() => {
    if (win.median && win.median.settings && typeof win.median.settings.openAppSettings === 'function') {
      win.median.settings.openAppSettings();
    } else if (win.gonative && win.gonative.settings && typeof win.gonative.settings.openAppSettings === 'function') {
      win.gonative.settings.openAppSettings();
    } else {
      // توجيه مباشر لإعدادات التطبيق في أندرويد
      try {
        window.location.href = 'package:' + 'com.alslam.app';
      } catch {}
      alert('يرجى الانتقال إلى إعدادات التطبيق وتفعيل خيار الإشعارات يدوياً.');
    }
  }, 1500);
};

export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Tone D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // Tone A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Audio playback may be restricted before user gesture
  }
}

/**
 * 📲 طلب إذن الإشعارات من المستخدم بشكل صريح
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn("⚠️ هذا المتصفح أو الجهاز لا يدعم الإشعارات.");
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("🔔 نتيجة إذن الإشعارات:", permission);
    return permission;
  } catch (err) {
    console.warn("⚠️ خطأ أثناء طلب إذن الإشعارات:", err);
    return Notification.permission;
  }
}

/**
 * 🚀 دالة طلب إذن OneSignal وتفعيل قناة أندرويد ذات الأولوية القصوى (High Importance / Heads-up Banner)
 * متوافقة مع OneSignal v16 SDK و Median Web & Native Bridge
 */
export async function requestAndSetupOneSignalWithHighImportanceChannel(): Promise<{
  permissionGranted: boolean;
  channelCreated: boolean;
  subscriptionId?: string;
}> {
  if (typeof window === 'undefined') {
    return { permissionGranted: false, channelCreated: false };
  }

  let permissionGranted = false;
  let subscriptionId: string | undefined = undefined;

  try {
    // 1. طلب إذن الإشعارات عبر OneSignal Web SDK v16 إذا كان متاحاً
    const OneSignal = (window as any).OneSignal;
    if (OneSignal && OneSignal.Notifications) {
      console.log("📲 جاري طلب إذن الإشعارات عبر OneSignal.Notifications.requestPermission(true)...");
      await OneSignal.Notifications.requestPermission(true);
      permissionGranted = OneSignal.Notifications.permission === true || Notification.permission === 'granted';
      subscriptionId = OneSignal.User?.pushSubscription?.id;
    } else {
      // 2. طلب الإذن عبر نافذة المتصفح القياسية
      const nativePerm = await Notification.requestPermission();
      permissionGranted = nativePerm === 'granted';
    }

    // 3. التكامل مع Median Push Plugin إذا كان التطبيق يعمل داخل تطبيق Android/iOS المبني بـ Median
    const median = (window as any).median;
    if (median && median.push) {
      try {
        if (typeof median.push.register === 'function') {
          median.push.register();
        }
        const tokens = await median.push.getTokens();
        if (tokens) {
          subscriptionId = tokens.oneSignalSubscriptionId || tokens.oneSignalPlayerId || subscriptionId;
        }
      } catch (mErr) {
        console.warn("ℹ️ Median push bridge notice:", mErr);
      }
    }

    if (permissionGranted) {
      console.log("✅ تم منح إذن الإشعارات بنجاح!");

      // 4. تسجيل قناة أندرويد الرسمية (salam_channel_id) ذات الأولوية القصوى
      const channelCreated = registerAndroidNotificationChannel();

      // 5. حفظ المعرف وربطه بالسيرفر
      if (subscriptionId) {
        localStorage.setItem('salam_onesignal_id', subscriptionId);
        fetch('/api/save-onesignal-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onesignal_id: subscriptionId }),
        }).catch(() => {});
      }

      // 6. تهيئة قناة الأولوية القصوى (High Importance / Heads-up Banner)
      // وتفعيل صوت الإشعار الترحيبي والاهتزاز
      playNotificationSound();
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate([300, 150, 300]);
        } catch {}
      }

      return {
        permissionGranted: true,
        channelCreated: channelCreated || true,
        subscriptionId,
      };
    }

    return {
      permissionGranted: false,
      channelCreated: false,
    };
  } catch (error) {
    console.error("❌ خطأ أثناء طلب إذن الإشعارات وقناة الأولوية:", error);
    return {
      permissionGranted: false,
      channelCreated: false,
    };
  }
}

/**
 * 🔔 إظهار إشعار نظام حقيقي على شاشة الهاتف أو المتصفح فوراً
 */
export async function showSystemNotification(
  title: string,
  options: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  } = {}
): Promise<boolean> {
  // 1. تشغيل النغمة والاهتزاز فوراً
  playNotificationSound();
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {}
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // 2. التحقق من الإذن وطلبه إذا لم يكن محدداً
  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {}
  }

  if (permission !== 'granted') {
    console.log("ℹ️ لم يتم منح إذن الإشعارات بعد (الحالة:", permission, ")");
    return false;
  }

  const notificationOptions: NotificationOptions = {
    body: options.body || '',
    icon: options.icon || '/logo-salam.png',
    badge: options.badge || '/logo-salam.png',
    dir: 'rtl',
    lang: 'ar',
    tag: options.tag || `salam-notif-${Date.now()}`,
    data: options.data,
  };

  // 3. الطريقة الأساسية المتوافقة مع أندرويد وجميع الهواتف والمتصفحات الحديثة عبر Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notificationOptions);
        console.log("✅ تم إطلاق إشعار النظام عبر Service Worker بنجاح:", title);
        return true;
      }
    } catch (swErr) {
      console.warn("⚠️ فشل الإشعار عبر Service Worker، جاري المحاولة بالطريقة المباشرة:", swErr);
    }
  }

  // 4. الطريقة البديلة المباشرة لمتصفحات سطح المكتب
  try {
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    console.log("✅ تم إطلاق إشعار النظام المباشر بنجاح:", title);
    return true;
  } catch (directErr) {
    console.warn("⚠️ تعذر إطلاق إشعار النظام المباشر:", directErr);
    return false;
  }
}
