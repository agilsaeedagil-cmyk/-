import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, Flame } from 'lucide-react';
import { Logo } from './components/Logo';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { TeamView } from './components/TeamView';
import { MatchesView } from './components/MatchesView';
import { NewsView } from './components/NewsView';
import { AboutView } from './components/AboutView';
import { StoreView } from './components/StoreView';
import { BottomNav } from './components/BottomNav';
import { Drawer } from './components/Drawer';
import { SettingsModal } from './components/SettingsModal';
import { NotificationsCenter } from './components/NotificationsCenter';
import { AdminPanel } from './components/AdminPanel';
import { TrainingNotificationModal } from './components/TrainingNotificationModal';
import { PlayerLoginModal } from './components/PlayerLoginModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LiveMatchTicker } from './components/LiveMatchTicker';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { TeamGalleryView } from './components/TeamGalleryView';
import { apiService, getLocalCache, getDeletedIds, recordDeletedNotification, recordDeletedTrainingSession } from './services/api';
import { requestNotificationPermission, showSystemNotification } from './services/notificationService';
import { Match, NewsItem, Player, TrainingSession, AppNotification, ClubStats, ClubInfo, StoreProduct, StoreSettings, AttendanceResponse } from './types';
import { initialClubInfo, initialClubStats, initialMatches, initialNews, initialNotifications, initialPlayers, initialTrainingSessions, initialStoreProducts, initialStoreSettings } from './data/initialData';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Modals & Drawers state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isPlayerLoginOpen, setIsPlayerLoginOpen] = useState<boolean>(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);
  const [selectedNewsForDetail, setSelectedNewsForDetail] = useState<NewsItem | null>(null);
  const [targetGalleryPostId, setTargetGalleryPostId] = useState<string | null>(null);

  // Active Training Notification Modal State
  const [activeTrainingModal, setActiveTrainingModal] = useState<TrainingSession | null>(null);
  const [selectedLiveMatchModal, setSelectedLiveMatchModal] = useState<Match | null>(null);

  // User Role & Authentication State (Requirement: Initial welcome choice portal)
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<'player' | 'fan'>('fan');
  const [loggedInPlayer, setLoggedInPlayer] = useState<any>(null);

  // App Data State (Initialized strictly from database cache or empty arrays, 100% Firestore dependent)
  const [news, setNews] = useState<NewsItem[]>(() => getLocalCache<NewsItem[]>('news', []));
  const [matches, setMatches] = useState<Match[]>(() => getLocalCache<Match[]>('matches', []));
  const [players, setPlayers] = useState<Player[]>(() => getLocalCache<Player[]>('players', []));
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>(() => {
    const list = getLocalCache<TrainingSession[]>('trainings', []);
    try {
      const trainDeleted = getDeletedIds('training_sessions');
      const notifDeleted = getDeletedIds('notifications');
      const exSet = new Set([...trainDeleted, ...notifDeleted, 'train-1', 'notif-1']);
      return list.filter((t) => {
        if (!t || !t.id) return false;
        const tid = String(t.id).trim();
        if (exSet.has(tid)) return false;
        const text = `${t.title || ''} ${t.location || ''} ${t.note || ''}`;
        if (text.includes('تمرين ياشباب') || text.includes('ملعب السلام بكثيبة')) return false;
        return true;
      });
    } catch {
      return list.filter((t) => t && t.id);
    }
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const list = getLocalCache<AppNotification[]>('notifications', []);
    try {
      const notifDeleted = getDeletedIds('notifications');
      const trainDeleted = getDeletedIds('training_sessions');
      const exSet = new Set([...notifDeleted, ...trainDeleted, 'notif-1', 'train-1']);
      return list.filter((n) => {
        if (!n || !n.id) return false;
        const nid = String(n.id).trim();
        const sid = String(n.trainingSessionId || '').trim();
        if (exSet.has(nid) || (sid && exSet.has(sid))) return false;
        const text = `${n.title || ''} ${n.message || ''}`;
        if (text.includes('تمرين ياشباب') || text.includes('ملعب السلام بكثيبة')) return false;
        return true;
      });
    } catch {
      return list.filter((n) => n && n.id);
    }
  });
  const [stats, setStats] = useState<ClubStats>(() => getLocalCache<ClubStats>('stats', initialClubStats));
  const [clubInfo, setClubInfo] = useState<ClubInfo>(() => getLocalCache<ClubInfo>('club_info', initialClubInfo));
  const [attendanceResponses, setAttendanceResponses] = useState<AttendanceResponse[]>(() => getLocalCache<AttendanceResponse[]>('responses', []));
  const [respondedSessionIds, setRespondedSessionIds] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [activeToastNotif, setActiveToastNotif] = useState<AppNotification | null>(null);
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>(() => {
    try {
      const dismissed: string[] = JSON.parse(localStorage.getItem('salam_dismissed_notifications_ids') || '[]');
      const deleted: string[] = JSON.parse(localStorage.getItem('salam_deleted_notifications_ids') || '[]');
      return Array.from(new Set([...dismissed, ...deleted]));
    } catch {
      return [];
    }
  });
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isPermissionBannerDismissed, setIsPermissionBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('salam_notif_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const initialNotifsLoadedRef = useRef(false);
  const knownNotifsSetRef = useRef<Set<string>>(new Set());

  // دالة تفعيل الإشعارات عبر OneSignal وتوجيه المستخدم لإعدادات التطبيق في أندرويد لتمكين خيار "عرض على الشاشة" (Pop on screen)
  const enableNotificationsAndGoToSettings = async () => {
    const win = window as any;
    try {
      if (win.plugins && win.plugins.OneSignal) {
        await win.plugins.OneSignal.Notifications.requestPermission(true);
      } else if (win.OneSignal && win.OneSignal.Notifications) {
        await win.OneSignal.Notifications.requestPermission(true);
      } else if (typeof Notification !== 'undefined' && 'requestPermission' in Notification) {
        await Notification.requestPermission();
      }
    } catch (e) {
      console.warn("OneSignal permission request notice:", e);
    }

    setNotificationPermission('granted');
    setIsPermissionBannerDismissed(true);
    try {
      localStorage.setItem('salam_notif_banner_dismissed', 'true');
    } catch {}

    apiService.registerFcmToken({
      userRole,
      userId: loggedInPlayer?.id,
      playerName: loggedInPlayer?.name,
    });

    setTimeout(() => {
      const win = window as any;
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

  const handleEnablePushNotifications = async () => {
    await enableNotificationsAndGoToSettings();
  };

  const handleDeleteNotification = async (id: string) => {
    const cleanId = String(id).trim();
    if (!cleanId) return;

    const targetNotif = notifications.find((n) => String(n.id).trim() === cleanId);
    const targetTraining = trainingSessions.find((t) => String(t.id).trim() === cleanId);
    const sId = targetNotif?.trainingSessionId || (targetNotif?.type === 'training' ? cleanId : (targetTraining ? targetTraining.id : (cleanId.startsWith('ts-') || cleanId.startsWith('train-') ? cleanId : null)));

    // 1. Immediately remove from React state
    setNotifications((prev) => prev.filter((n) => {
      const nid = String(n.id).trim();
      const nSid = String(n.trainingSessionId || '').trim();
      if (nid === cleanId || nid === 'notif-1') return false;
      if (sId && (nSid === sId || nid === sId)) return false;
      return true;
    }));

    if (sId) {
      setTrainingSessions((prev) => prev.filter((t) => String(t.id).trim() !== sId && String(t.id).trim() !== 'train-1'));
      if (activeTrainingModal && String(activeTrainingModal.id).trim() === sId) {
        setActiveTrainingModal(null);
      }
    }

    setDismissedToastIds((prev) => Array.from(new Set([...prev, cleanId, 'notif-1', ...(sId ? [sId] : [])])));
    if (activeToastNotif && (String(activeToastNotif.id).trim() === cleanId || (sId && String(activeToastNotif.trainingSessionId || '').trim() === sId))) {
      setActiveToastNotif(null);
    }

    // 2. Persist records in localStorage
    recordDeletedNotification(cleanId, sId);
    if (sId) {
      recordDeletedTrainingSession(sId, cleanId);
    }

    // 3. Delete from backend/Firestore
    try {
      if (sId) {
        await apiService.deleteTrainingSession(sId);
      }
      await apiService.deleteNotification(cleanId);
    } catch (err) {
      console.warn("⚠️ Error deleting notification/training:", err);
    }
  };

  // Automatically pick the latest unread/undismissed notification for floating toast
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications.find((n) => !dismissedToastIds.includes(n.id));
      if (latest && latest !== activeToastNotif) {
        setActiveToastNotif(latest);
      } else if (!latest) {
        setActiveToastNotif(null);
      }
    } else {
      setActiveToastNotif(null);
    }
  }, [notifications, dismissedToastIds]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Store State (Cached locally for offline store browsing, 100% Firestore dependent)
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>(() => {
    const cached = getLocalCache<{ products: StoreProduct[]; settings: StoreSettings } | null>('store_data', null);
    return cached?.products && Array.isArray(cached.products) ? cached.products : [];
  });
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const cached = getLocalCache<{ products: StoreProduct[]; settings: StoreSettings } | null>('store_data', null);
    return cached?.settings ? cached.settings : initialStoreSettings;
  });

  // Restore player session if stored locally & handle Push Notification Deep Linking
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('salam_user_role');
      const savedPlayer = localStorage.getItem('salam_player_user');
      const savedResponded = localStorage.getItem('salam_responded_sessions');
      if (savedRole === 'player' && savedPlayer) {
        setUserRole('player');
        setLoggedInPlayer(JSON.parse(savedPlayer));
        setShowWelcome(false);
        setActiveTab('home');
      } else if (savedRole === 'fan') {
        setUserRole('fan');
        setShowWelcome(false);
        setActiveTab('home');
      }
      if (savedResponded) {
        setRespondedSessionIds(JSON.parse(savedResponded));
      }
    } catch {
      // localStorage error fallback
    }

    // 🚀 Check URL params or Session Storage for Push Notification Deep Linking (e.g. ?screen=gallery&galleryPostId=xxx)
    const checkUrlOrSessionDeepLink = () => {
      try {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const screenParam = urlParams.get('screen') || urlParams.get('target') || urlParams.get('tab');
          const galleryPostId = urlParams.get('galleryPostId') || (screenParam === 'gallery' ? urlParams.get('postId') : null);

          if (screenParam === 'gallery' || galleryPostId) {
            console.log("📲 [DeepLink] Detected notification deep link to Gallery with postId:", galleryPostId);
            setShowWelcome(false); // تجاوز شاشة البداية فوراً
            setActiveTab('gallery');
            if (galleryPostId) {
              setTargetGalleryPostId(galleryPostId);
            }
            // تنظيف الرابط في المتصفح للحفاظ على نظافة العنوان
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch {}
          }
        }
      } catch (e) {
        console.warn("Deep link parse notice:", e);
      }
    };

    checkUrlOrSessionDeepLink();

    // 📲 Listen to Service Worker postMessage events when user clicks notification
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && (event.data.type === 'ONESIGNAL_NOTIFICATION_CLICK' || event.data.type === 'NOTIFICATION_CLICK')) {
        const notifData = event.data.data || {};
        const targetScreen = event.data.targetScreen || notifData.deepLink || (notifData.type === 'gallery' ? 'gallery' : '');
        const gPostId = event.data.galleryPostId || notifData.galleryPostId || notifData.postId;

        console.log("📲 [SW Message] Received notification click payload:", notifData);
        if (targetScreen === 'gallery' || gPostId || notifData.type === 'gallery') {
          setShowWelcome(false); // تجاوز شاشة البداية فوراً
          setActiveTab('gallery');
          if (gPostId) {
            setTargetGalleryPostId(gPostId);
          }
        }
      }
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // 📲 Setup OneSignal Web SDK v16 notification click listener if available
    const win = window as any;
    try {
      if (win.OneSignal && win.OneSignal.Notifications) {
        win.OneSignal.Notifications.addEventListener('click', (event: any) => {
          console.log("📲 [OneSignal SDK Click Event]:", event);
          const additionalData = event?.notification?.additionalData || event?.result?.notification?.additionalData;
          const deepLink = additionalData?.deepLink || (additionalData?.type === 'gallery' ? 'gallery' : '');
          const gPostId = additionalData?.galleryPostId || additionalData?.postId;

          if (deepLink === 'gallery' || gPostId || additionalData?.type === 'gallery') {
            setShowWelcome(false); // تجاوز شاشة البداية فوراً
            setActiveTab('gallery');
            if (gPostId) {
              setTargetGalleryPostId(gPostId);
            }
          }
        });
      }
    } catch (osErr) {
      console.warn("OneSignal click listener setup notice:", osErr);
    }

    // 📲 Setup Median Native Push click listener if available
    const handleMedianNotification = (e: any) => {
      try {
        const customData = e?.detail?.custom || e?.detail?.data || e?.detail?.additionalData || e?.detail;
        console.log("📲 [Median Push Event Detail]:", customData);
        if (customData) {
          const deepLink = customData.deepLink || (customData.type === 'gallery' ? 'gallery' : '');
          const gPostId = customData.galleryPostId || customData.postId;
          if (deepLink === 'gallery' || gPostId || customData.type === 'gallery') {
            setShowWelcome(false); // تجاوز شاشة البداية فوراً
            setActiveTab('gallery');
            if (gPostId) {
              setTargetGalleryPostId(gPostId);
            }
          }
        }
      } catch {}
    };

    window.addEventListener('median_push_opened', handleMedianNotification);
    window.addEventListener('gonative_push_opened', handleMedianNotification);

    return () => {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      window.removeEventListener('median_push_opened', handleMedianNotification);
      window.removeEventListener('gonative_push_opened', handleMedianNotification);
    };
  }, []);

  const handleLoginPlayerSuccess = (playerData: any) => {
    setUserRole('player');
    setLoggedInPlayer(playerData);
    setShowWelcome(false);
    setActiveTab('home');
    try {
      localStorage.setItem('salam_user_role', 'player');
      localStorage.setItem('salam_player_user', JSON.stringify(playerData));
    } catch {
      // ignore
    }
  };

  const handleLogoutPlayer = () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutConfirmOpen(false);
    setUserRole('fan');
    setLoggedInPlayer(null);
    setShowWelcome(true);
    try {
      localStorage.removeItem('salam_user_role');
      localStorage.removeItem('salam_player_user');
    } catch {
      // ignore
    }
  };

  // Initial Load from Backend API
  const loadData = async () => {
    const [fetchedClubInfo, fetchedNews, fetchedMatches, fetchedPlayers, fetchedTrainings, fetchedNotifs, fetchedStats, fetchedStore, fetchedResponses] = await Promise.all([
      apiService.getClubInfo(),
      apiService.getNews(),
      apiService.getMatches(),
      apiService.getPlayers(),
      apiService.getTrainingSessions(),
      apiService.getNotifications(),
      apiService.getStats(),
      apiService.getStoreData(),
      apiService.getAttendanceResponses(),
    ]);

    if (fetchedClubInfo) setClubInfo(fetchedClubInfo);
    if (Array.isArray(fetchedNews)) setNews(fetchedNews);
    if (Array.isArray(fetchedMatches)) setMatches(fetchedMatches);
    if (Array.isArray(fetchedPlayers)) setPlayers(fetchedPlayers);
    if (Array.isArray(fetchedTrainings)) {
      try {
        const trainDeleted = getDeletedIds('training_sessions');
        const notifDeleted = getDeletedIds('notifications');
        const exSet = new Set([...trainDeleted, ...notifDeleted, 'train-1', 'notif-1']);
        setTrainingSessions(fetchedTrainings.filter((t) => {
          if (!t || !t.id) return false;
          const tid = String(t.id).trim();
          return !exSet.has(tid);
        }));
      } catch {
        setTrainingSessions(fetchedTrainings);
      }
    }
    if (Array.isArray(fetchedNotifs)) {
      try {
        const notifDeleted = getDeletedIds('notifications');
        const trainDeleted = getDeletedIds('training_sessions');
        const exSet = new Set([...notifDeleted, ...trainDeleted, 'notif-1', 'train-1']);
        setNotifications(fetchedNotifs.filter((n) => {
          if (!n || !n.id) return false;
          const nid = String(n.id).trim();
          const sid = String(n.trainingSessionId || '').trim();
          if (exSet.has(nid) || (sid && exSet.has(sid))) return false;
          return true;
        }));
      } catch {
        setNotifications(fetchedNotifs);
      }
    }
    if (Array.isArray(fetchedResponses)) setAttendanceResponses(fetchedResponses);
    setStats(fetchedStats);
    if (fetchedStore) {
      if (Array.isArray(fetchedStore.products)) {
        setStoreProducts(fetchedStore.products);
      }
      if (fetchedStore.settings) {
        setStoreSettings(fetchedStore.settings);
      }
    }
  };

  const handleAttendanceSubmitted = (sessionId?: string) => {
    if (sessionId) {
      setRespondedSessionIds((prev) => {
        const updated = Array.from(new Set([...prev, sessionId]));
        try {
          localStorage.setItem('salam_responded_sessions', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    }
    loadData();
  };

  useEffect(() => {
    // Request notification permission if supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().catch(() => {});
      }
    }
    apiService.registerFcmToken({
      userRole,
      userId: loggedInPlayer?.id,
      playerName: loggedInPlayer?.name
    });
  }, [userRole, loggedInPlayer]);

  useEffect(() => {
    loadData();

    // 🔄 Real-time Firestore Listeners Subscriptions (Matches, News, Players, Club Identity, Store, Attendance, Notifications)
    const unsubMatches = apiService.subscribeToMatches((liveMatches) => {
      if (Array.isArray(liveMatches)) setMatches(liveMatches);
    });

    const unsubNews = apiService.subscribeToNews((liveNews) => {
      if (Array.isArray(liveNews)) setNews(liveNews);
    });

    const unsubPlayers = apiService.subscribeToPlayers((livePlayers) => {
      if (Array.isArray(livePlayers)) setPlayers(livePlayers);
    });

    const unsubClubInfo = apiService.subscribeToClubInfo((liveInfo) => {
      if (liveInfo) setClubInfo(liveInfo);
    });

    const unsubStore = apiService.subscribeToStoreProducts((liveProds) => {
      if (Array.isArray(liveProds)) setStoreProducts(liveProds);
    });

    const unsubResponses = apiService.subscribeToAttendanceResponses((liveResponses) => {
      if (Array.isArray(liveResponses)) setAttendanceResponses(liveResponses);
    });

    const unsubNotifs = apiService.subscribeToNotifications((liveNotifs) => {
      if (Array.isArray(liveNotifs)) {
        let filteredNotifs = liveNotifs;
        try {
          const notifDeleted = getDeletedIds('notifications');
          const trainDeleted = getDeletedIds('training_sessions');
          const exSet = new Set([...notifDeleted, ...trainDeleted, 'notif-1', 'train-1']);
          filteredNotifs = liveNotifs.filter((n) => {
            if (!n || !n.id) return false;
            const nid = String(n.id).trim();
            const sid = String(n.trainingSessionId || '').trim();
            if (exSet.has(nid) || (sid && exSet.has(sid))) return false;
            return true;
          });
        } catch {}

        setNotifications(filteredNotifs);

        // 🔔 Trigger native system push notification when new notification arrives from another device/admin
        if (initialNotifsLoadedRef.current) {
          filteredNotifs.forEach((n) => {
            if (n && n.id && !knownNotifsSetRef.current.has(n.id)) {
              knownNotifsSetRef.current.add(n.id);
              showSystemNotification(n.title, {
                body: n.message,
                icon: '/logo-salam.png',
                badge: '/logo-salam.png',
                tag: `notif-${n.id}`,
              });
            }
          });
        } else {
          initialNotifsLoadedRef.current = true;
          filteredNotifs.forEach((n) => {
            if (n && n.id) knownNotifsSetRef.current.add(n.id);
          });
        }
      }
    });

    const unsubTrainings = apiService.subscribeToTrainingSessions((liveTrainings) => {
      if (Array.isArray(liveTrainings)) {
        try {
          const trainDeleted = getDeletedIds('training_sessions');
          const notifDeleted = getDeletedIds('notifications');
          const exSet = new Set([...trainDeleted, ...notifDeleted, 'train-1', 'notif-1']);
          setTrainingSessions(liveTrainings.filter((t) => {
            if (!t || !t.id) return false;
            const tid = String(t.id).trim();
            return !exSet.has(tid);
          }));
        } catch {
          setTrainingSessions(liveTrainings);
        }
      }
    });

    const unsubStats = apiService.subscribeToStats((liveStats) => {
      if (liveStats) setStats(liveStats);
    });

    const unsubStoreSettings = apiService.subscribeToStoreSettings((liveSettings) => {
      if (liveSettings) setStoreSettings(liveSettings);
    });

    // 📡 Listen to BroadcastChannel for instant cross-tab notification sync
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('salam_notifications_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'NEW_NOTIFICATION') {
            const notif = event.data.notification;
            if (notif && notif.id && !knownNotifsSetRef.current.has(notif.id)) {
              let isDismissed = false;
              try {
                const deleted: string[] = JSON.parse(localStorage.getItem('salam_deleted_notifications_ids') || '[]');
                const dismissed: string[] = JSON.parse(localStorage.getItem('salam_dismissed_notifications_ids') || '[]');
                isDismissed = deleted.includes(notif.id) || dismissed.includes(notif.id);
              } catch {}

              if (!isDismissed) {
                knownNotifsSetRef.current.add(notif.id);
                showSystemNotification(notif.title, {
                  body: notif.message,
                  icon: '/logo-salam.png',
                  badge: '/logo-salam.png',
                  tag: `notif-${notif.id}`,
                });
              }
            }
          }
        };
      }
    } catch {}

    // Setup Server-Sent Events (SSE) for real-time live match updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/matches/live-stream');
      eventSource.onmessage = (e) => {
        try {
          const liveData = JSON.parse(e.data);
          if (Array.isArray(liveData) && liveData.length > 0) {
            setMatches(liveData);
          }
        } catch (err) {
          // ignore parse errors
        }
      };
    } catch (err) {
      console.error('SSE error:', err);
    }

    // Polling fallback every 5 seconds to ensure sync during live broadcasts
    const syncInterval = setInterval(() => {
      apiService.getMatches().then((updatedMatches) => {
        if (updatedMatches && updatedMatches.length > 0) {
          setMatches(updatedMatches);
        }
      });
    }, 5000);

    return () => {
      unsubMatches();
      unsubNews();
      unsubPlayers();
      unsubClubInfo();
      unsubStore();
      unsubResponses();
      unsubNotifs();
      unsubTrainings();
      unsubStats();
      unsubStoreSettings();
      if (eventSource) eventSource.close();
      clearInterval(syncInterval);
    };
  }, []);

  const upcomingMatch = matches.find((m) => m.isLive) || matches.find((m) => m.isUpcoming);
  const activeTraining = trainingSessions.find((t) => {
    if (!t || !t.id) return false;
    const cleanId = String(t.id).trim();
    if (cleanId === 'train-1') return false;
    try {
      const dismissed: string[] = JSON.parse(localStorage.getItem('salam_dismissed_trainings') || '[]');
      const bannerDismissed: string[] = JSON.parse(localStorage.getItem('salam_dismissed_training_banner_ids') || '[]');
      const deleted: string[] = JSON.parse(localStorage.getItem('salam_deleted_training_sessions_ids') || '[]');
      const notifDeleted: string[] = JSON.parse(localStorage.getItem('salam_deleted_notifications_ids') || '[]');
      if (dismissed.includes(cleanId) || bannerDismissed.includes(cleanId) || deleted.includes(cleanId) || notifDeleted.includes(cleanId)) return false;
    } catch {}
    return t.isActive !== false;
  });

  const handleSelectNewsFromHome = (item: NewsItem) => {
    setSelectedNewsForDetail(item);
    setActiveTab('news');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#060303] text-white' : 'bg-gray-100 text-gray-900'} font-sans antialiased selection:bg-amber-500 selection:text-black flex items-center justify-center p-0 sm:py-3`}>
      {/* Mobile Smartphone Frame Container */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[92vh] sm:h-[92vh] flex flex-col relative bg-gradient-to-b from-[#180a0a] via-[#120606] to-[#080202] shadow-[0_0_60px_rgba(245,158,11,0.25)] border-0 sm:border-2 sm:border-amber-500/50 sm:rounded-[36px] overflow-hidden">
        
        {/* Initial Welcome Selection Portal */}
        {showWelcome ? (
          <WelcomeScreen
            clubInfo={clubInfo}
            onSelectFan={() => {
              setUserRole('fan');
              setShowWelcome(false);
              setActiveTab('home');
            }}
            onSelectPlayer={() => {
              setIsPlayerLoginOpen(true);
            }}
          />
        ) : (
          <>
            {/* App Header (Sticky Top) */}
            <Header
              stats={stats}
              clubInfo={clubInfo}
              userRole={userRole}
              loggedInPlayer={loggedInPlayer}
              onOpenPlayerLogin={() => setIsPlayerLoginOpen(true)}
              onLogoutPlayer={handleLogoutPlayer}
              onOpenDrawer={() => setIsDrawerOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              unreadNotificationsCount={notifications.filter((n) => !n.read).length}
            />

            {/* Offline Status Alert Banner */}
            {isOffline && (
              <div className="bg-amber-950/95 text-amber-200 text-xs font-bold px-3 py-2 flex items-center justify-center gap-2 border-b border-amber-600/50 shadow-inner dir-rtl z-40 text-center leading-relaxed">
                <span>⚡ أنت تتصفح في عدم وجود إنترنت، قم بالاتصال بالإنترنت لكي تحصل على البيانات الحقيقية في التطبيق.</span>
              </div>
            )}

            {/* Top Floating Active Toast Notification Banner with Dismiss X Button */}
            {activeToastNotif && (
              <div dir="rtl" className="bg-gradient-to-r from-[#2c0808] via-[#1a0808] to-[#2c0808] border-b-2 border-amber-500/80 px-4 py-3 shadow-2xl text-white flex items-start justify-between gap-3 z-30 animate-in slide-in-from-top duration-300">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-1 rounded-full bg-amber-500/20 border border-amber-400/40 shrink-0 mt-0.5">
                    <Logo size={26} />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <div dir="rtl" className="flex items-center gap-1.5 min-w-0 flex-1 text-right">
                        <span className="text-sm shrink-0">🇧🇹</span>
                        <span className="text-sm font-black text-amber-300 break-words text-wrap">{activeToastNotif.title.replace(/^🇧🇹\s*/, '')}</span>
                      </div>
                      <span dir="rtl" className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-bold shrink-0 inline-flex items-center gap-1 text-right">
                        {activeToastNotif.type === 'training' ? (
                          <>
                            <span className="shrink-0">🇧🇹</span>
                            <span>إشعار تمرين</span>
                          </>
                        ) : (
                          '📢 إشعار'
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 break-words text-wrap leading-relaxed whitespace-pre-line">{activeToastNotif.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeToastNotif.type === 'gallery' || activeToastNotif.galleryPostId || activeToastNotif.deepLink === 'gallery') {
                        setActiveTab('gallery');
                        if (activeToastNotif.galleryPostId) {
                          setTargetGalleryPostId(activeToastNotif.galleryPostId);
                        }
                      } else {
                        setIsNotificationsOpen(true);
                      }
                      setDismissedToastIds((prev) => [...prev, activeToastNotif.id]);
                    }}
                    className="text-xs bg-amber-500 text-black font-extrabold px-2.5 py-1 rounded-lg hover:bg-amber-400 transition-all active:scale-95 shadow"
                  >
                    عرض
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteNotification(activeToastNotif.id);
                    }}
                    className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-red-300 border border-red-500/40 transition-transform active:scale-90"
                    title="حذف وإلغاء الإشعار نهائياً"
                    aria-label="حذف وإلغاء الإشعار نهائياً"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Main Active Screen Body */}
            <main className="flex-1 pt-4 pb-20 overflow-y-auto no-scrollbar">
              {activeTab === 'home' && (
                <HomeView
                  news={news}
                  upcomingMatch={upcomingMatch}
                  activeTraining={activeTraining}
                  onSelectNews={handleSelectNewsFromHome}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onOpenTrainingModal={() => setActiveTrainingModal(activeTraining)}
                  onOpenMatchDetail={(match) => setSelectedLiveMatchModal(match)}
                  userRole={userRole}
                  loggedInPlayer={loggedInPlayer}
                  onOpenPlayerLogin={() => setIsPlayerLoginOpen(true)}
                  attendanceResponses={attendanceResponses}
                  respondedSessionIds={respondedSessionIds}
                  onAttendanceSubmitted={handleAttendanceSubmitted}
                />
              )}

              {activeTab === 'team' && <TeamView players={players} clubInfo={clubInfo} />}

              {activeTab === 'matches' && <MatchesView matches={matches} />}

              {activeTab === 'news' && (
                <NewsView
                  news={news}
                  selectedNewsFromHome={selectedNewsForDetail}
                />
              )}

              {activeTab === 'gallery' && (
                <TeamGalleryView
                  targetPostId={targetGalleryPostId}
                  onClearTargetPostId={() => setTargetGalleryPostId(null)}
                />
              )}

              {activeTab === 'store' && <StoreView products={storeProducts} settings={storeSettings} />}

              {activeTab === 'about' && <AboutView info={clubInfo} />}
            </main>

            {/* Bottom Navigation Bar */}
            <BottomNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />
          </>
        )}

        {/* Side Drawer Menu */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          clubInfo={clubInfo}
          userRole={userRole}
          loggedInPlayer={loggedInPlayer}
          onLogoutPlayer={handleLogoutPlayer}
          onShowWelcomePortal={() => setShowWelcome(true)}
        />

        {/* Quick Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          userRole={userRole}
          onToggleUserRole={() => {
            if (userRole === 'player') handleLogoutPlayer();
            else setIsPlayerLoginOpen(true);
          }}
        />

        {/* Interactive Notifications Center */}
        {isNotificationsOpen && (
          <NotificationsCenter
            notifications={notifications}
            trainingSessions={trainingSessions}
            onOpenTrainingModal={(session) => setActiveTrainingModal(session)}
            onNavigateToGallery={(postId) => {
              setActiveTab('gallery');
              if (postId) {
                setTargetGalleryPostId(postId);
              }
            }}
            onClose={() => setIsNotificationsOpen(false)}
            attendanceResponses={attendanceResponses}
            respondedSessionIds={respondedSessionIds}
            loggedInPlayer={loggedInPlayer}
            userRole={userRole}
            onDeleteNotification={handleDeleteNotification}
            clubInfo={clubInfo}
          />
        )}

        {/* Admin Dashboard Control Panel */}
        {isAdminOpen && (
          <AdminPanel
            news={news}
            matches={matches}
            players={players}
            trainingSessions={trainingSessions}
            storeProducts={storeProducts}
            storeSettings={storeSettings}
            onRefreshData={loadData}
            onClose={() => setIsAdminOpen(false)}
          />
        )}

        {/* Training Attendance Popup Modal */}
        {activeTrainingModal && (
          <TrainingNotificationModal
            session={activeTrainingModal}
            onClose={() => setActiveTrainingModal(null)}
            onSubmitted={(sessionId) => handleAttendanceSubmitted(sessionId)}
            userRole={userRole}
            loggedInPlayer={loggedInPlayer}
            onOpenPlayerLogin={() => setIsPlayerLoginOpen(true)}
            clubInfo={clubInfo}
          />
        )}

        {/* Live Match Ticker / Broadcast Modal */}
        {selectedLiveMatchModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto">
              <LiveMatchTicker
                match={matches.find((m) => m.id === selectedLiveMatchModal.id) || selectedLiveMatchModal}
                onClose={() => setSelectedLiveMatchModal(null)}
              />
            </div>
          </div>
        )}

        {/* Player PIN Authentication Modal (3-digit PIN Login) */}
        <PlayerLoginModal
          isOpen={isPlayerLoginOpen}
          onClose={() => setIsPlayerLoginOpen(false)}
          onLoginSuccess={handleLoginPlayerSuccess}
          clubInfo={clubInfo}
        />

        {/* Logout Confirmation Modal */}
        <LogoutConfirmModal
          isOpen={isLogoutConfirmOpen}
          onConfirm={handleConfirmLogout}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      </div>
    </div>
  );
}
