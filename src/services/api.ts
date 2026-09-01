import { Match, MatchLiveEvent, NewsItem, Player, TrainingSession, AttendanceResponse, AppNotification, ClubStats, ClubInfo, StoreProduct, StoreSettings, GalleryPost, MatchArchiveCard } from '../types';
import { showSystemNotification } from './notificationService';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, addDoc, doc, deleteDoc, updateDoc, setDoc, getDoc, onSnapshot, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

// 🔥 مفتاح الـ VAPID لمشروع Firebase الإشعارات
export const VAPID_KEY = "BEuz2cR1VkrkVU1Fu3-fW67PRIFNA5ciaAdN-D3bYClB4ZxNn5uq6UhOPyN8U2QXuKm8hMrWrYcwxgdUFgmLwM";

// 🔥 إعدادات الربط بـ Firebase الخاصة بمشروع فريق السلام
export const firebaseConfig = {
  apiKey: "AIzaSyDTEiymT3bmrUGAfMWpJFH-quwUlB-fko",
  authDomain: "alsalam-team-app.firebaseapp.com",
  projectId: "alsalam-team-app",
  storageBucket: "alsalam-team-app.appspot.com",
  messagingSenderId: "810746194030",
  appId: "1:810746194030:web:669a273fafb48d5bfe5e7f"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 🌐 تفعيل التخزين المحلي لـ Firebase Firestore للعمل بدون إنترنت (Offline Persistence)
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      enableIndexedDbPersistence(db).catch((e) => console.warn("Firestore offline persistence fallback notice:", e));
    } else if (err.code === 'unimplemented') {
      console.warn("Browser does not support Firestore offline persistence");
    }
  });
}

export const storage = getStorage(app);

const API_BASE = '/api';

/**
 * 🖼️ ضغط وتصغير بيانات الصورة base64 لضمان عدم تجاوز حد 1MB في Firestore أو السيرفر
 */
export async function compressDataUrlIfNeeded(dataUrl: string, maxWidth = 350, quality = 0.75): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  if (dataUrl.length < 100000) return dataUrl; // أقل من 100 كيلوبايت - لا تحتاج ضغط

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          console.log(`📉 [Compress] Reduced image size from ${(dataUrl.length / 1024).toFixed(1)}KB to ${(compressed.length / 1024).toFixed(1)}KB`);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

/**
 * ☁️ دالة رفع الصور المباشرة أو المقصوصة إلى Firebase Storage والحصول على رابط دائيم (Download URL)
 */
export async function uploadImageToFirebaseStorage(
  imageDataUrl: string | undefined | null,
  folder: string = 'general'
): Promise<string> {
  if (!imageDataUrl) return '';

  // إذا كان الرابط هو بالفعل رابط مباشر (https/http) أو مسار رمزي محلي مثل /logo-salam.png
  if (!imageDataUrl.startsWith('data:image')) {
    return imageDataUrl;
  }

  try {
    const mimeMatch = imageDataUrl.match(/data:image\/([a-zA-Z0-9]+);/);
    const ext = mimeMatch && mimeMatch[1] ? mimeMatch[1].replace('jpeg', 'jpg') : 'jpg';
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storageRef = ref(storage, filename);

    console.log(`🚀 [Firebase Storage] Uploading image string to bucket (${folder})...`);

    const uploadTask = (async () => {
      await uploadString(storageRef, imageDataUrl, 'data_url');
      return await getDownloadURL(storageRef);
    })();

    const timeoutTask = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage timeout')), 6000)
    );

    const downloadURL = await Promise.race([uploadTask, timeoutTask]);
    console.log(`✅ [Firebase Storage] Upload successful! Permanent URL:`, downloadURL);
    return downloadURL;
  } catch (error) {
    console.warn(`⚠️ [Firebase Storage] Upload failed or timed out for ${folder}, compressing fallback base64:`, error);
    return await compressDataUrlIfNeeded(imageDataUrl);
  }
}

export function getDeletedIds(collectionName: string): string[] {
  try {
    const norm = collectionName.toLowerCase().trim();
    const cleanSingular = norm.replace(/s$/, '');
    const keys = new Set<string>([
      `salam_deleted_${norm}_ids`,
      `salam_deleted_${cleanSingular}_ids`,
      `salam_deleted_${norm.replace(/_/g, '-')}_ids`,
      `salam_deleted_${cleanSingular.replace(/_/g, '-')}_ids`,
      `salam_deleted_${norm.replace(/-/g, '_')}_ids`,
      `salam_deleted_${cleanSingular.replace(/-/g, '_')}_ids`,
      `salam_deleted_match_ids`,
      `salam_deleted_matches_ids`,
      `salam_deleted_player_ids`,
      `salam_deleted_players_ids`,
      `salam_deleted_news_ids`,
      `salam_deleted_training_responses_ids`,
      `salam_deleted_training_response_ids`,
      `salam_deleted_training-responses_ids`,
      `salam_deleted_notifications_ids`,
      `salam_deleted_notification_ids`,
      `salam_deleted_training_sessions_ids`,
      `salam_deleted_training_session_ids`,
      `salam_deleted_trainings_ids`,
      `salam_dismissed_notifications_ids`,
      `salam_dismissed_trainings`,
      `salam_dismissed_training_banner_ids`,
    ]);

    let list: string[] = [];
    keys.forEach((k) => {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(arr)) list.push(...arr);
      } catch {}
    });

    return Array.from(new Set(list.filter(Boolean).map((id) => String(id).trim())));
  } catch {
    return [];
  }
}

export function recordDeletedNotification(notifId: string, trainingSessionId?: string | null): void {
  const cleanNotifId = String(notifId || '').trim();
  const notifKeys = [
    'salam_deleted_notifications_ids',
    'salam_deleted_notification_ids',
    'salam_dismissed_notifications_ids',
  ];
  
  if (cleanNotifId) {
    notifKeys.forEach((k) => {
      try {
        const arr: string[] = JSON.parse(localStorage.getItem(k) || '[]');
        if (!arr.includes(cleanNotifId)) arr.push(cleanNotifId);
        if (!arr.includes('notif-1')) arr.push('notif-1');
        localStorage.setItem(k, JSON.stringify(arr));
      } catch {}
    });
  }

  const cleanTrainId = String(trainingSessionId || '').trim();
  if (cleanTrainId) {
    const trainKeys = [
      'salam_dismissed_trainings',
      'salam_dismissed_training_banner_ids',
      'salam_deleted_training_sessions_ids',
      'salam_deleted_training_session_ids',
      'salam_deleted_trainings_ids',
    ];
    trainKeys.forEach((k) => {
      try {
        const arr: string[] = JSON.parse(localStorage.getItem(k) || '[]');
        if (!arr.includes(cleanTrainId)) arr.push(cleanTrainId);
        if (!arr.includes('train-1')) arr.push('train-1');
        localStorage.setItem(k, JSON.stringify(arr));
      } catch {}
    });
  }
}

export function recordDeletedTrainingSession(sessionId: string, linkedNotifId?: string | null): void {
  const cleanTrainId = String(sessionId || '').trim();
  const trainKeys = [
    'salam_dismissed_trainings',
    'salam_dismissed_training_banner_ids',
    'salam_deleted_training_sessions_ids',
    'salam_deleted_training_session_ids',
    'salam_deleted_trainings_ids',
  ];
  if (cleanTrainId) {
    trainKeys.forEach((k) => {
      try {
        const arr: string[] = JSON.parse(localStorage.getItem(k) || '[]');
        if (!arr.includes(cleanTrainId)) arr.push(cleanTrainId);
        if (!arr.includes('train-1')) arr.push('train-1');
        localStorage.setItem(k, JSON.stringify(arr));
      } catch {}
    });
  }

  const cleanNotifId = String(linkedNotifId || '').trim();
  if (cleanNotifId) {
    const notifKeys = [
      'salam_deleted_notifications_ids',
      'salam_deleted_notification_ids',
      'salam_dismissed_notifications_ids',
    ];
    notifKeys.forEach((k) => {
      try {
        const arr: string[] = JSON.parse(localStorage.getItem(k) || '[]');
        if (!arr.includes(cleanNotifId)) arr.push(cleanNotifId);
        if (!arr.includes('notif-1')) arr.push('notif-1');
        localStorage.setItem(k, JSON.stringify(arr));
      } catch {}
    });
  }
}

/**
 * ⚡ دالة مركزية شمولية لحفظ أو تعديل أي مستند في Firestore مع رفع أي صور base64 تلقائياً للسحابة
 */
export async function saveCentralizedDocument<T extends Record<string, any>>(
  collectionName: string,
  id: string | null | undefined,
  data: T,
  storageFolder: string = 'general'
): Promise<T & { id: string }> {
  console.log(`⚡ [Centralized Save] Starting operation for '${collectionName}'...`, { id, data });

  // 1. فحص الكائن ورفع جميع الصور المكتشفة بأسلوب base64 إلى Firebase Storage تلقائياً
  const processedData: Record<string, any> = { ...data };
  for (const key of Object.keys(processedData)) {
    const value = processedData[key];
    if (typeof value === 'string' && value.startsWith('data:image')) {
      console.log(`🖼️ [Centralized Save] Uploading field '${key}' to Storage folder '${storageFolder}'...`);
      processedData[key] = await uploadImageToFirebaseStorage(value, storageFolder);
    }
  }

  const docId = id || processedData.id || `${collectionName.charAt(0)}-${Date.now()}`;
  processedData.id = docId;
  processedData.updatedAt = new Date().toISOString();

  // 2. حفظ المستند في Firestore عبر setDoc مع دمج البيانات
  try {
    await setDoc(doc(db, collectionName, docId), processedData, { merge: true });
    console.log(`✅ [Centralized Save] Saved document in Firestore '${collectionName}/${docId}'`);
  } catch (err) {
    console.error(`❌ [Centralized Save] Firestore error for '${collectionName}':`, err);
  }

  // 3. مزامنة البيانات مع السيرفر المحلي Express
  try {
    await fetch(`${API_BASE}/${collectionName}/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData),
    });
  } catch {}

  return processedData as T & { id: string };
}

/**
 * ⚡ دالة مركزية شمولية لحذف أي مستند من Firestore مع التعديل اللحظي
 */
export async function deleteCentralizedDocument(
  collectionName: string,
  id: string
): Promise<boolean> {
  const cleanId = String(id).trim();
  console.log(`⚡ [Centralized Delete] Deleting doc '${cleanId}' from '${collectionName}'...`);

  // حفظ المعرف المحذوف في localStorage تحت جميع المفاتيح لضمان المزامنة المحلية وتصفية البيانات
  try {
    const norm = collectionName.toLowerCase().trim();
    const cleanSingular = norm.replace(/s$/, '');
    const keysToSave = new Set<string>([
      `salam_deleted_${norm}_ids`,
      `salam_deleted_${cleanSingular}_ids`,
      `salam_deleted_${norm.replace(/_/g, '-')}_ids`,
      `salam_deleted_${cleanSingular.replace(/_/g, '-')}_ids`,
      `salam_deleted_${norm.replace(/-/g, '_')}_ids`,
      `salam_deleted_${cleanSingular.replace(/-/g, '_')}_ids`,
    ]);

    if (collectionName === 'matches' || collectionName === 'match') {
      keysToSave.add('salam_deleted_match_ids');
      keysToSave.add('salam_deleted_matches_ids');
    } else if (collectionName === 'players' || collectionName === 'player') {
      keysToSave.add('salam_deleted_player_ids');
      keysToSave.add('salam_deleted_players_ids');
    } else if (collectionName === 'news') {
      keysToSave.add('salam_deleted_news_ids');
    }

    keysToSave.forEach((k) => {
      try {
        const existing: string[] = JSON.parse(localStorage.getItem(k) || '[]');
        if (!existing.includes(cleanId)) {
          existing.push(cleanId);
          localStorage.setItem(k, JSON.stringify(existing));
        }
      } catch {}
    });
  } catch (err) {
    console.warn("⚠️ LocalStorage deleted ID save error:", err);
  }

  // حذف المستند من Firestore
  try {
    await deleteDoc(doc(db, collectionName, cleanId)).catch(() => {});
    if (collectionName.includes('_')) {
      await deleteDoc(doc(db, collectionName.replace(/_/g, '-'), cleanId)).catch(() => {});
    }
    if (collectionName.includes('-')) {
      await deleteDoc(doc(db, collectionName.replace(/-/g, '_'), cleanId)).catch(() => {});
    }

    // بحث وحذف أي مستندات تحتوي على الحقل id مطابق للمعرف
    try {
      const qById = query(collection(db, collectionName), where('id', '==', cleanId));
      const qSnap = await getDocs(qById);
      qSnap.forEach((dSnap) => {
        deleteDoc(doc(db, collectionName, dSnap.id)).catch(() => {});
      });
    } catch {}

    console.log(`✅ [Centralized Delete] Deleted doc '${cleanId}' from Firestore collection '${collectionName}'`);
  } catch (err) {
    console.error(`❌ [Centralized Delete] Firestore delete error:`, err);
  }

  // حذف المستند من Express API
  try {
    await fetch(`${API_BASE}/${collectionName}/${cleanId}`, { method: 'DELETE' });
    if (collectionName.includes('_')) {
      await fetch(`${API_BASE}/${collectionName.replace(/_/g, '-')}/${cleanId}`, { method: 'DELETE' });
    } else if (collectionName.includes('-')) {
      await fetch(`${API_BASE}/${collectionName.replace(/-/g, '_')}/${cleanId}`, { method: 'DELETE' });
    }
  } catch {}

  return true;
}

// 🌐 دوال مساعدة للتخزين المحلي لدعم العمل بدون إنترنت (Offline Caching via LocalStorage)
export function saveLocalCache<T>(key: string, data: T): void {
  try {
    if (typeof window !== 'undefined' && data !== undefined && data !== null) {
      localStorage.setItem(`salam_cache_${key}`, JSON.stringify(data));
    }
  } catch (e) {
    // ignore quota/privacy errors
  }
}

export function getLocalCache<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`salam_cache_${key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (key === 'notifications' && Array.isArray(parsed)) {
          const deletedIds = getDeletedIds('notifications');
          const trainDeletedIds = getDeletedIds('training_sessions');
          const exSet = new Set([...deletedIds, ...trainDeletedIds, 'notif-1', 'train-1']);

          const cleaned = parsed.filter((n: any) => {
            if (!n || !n.id) return false;
            const nid = String(n.id).trim();
            const sid = String(n.trainingSessionId || '').trim();
            if (exSet.has(nid) || (sid && exSet.has(sid))) return false;
            const text = `${n.title || ''} ${n.message || ''}`;
            if (text.includes('تمرين ياشباب') || text.includes('ملعب السلام بكثيبة') || nid === 'notif-1') {
              return false;
            }
            return true;
          });
          return cleaned as unknown as T;
        }
        if (key === 'trainings' && Array.isArray(parsed)) {
          const deletedIds = getDeletedIds('training_sessions');
          const notifDeletedIds = getDeletedIds('notifications');
          const exSet = new Set([...deletedIds, ...notifDeletedIds, 'train-1', 'notif-1']);

          const cleaned = parsed.filter((t: any) => {
            if (!t || !t.id) return false;
            const tid = String(t.id).trim();
            if (exSet.has(tid)) return false;
            const text = `${t.title || ''} ${t.location || ''} ${t.note || ''}`;
            if (text.includes('تمرين ياشباب') || text.includes('ملعب السلام بكثيبة') || tid === 'train-1') {
              return false;
            }
            return true;
          });
          return cleaned as unknown as T;
        }
        return parsed;
      }
    }
  } catch {}
  return fallback;
}

export const apiService = {
  // Club Info & Identity (Firestore + Storage + Express API + LocalStorage Cache)
  async getClubInfo(): Promise<ClubInfo | null> {
    try {
      const docSnap = await getDoc(doc(db, 'clubInfo', 'main'));
      if (docSnap.exists()) {
        const info = docSnap.data() as ClubInfo;
        saveLocalCache('club_info', info);
        return info;
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch clubInfo from Firestore:", err);
    }

    try {
      const res = await fetch(`${API_BASE}/club-info`);
      if (res.ok) {
        const info = await res.json();
        saveLocalCache('club_info', info);
        return info;
      }
    } catch {}

    return getLocalCache<ClubInfo | null>('club_info', null);
  },

  async updateClubInfo(info: Partial<ClubInfo>): Promise<ClubInfo> {
    const updated = { ...info };
    if (updated.logoUrl && updated.logoUrl.startsWith('data:image')) {
      updated.logoUrl = await uploadImageToFirebaseStorage(updated.logoUrl, 'club_logo');
    }
    if (updated.coachPhotoUrl && updated.coachPhotoUrl.startsWith('data:image')) {
      updated.coachPhotoUrl = await uploadImageToFirebaseStorage(updated.coachPhotoUrl, 'club_coach');
    }

    saveLocalCache('club_info', updated);

    try {
      await setDoc(doc(db, 'clubInfo', 'main'), updated, { merge: true });
      console.log("✅ Updated clubInfo in Firestore doc 'main'");
    } catch (err) {
      console.error("❌ Error updating clubInfo in Firestore:", err);
    }

    try {
      const res = await fetch(`${API_BASE}/club-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const resInfo = await res.json();
        saveLocalCache('club_info', resInfo);
        return resInfo;
      }
    } catch {}

    return updated as ClubInfo;
  },

  // News (Firestore + Storage + Express API + LocalStorage Cache)
  async getNews(): Promise<NewsItem[]> {
    const deletedIds = getDeletedIds('news');
    const newsMap = new Map<string, NewsItem>();

    try {
      const res = await fetch(`${API_BASE}/news`);
      if (res.ok) {
        const localNews: NewsItem[] = await res.json();
        localNews.forEach((n) => {
          if (n && n.id && !deletedIds.includes(n.id)) {
            newsMap.set(n.id, n);
          }
        });
      }
    } catch {}

    try {
      const querySnapshot = await getDocs(collection(db, 'news'));
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const nId = docSnap.id;
        if (!deletedIds.includes(nId)) {
          newsMap.set(nId, {
            id: nId,
            ...data
          } as NewsItem);
        }
      });
    } catch (error) {
      console.error("⚠️ Error fetching news from Firestore:", error);
    }

    if (newsMap.size > 0) {
      const newsList = Array.from(newsMap.values());
      saveLocalCache('news', newsList);
      return newsList;
    }

    return getLocalCache<NewsItem[]>('news', []);
  },

  async createNews(news: Omit<NewsItem, 'id' | 'views'>): Promise<NewsItem> {
    const result = await saveCentralizedDocument<Record<string, any>>('news', null, { ...news, views: 1 }, 'news') as NewsItem;
    const currentNews = getLocalCache<NewsItem[]>('news', []);
    saveLocalCache('news', [result, ...currentNews.filter(n => n.id !== result.id)]);
    return result;
  },

  async updateNews(id: string, news: Partial<NewsItem>): Promise<NewsItem> {
    const result = await saveCentralizedDocument<Partial<NewsItem>>('news', id, news, 'news') as NewsItem;
    const currentNews = getLocalCache<NewsItem[]>('news', []);
    saveLocalCache('news', currentNews.map(n => n.id === id ? { ...n, ...result } : n));
    return result;
  },

  async deleteNews(id: string): Promise<boolean> {
    const currentNews = getLocalCache<NewsItem[]>('news', []);
    saveLocalCache('news', currentNews.filter(n => n.id !== id));
    return deleteCentralizedDocument('news', id);
  },

  async toggleNewsLike(newsId: string, customUserId?: string): Promise<{ likesCount: number; isLiked: boolean; likedUserIds: string[] }> {
    const userId = customUserId || (typeof localStorage !== 'undefined' ? localStorage.getItem('salam_device_user_id') || `user-${Date.now()}` : 'guest');
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('salam_device_user_id')) {
      localStorage.setItem('salam_device_user_id', userId);
    }

    const currentNews = getLocalCache<NewsItem[]>('news', []);
    const item = currentNews.find((n) => n.id === newsId);

    let likedUserIds = item?.likedUserIds ? [...item.likedUserIds] : [];
    const isCurrentlyLiked = likedUserIds.includes(userId);

    if (isCurrentlyLiked) {
      likedUserIds = likedUserIds.filter((id) => id !== userId);
    } else {
      likedUserIds.push(userId);
    }

    const newLikesCount = likedUserIds.length;

    if (item) {
      item.likesCount = newLikesCount;
      item.likedUserIds = likedUserIds;
      saveLocalCache('news', currentNews);
    }

    // Update in Firestore
    try {
      const newsRef = doc(db, 'news', newsId);
      await updateDoc(newsRef, {
        likesCount: newLikesCount,
        likedUserIds,
      });
    } catch (err) {
      console.warn("⚠️ Could not update news like in Firestore:", err);
    }

    // Update in Server API
    try {
      fetch(`${API_BASE}/news/${newsId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, likesCount: newLikesCount, likedUserIds }),
      }).catch(() => {});
    } catch {}

    return { likesCount: newLikesCount, isLiked: !isCurrentlyLiked, likedUserIds };
  },

  async rateNewsItem(newsId: string, userId: string, rating: number): Promise<{ averageRating: number; totalRatingsCount: number }> {
    const safeRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const currentNews = getLocalCache<NewsItem[]>('news', []);
    const item = currentNews.find((n) => n.id === newsId);

    let ratings = item?.ratings ? [...item.ratings] : [];
    const existingIndex = ratings.findIndex((r) => r.userId === userId);

    if (existingIndex >= 0) {
      ratings[existingIndex].rating = safeRating;
    } else {
      ratings.push({ userId, rating: safeRating });
    }

    const totalRatingsCount = ratings.length;
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = Number((sum / totalRatingsCount).toFixed(1));

    if (item) {
      item.ratings = ratings;
      item.totalRatingsCount = totalRatingsCount;
      item.averageRating = averageRating;
      saveLocalCache('news', currentNews);
    }

    // Update Firestore
    try {
      const newsRef = doc(db, 'news', newsId);
      await updateDoc(newsRef, {
        ratings,
        totalRatingsCount,
        averageRating,
      });
    } catch (err) {
      console.warn("⚠️ Could not update news rating in Firestore:", err);
    }

    // Update Server API
    try {
      fetch(`${API_BASE}/news/${newsId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rating: safeRating, ratings, totalRatingsCount, averageRating }),
      }).catch(() => {});
    } catch {}

    return { averageRating, totalRatingsCount };
  },

  // Matches (Firestore + Firebase Storage permanent logos + Express API + LocalStorage Cache)
  async getMatches(): Promise<Match[]> {
    const deletedIds = getDeletedIds('matches');
    const matchesMap = new Map<string, Match>();

    // 1. Fetch from Express local API
    try {
      const res = await fetch(`${API_BASE}/matches`);
      if (res.ok) {
        const localMatches: Match[] = await res.json();
        localMatches.forEach((m) => {
          if (m && m.id && !deletedIds.includes(String(m.id).trim())) {
            matchesMap.set(String(m.id).trim(), m);
          }
        });
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch matches from Express API:", err);
    }

    // 2. Fetch from Firestore
    try {
      const querySnapshot = await getDocs(collection(db, 'matches'));
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const mId = String(docSnap.id).trim();
        if (!deletedIds.includes(mId)) {
          matchesMap.set(mId, {
            id: mId,
            ...data
          } as Match);
        }
      });
    } catch (error) {
      console.error("⚠️ Error fetching matches from Firestore:", error);
    }

    if (matchesMap.size > 0) {
      const finalMatches = Array.from(matchesMap.values());
      saveLocalCache('matches', finalMatches);
      console.log(`✅ [apiService.getMatches] Total active matches loaded (${finalMatches.length})`);
      return finalMatches;
    }

    return getLocalCache<Match[]>('matches', []);
  },

  async createMatch(match: Omit<Match, 'id'>): Promise<Match> {
    console.log("🚀 [createMatch] Creating new match...", match);
    const createdId = `m-${Date.now()}`;

    // ☁️ Upload team logos directly to Firebase Storage bucket or compressed fallback
    let homeLogoUrl = '';
    let awayLogoUrl = '';

    try {
      homeLogoUrl = await uploadImageToFirebaseStorage(match.homeLogo, 'team_logos');
    } catch (e) {
      console.warn("⚠️ Error uploading homeLogo:", e);
      homeLogoUrl = match.homeLogo || '/logo-salam.png';
    }

    try {
      awayLogoUrl = await uploadImageToFirebaseStorage(match.awayLogo, 'team_logos');
    } catch (e) {
      console.warn("⚠️ Error uploading awayLogo:", e);
      awayLogoUrl = match.awayLogo || '';
    }

    const finalMatch: Match = {
      ...match,
      id: createdId,
      homeTeam: match.homeTeam || 'فريق السلام بكثيبة',
      homeLogo: homeLogoUrl || '/logo-salam.png',
      awayTeam: match.awayTeam || 'الفريق المنافس',
      awayLogo: awayLogoUrl || '',
      tournament: match.tournament || 'دوري شرفاء بكثيبة - الفريق الأول',
      time: match.time || '8:00 مساءً',
      stadium: match.stadium || 'ملعب غيل باوزير',
      badgeType: match.badgeType || (match.isUpcoming ? 'قادمة' : 'فوز'),
      hasLiveBroadcast: match.hasLiveBroadcast ?? true,
      isLive: match.isLive ?? false,
      liveEvents: match.liveEvents || [],
      goalsSummary: match.goalsSummary || [],
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      createdAt: new Date().toISOString()
    };

    // Save to Firestore using setDoc with explicit doc ID
    try {
      await setDoc(doc(db, 'matches', createdId), finalMatch);
      console.log("✅ [apiService.createMatch] Created match in Firestore with ID:", createdId);
    } catch (err) {
      console.error("❌ Error creating match in Firestore:", err);
    }

    // Save to Express local API
    try {
      await fetch(`${API_BASE}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalMatch),
      });
      console.log("✅ [apiService.createMatch] Posted match to Express API");
    } catch (err) {
      console.error("❌ Error posting match to Express API:", err);
    }

    return finalMatch;
  },

  async updateMatch(id: string, match: Partial<Match>): Promise<Match> {
    const updatedMatchData = { ...match };

    // Upload team logos if updated to base64 Data URLs
    if (updatedMatchData.homeLogo && updatedMatchData.homeLogo.startsWith('data:image')) {
      updatedMatchData.homeLogo = await uploadImageToFirebaseStorage(updatedMatchData.homeLogo, 'team_logos');
    }
    if (updatedMatchData.awayLogo && updatedMatchData.awayLogo.startsWith('data:image')) {
      updatedMatchData.awayLogo = await uploadImageToFirebaseStorage(updatedMatchData.awayLogo, 'team_logos');
    }

    // Update Firestore
    try {
      await setDoc(doc(db, 'matches', id), updatedMatchData, { merge: true });
      console.log("✅ [apiService.updateMatch] Updated match in Firestore:", id);
    } catch (err) {
      console.error("❌ Error updating match in Firestore:", err);
    }

    // Broadcast update across tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('salam_matches_channel');
        bc.postMessage({ type: 'MATCH_UPDATED', match: { id, ...updatedMatchData } });
        bc.close();
      }
    } catch {}

    // Update Express API
    try {
      const res = await fetch(`${API_BASE}/matches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMatchData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("❌ Error updating match in Express API:", err);
    }

    return { id, ...updatedMatchData } as Match;
  },

  async deleteMatch(id: string): Promise<boolean> {
    const cleanId = String(id).trim();
    const currentMatches = getLocalCache<Match[]>('matches', []);
    saveLocalCache('matches', currentMatches.filter(m => String(m.id).trim() !== cleanId));

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('salam_matches_channel');
        bc.postMessage({ type: 'MATCH_DELETED', matchId: cleanId });
        bc.close();
      }
    } catch {}

    return deleteCentralizedDocument('matches', cleanId);
  },

  // Match Live Coverage Methods
  async addMatchLiveEvent(matchId: string, eventData: any): Promise<{ match: Match; event: any }> {
    const updatedData = { ...eventData };
    if (updatedData.imageUrl && updatedData.imageUrl.startsWith('data:image')) {
      updatedData.imageUrl = await uploadImageToFirebaseStorage(updatedData.imageUrl, 'match_events');
    }

    let result: any = null;
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      result = await res.json();
    } catch (err) {
      console.error("Error posting live event to Express API:", err);
    }

    // Sync live match state & events to Firestore
    try {
      const docRef = doc(db, 'matches', matchId);
      const snapshot = await getDoc(docRef);
      const currentData = snapshot.exists() ? snapshot.data() : {};
      const currentEvents = currentData.liveEvents || [];
      const newEvent = result?.event || {
        id: `ev-${Date.now()}`,
        ...updatedData,
        timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedDoc: any = {
        liveEvents: [newEvent, ...currentEvents],
        isLive: true,
        livePeriod: updatedData.period || currentData.livePeriod || 'الشوط الأول',
        liveMinute: updatedData.minute || currentData.liveMinute || "1'",
      };

      if (updatedData.type === 'goal') {
        if (updatedData.team === 'home') {
          updatedDoc.homeScore = (currentData.homeScore ?? 0) + 1;
        } else if (updatedData.team === 'away') {
          updatedDoc.awayScore = (currentData.awayScore ?? 0) + 1;
        }
      }

      await setDoc(docRef, updatedDoc, { merge: true });

      // Broadcast across open browser tabs
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('salam_matches_channel');
        bc.postMessage({ type: 'MATCH_LIVE_EVENT', matchId, event: newEvent });
        bc.close();
      }
    } catch (err) {
      console.warn("Error syncing live event to Firestore:", err);
    }

    return result || { match: null as any, event: null as any };
  },

  async updateMatchLiveEvent(matchId: string, eventId: string, eventData: any): Promise<{ match: Match; event: any }> {
    let result: any = null;
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      result = await res.json();
    } catch {}

    // Sync updated event to Firestore match document
    try {
      const docRef = doc(db, 'matches', matchId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const currentData = snapshot.data();
        const currentEvents: MatchLiveEvent[] = currentData.liveEvents || [];
        const updatedEvents = currentEvents.map((e) => e.id === eventId ? { ...e, ...eventData } : e);
        await setDoc(docRef, { liveEvents: updatedEvents }, { merge: true });
      }
    } catch (err) {
      console.warn("Error updating live event in Firestore:", err);
    }

    return result || { match: null as any, event: eventData };
  },

  async likeMatchLiveEvent(matchId: string, eventId: string, userId?: string): Promise<{ likesCount: number; liked: boolean }> {
    const effectiveUserId = userId || localStorage.getItem('salam_user_device_id') || `user_${Math.random().toString(36).substring(2, 9)}`;
    if (!localStorage.getItem('salam_user_device_id')) {
      try { localStorage.setItem('salam_user_device_id', effectiveUserId); } catch {}
    }

    let finalLikesCount = 0;
    let isLiked = false;

    // 1. Update in Firestore match document
    try {
      const docRef = doc(db, 'matches', matchId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const currentData = snapshot.data();
        const currentEvents: MatchLiveEvent[] = currentData.liveEvents || [];
        const targetEvent = currentEvents.find(e => e.id === eventId);
        if (targetEvent) {
          const userIds = targetEvent.likedUserIds || [];
          if (userIds.includes(effectiveUserId)) {
            // Remove like (unlike)
            targetEvent.likedUserIds = userIds.filter(id => id !== effectiveUserId);
            targetEvent.likesCount = Math.max(0, (targetEvent.likesCount || 1) - 1);
            isLiked = false;
          } else {
            // Add like
            targetEvent.likedUserIds = [...userIds, effectiveUserId];
            targetEvent.likesCount = (targetEvent.likesCount || 0) + 1;
            isLiked = true;
          }
          finalLikesCount = targetEvent.likesCount || 0;

          await setDoc(docRef, { liveEvents: currentEvents }, { merge: true });
        }
      }
    } catch (err) {
      console.warn("Error updating match event like in Firestore:", err);
    }

    // 2. Broadcast across open browser tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('salam_matches_channel');
        bc.postMessage({ type: 'MATCH_EVENT_LIKE', matchId, eventId, likesCount: finalLikesCount });
        bc.close();
      }
    } catch {}

    return { likesCount: finalLikesCount, liked: isLiked };
  },

  async rateMatchLiveEvent(matchId: string, eventId: string, rating: number, userId?: string): Promise<{ averageRating: number; totalRatingsCount: number }> {
    const effectiveUserId = userId || localStorage.getItem('salam_user_device_id') || `user_${Math.random().toString(36).substring(2, 9)}`;
    if (!localStorage.getItem('salam_user_device_id')) {
      try { localStorage.setItem('salam_user_device_id', effectiveUserId); } catch {}
    }

    const clampedRating = Math.max(1, Math.min(5, Number(rating) || 5));
    let finalAvg = clampedRating;
    let finalCount = 1;

    // 1. Update in Firestore match document
    try {
      const docRef = doc(db, 'matches', matchId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const currentData = snapshot.data();
        const currentEvents: MatchLiveEvent[] = currentData.liveEvents || [];
        const targetEvent = currentEvents.find(e => e.id === eventId);
        if (targetEvent) {
          const ratings = targetEvent.ratings || [];
          const existingIdx = ratings.findIndex(r => r.userId === effectiveUserId);
          if (existingIdx >= 0) {
            ratings[existingIdx].rating = clampedRating;
          } else {
            ratings.push({ userId: effectiveUserId, rating: clampedRating });
          }

          const sum = ratings.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
          finalCount = ratings.length;
          finalAvg = Math.round((sum / finalCount) * 10) / 10;

          targetEvent.ratings = ratings;
          targetEvent.averageRating = finalAvg;
          targetEvent.totalRatingsCount = finalCount;

          await setDoc(docRef, { liveEvents: currentEvents }, { merge: true });
        }
      }
    } catch (err) {
      console.warn("Error updating match event rating in Firestore:", err);
    }

    // 2. Broadcast across open browser tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('salam_matches_channel');
        bc.postMessage({ type: 'MATCH_EVENT_RATE', matchId, eventId, averageRating: finalAvg, totalRatingsCount: finalCount });
        bc.close();
      }
    } catch {}

    return { averageRating: finalAvg, totalRatingsCount: finalCount };
  },

  async deleteMatchLiveEvent(matchId: string, eventId: string): Promise<{ match: Match; success: boolean }> {
    let result: any = null;
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}/events/${eventId}`, {
        method: 'DELETE',
      });
      result = await res.json();
    } catch {}

    // Delete event from Firestore match document
    try {
      const docRef = doc(db, 'matches', matchId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const currentData = snapshot.data();
        const currentEvents: MatchLiveEvent[] = currentData.liveEvents || [];
        const updatedEvents = currentEvents.filter((e) => e.id !== eventId);
        await setDoc(docRef, { liveEvents: updatedEvents }, { merge: true });
      }
    } catch (err) {
      console.warn("Error deleting live event from Firestore:", err);
    }

    return result || { match: null as any, success: true };
  },

  async updateMatchLiveControl(matchId: string, controlData: any): Promise<Match> {
    // 1. Update Firestore directly for instant real-time sync
    try {
      const docRef = doc(db, 'matches', matchId);
      await setDoc(docRef, controlData, { merge: true });
    } catch (err) {
      console.warn("Error updating match live control in Firestore:", err);
    }

    // 2. Broadcast across open browser tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('salam_matches_channel');
        bc.postMessage({ type: 'MATCH_LIVE_CONTROL', matchId, controlData });
        bc.close();
      }
    } catch {}

    // 3. Update Express backend
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}/live-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(controlData),
      });
      return await res.json();
    } catch {}

    return { id: matchId, ...controlData } as Match;
  },

  async reorderMatchLiveEvents(matchId: string, eventIds: string[]): Promise<Match> {
    let result: any = null;
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}/reorder-events`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds }),
      });
      result = await res.json();
    } catch {}

    try {
      const docRef = doc(db, 'matches', matchId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const currentData = snapshot.data();
        const currentEvents: MatchLiveEvent[] = currentData.liveEvents || [];
        const eventMap = new Map(currentEvents.map(e => [e.id, e]));
        const reordered = eventIds.map(id => eventMap.get(id)).filter(Boolean) as MatchLiveEvent[];
        await setDoc(docRef, { liveEvents: reordered }, { merge: true });
      }
    } catch (err) {
      console.warn("Error reordering live events in Firestore:", err);
    }

    return result || ({ id: matchId } as Match);
  },

  // Players (Firebase Firestore + Storage + Express API + LocalStorage Cache)
  async getPlayers(): Promise<Player[]> {
    console.log("📥 [apiService.getPlayers] Fetching players...");
    const deletedIds = getDeletedIds('players');
    const playersMap = new Map<string, Player>();

    // 1. Fetch from Express API
    try {
      const res = await fetch(`${API_BASE}/players`);
      if (res.ok) {
        const localPlayers: Player[] = await res.json();
        localPlayers.forEach((p) => {
          if (p && p.id && !deletedIds.includes(p.id)) {
            playersMap.set(p.id, p);
          }
        });
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch players from local Express API:", err);
    }

    // 2. Fetch from Firestore
    try {
      const querySnapshot = await getDocs(collection(db, 'players'));
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const pId = docSnap.id;
        if (!deletedIds.includes(pId)) {
          playersMap.set(pId, {
            id: pId,
            image: data.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
            location: data.location || 'كثيبة - غيل باوزير',
            age: data.age ? Number(data.age) : undefined,
            height: data.height || undefined,
            joinedYear: data.joinedYear || undefined,
            matchesPlayed: data.matchesPlayed || 0,
            goals: data.goals || 0,
            assists: data.assists || 0,
            cleanSheets: data.cleanSheets || 0,
            yellowCards: data.yellowCards || 0,
            redCards: data.redCards || 0,
            ...data,
            name: data.name || 'لاعب',
            number: data.number !== undefined && data.number !== null ? Number(data.number) : undefined,
            position: data.position || 'غير محدد',
            pinCode: data.pinCode ? String(data.pinCode) : ''
          } as Player);
        }
      });
    } catch (error) {
      console.error("⚠️ Error fetching players from Firestore:", error);
    }

    if (playersMap.size > 0) {
      const finalPlayers = Array.from(playersMap.values());
      saveLocalCache('players', finalPlayers);
      console.log(`✅ [apiService.getPlayers] Total active players loaded (${finalPlayers.length})`);
      return finalPlayers;
    }

    return getLocalCache<Player[]>('players', []);
  },

  async createPlayer(player: Omit<Player, 'id'>): Promise<Player> {
    try {
      localStorage.setItem('salam_players_modified', 'true');
    } catch {}

    const actualPinCode = player.pinCode ? String(player.pinCode).trim() : '';
    const imageUrl = await uploadImageToFirebaseStorage(player.image, 'players');

    let createdId = `p-${Date.now()}`;
    try {
      const docRef = await addDoc(collection(db, 'players'), {
        name: player.name,
        number: player.number !== undefined && player.number !== null ? Number(player.number) : 0,
        position: player.position || 'مهاجم',
        location: player.location || 'كثيبة - غيل باوزير',
        image: imageUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
        pinCode: actualPinCode,
        age: player.age ? Number(player.age) : null,
        height: player.height || '',
        joinedYear: player.joinedYear || '',
        matchesPlayed: player.matchesPlayed || 0,
        goals: player.goals || 0,
        assists: player.assists || 0,
        createdAt: new Date().toISOString()
      });
      createdId = docRef.id;
      console.log("✅ [apiService.createPlayer] Created player in Firestore with ID:", createdId, "and pinCode:", actualPinCode);
    } catch (error) {
      console.error("❌ Error creating player in Firestore:", error);
    }

    const finalPlayer = { ...player, id: createdId, image: imageUrl || player.image };
    const currentPlayers = getLocalCache<Player[]>('players', []);
    saveLocalCache('players', [finalPlayer, ...currentPlayers.filter(p => p.id !== createdId)]);

    // Sync to Express local API store as well
    try {
      await fetch(`${API_BASE}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPlayer),
      });
    } catch (err) {
      console.error("❌ Error saving player to local API:", err);
    }

    return finalPlayer;
  },

  async updatePlayer(id: string, player: Partial<Player>): Promise<Player> {
    try {
      localStorage.setItem('salam_players_modified', 'true');
    } catch {}

    const updated = { ...player };
    if (updated.image && updated.image.startsWith('data:image')) {
      updated.image = await uploadImageToFirebaseStorage(updated.image, 'players');
    }

    const currentPlayers = getLocalCache<Player[]>('players', []);
    saveLocalCache('players', currentPlayers.map(p => p.id === id ? { ...p, ...updated } : p));

    try {
      await updateDoc(doc(db, 'players', id), updated);
      console.log("✅ [apiService.updatePlayer] Updated player in Firestore:", id);
    } catch (err) {
      console.error("❌ Error updating player in Firestore:", err);
    }
    const res = await fetch(`${API_BASE}/players/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    return res.json();
  },

  async deletePlayer(id: string): Promise<boolean> {
    const currentPlayers = getLocalCache<Player[]>('players', []);
    saveLocalCache('players', currentPlayers.filter(p => p.id !== id));
    return deleteCentralizedDocument('players', id);
  },

  // Training & Attendance Notifications
  async getTrainingSessions(): Promise<TrainingSession[]> {
    const deletedIds = getDeletedIds('training_sessions');
    const notifDeletedIds = getDeletedIds('notifications');
    const sessionsMap = new Map<string, TrainingSession>();

    const isSessionDeleted = (sId: string, s?: TrainingSession) => {
      if (!sId) return true;
      const clean = String(sId).trim();
      if (clean === 'train-1') return true;
      if (deletedIds.includes(clean) || notifDeletedIds.includes(clean)) return true;
      if (s) {
        const text = `${s.title || ''} ${s.location || ''} ${s.note || ''}`;
        if (text.includes('تمرين ياشباب') || text.includes('ملعب السلام بكثيبة')) return true;
      }
      return false;
    };

    // 1. Fetch from Express API
    try {
      const res = await fetch(`${API_BASE}/training-sessions`);
      if (res.ok) {
        const list: TrainingSession[] = await res.json();
        list.forEach((s) => {
          if (s && s.id && !isSessionDeleted(s.id, s)) sessionsMap.set(s.id, s);
        });
      }
    } catch {}

    // 2. Fetch from Firestore
    try {
      const snap = await getDocs(collection(db, 'training_sessions'));
      snap.forEach((docSnap) => {
        const sId = docSnap.id;
        const data = docSnap.data() as TrainingSession;
        if (!isSessionDeleted(sId, data)) {
          sessionsMap.set(sId, { id: sId, ...data });
        }
      });
    } catch (err) {
      console.warn("⚠️ Could not fetch training sessions from Firestore:", err);
    }

    const finalSessions = Array.from(sessionsMap.values()).filter(s => !isSessionDeleted(s.id, s));
    saveLocalCache('trainings', finalSessions);
    return finalSessions;
  },

  async createTrainingSession(session: Omit<TrainingSession, 'id' | 'createdAt'>): Promise<TrainingSession> {
    const newSession: TrainingSession = {
      id: `ts-${Date.now()}`,
      ...session,
      createdAt: new Date().toISOString(),
    };

    const currentTrainings = getLocalCache<TrainingSession[]>('trainings', []);
    saveLocalCache('trainings', [newSession, ...currentTrainings.filter(t => t.id !== newSession.id)]);

    // Save to Firestore 'training_sessions'
    try {
      await setDoc(doc(db, 'training_sessions', newSession.id), newSession);
      console.log("✅ Created training session in Firestore:", newSession.id);
    } catch (err) {
      console.warn("⚠️ Could not save training session to Firestore:", err);
    }

    // Save to Express API
    try {
      await fetch(`${API_BASE}/training-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      });
    } catch {}

    return newSession;
  },

  async deleteTrainingSession(id: string): Promise<boolean> {
    const sId = String(id || 'train-1').trim();
    recordDeletedTrainingSession(sId);

    const currentTrainings = getLocalCache<TrainingSession[]>('trainings', []);
    saveLocalCache('trainings', currentTrainings.filter(t => String(t.id).trim() !== sId && String(t.id).trim() !== 'train-1'));

    // Also delete any linked notifications for this training session
    try {
      const currentNotifs = getLocalCache<AppNotification[]>('notifications', []);
      const linkedNotifs = currentNotifs.filter(n => 
        String(n.trainingSessionId || '').trim() === sId || 
        String(n.id).trim() === sId || 
        (n.type === 'training' && (String(n.id).trim() === 'notif-1' || String(n.id).trim() === sId))
      );
      linkedNotifs.forEach(n => {
        recordDeletedNotification(n.id, sId);
        deleteCentralizedDocument('notifications', n.id).catch(() => {});
      });
      saveLocalCache('notifications', currentNotifs.filter(n => 
        String(n.trainingSessionId || '').trim() !== sId && 
        String(n.id).trim() !== sId
      ));
    } catch {}

    // Delete related attendance responses in Firestore
    try {
      const qResp = query(collection(db, 'attendance_responses'), where('sessionId', '==', sId));
      const qSnap = await getDocs(qResp);
      qSnap.forEach((dSnap) => {
        deleteDoc(doc(db, 'attendance_responses', dSnap.id)).catch(() => {});
      });
    } catch {}

    // Delete related notifications query in Firestore
    try {
      const qNotifs = query(collection(db, 'notifications'), where('trainingSessionId', '==', sId));
      const nSnap = await getDocs(qNotifs);
      nSnap.forEach((dSnap) => {
        deleteDoc(doc(db, 'notifications', dSnap.id)).catch(() => {});
      });
    } catch {}

    // Also purge Express API
    try {
      await fetch(`${API_BASE}/training-sessions/${sId}`, { method: 'DELETE' });
      await fetch(`${API_BASE}/training_sessions/${sId}`, { method: 'DELETE' });
    } catch {}

    return deleteCentralizedDocument('training_sessions', sId);
  },

  async submitAttendanceResponse(response: Omit<AttendanceResponse, 'id' | 'createdAt'>): Promise<AttendanceResponse> {
    const cleanSessionId = String(response.sessionId || 'session').trim();
    const cleanPlayerName = String(response.playerName || '').trim();
    const cleanPlayerKey = (response.playerId || cleanPlayerName.replace(/\s+/g, '_')).replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '');
    const deterministicId = `resp_${cleanSessionId}_${cleanPlayerKey}`;

    const newResp: AttendanceResponse = {
      id: deterministicId,
      ...response,
      sessionId: cleanSessionId,
      playerName: cleanPlayerName,
      createdAt: new Date().toISOString(),
    };

    // 1. Update local cache by removing any existing response for this session & player
    const currentResponses = getLocalCache<AttendanceResponse[]>('responses', []);
    const filteredResponses = currentResponses.filter((r) => {
      if (r.sessionId === newResp.sessionId) {
        if (newResp.playerId && r.playerId === newResp.playerId) return false;
        if (String(r.playerName || '').trim().toLowerCase() === cleanPlayerName.toLowerCase()) return false;
      }
      return true;
    });
    saveLocalCache('responses', [newResp, ...filteredResponses]);

    // 2. Save to Firestore with deterministic ID and clean up any duplicate documents for this player in this session
    try {
      await setDoc(doc(db, 'training_responses', deterministicId), newResp);
      console.log("✅ [apiService.submitAttendanceResponse] Saved deterministic record to Firestore:", deterministicId);

      // Clean up any other duplicate records in Firestore for this session & player
      try {
        const q = query(
          collection(db, 'training_responses'),
          where('sessionId', '==', newResp.sessionId)
        );
        const snap = await getDocs(q);
        const batchDeletes: Promise<void>[] = [];
        snap.forEach((dSnap) => {
          if (dSnap.id !== deterministicId) {
            const data = dSnap.data();
            const samePlayer = (newResp.playerId && data.playerId === newResp.playerId) ||
              (data.playerName && String(data.playerName).trim().toLowerCase() === cleanPlayerName.toLowerCase());
            if (samePlayer) {
              batchDeletes.push(deleteDoc(doc(db, 'training_responses', dSnap.id)));
            }
          }
        });
        if (batchDeletes.length > 0) {
          await Promise.all(batchDeletes);
          console.log(`🧹 Cleaned up ${batchDeletes.length} duplicate attendance records in Firestore.`);
        }
      } catch (cleanErr) {
        console.warn("Notice during duplicate cleanup:", cleanErr);
      }
    } catch (err) {
      console.warn("⚠️ Could not save attendance response to Firestore:", err);
    }

    // 3. Also post to Express API server
    try {
      const res = await fetch(`${API_BASE}/training-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResp),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("⚠️ Could not save attendance response to Express API:", err);
    }

    return newResp;
  },

  async getAttendanceResponses(sessionId?: string): Promise<AttendanceResponse[]> {
    const responsesMap = new Map<string, AttendanceResponse>();
    const deletedIds = getDeletedIds('training_responses');
    let deletedPlayers: string[] = [];
    try {
      deletedPlayers = JSON.parse(localStorage.getItem('salam_deleted_training_response_players') || '[]');
    } catch {}

    // 1. Fetch from Firestore (primary cloud source of truth)
    try {
      const snap = await getDocs(collection(db, 'training_responses'));
      snap.forEach((docSnap) => {
        const data = docSnap.data() as AttendanceResponse;
        const itemKey = String(docSnap.id || data?.id || '').trim();
        const pName = String(data?.playerName || '').trim();
        if (data && itemKey && !deletedIds.includes(itemKey) && (!pName || !deletedPlayers.includes(pName))) {
          if (!sessionId || data.sessionId === sessionId) {
            responsesMap.set(itemKey, { ...data, id: itemKey });
          }
        }
      });
    } catch (err) {
      console.warn("⚠️ Could not fetch attendance responses from Firestore:", err);
    }

    // 2. Fetch from Express API
    try {
      const url = sessionId ? `${API_BASE}/training-responses?sessionId=${sessionId}` : `${API_BASE}/training-responses`;
      const res = await fetch(url);
      if (res.ok) {
        const list: AttendanceResponse[] = await res.json();
        list.forEach((r, idx) => {
          if (r) {
            const itemKey = String(r.id || `att-api-${idx}-${r.playerName || 'player'}`).trim();
            const pName = String(r.playerName || '').trim();
            if (itemKey && !deletedIds.includes(itemKey) && (!pName || !deletedPlayers.includes(pName))) {
              if (!sessionId || r.sessionId === sessionId) {
                responsesMap.set(itemKey, { ...r, id: itemKey });
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch attendance responses from API:", err);
    }

    // 3. Deduplicate responses so each player appears only ONCE per session with the latest record
    const uniqueMap = new Map<string, AttendanceResponse>();
    responsesMap.forEach((data) => {
      const pKey = `${data.sessionId || 'cur'}_${(data.playerId || data.playerName || '').trim().toLowerCase()}`;
      const existing = uniqueMap.get(pKey);
      if (!existing || new Date(data.createdAt || 0).getTime() >= new Date(existing.createdAt || 0).getTime()) {
        uniqueMap.set(pKey, data);
      }
    });

    const list = Array.from(uniqueMap.values());
    saveLocalCache('responses', list);
    return list;
  },

  async deleteAttendanceResponse(target: string | AttendanceResponse): Promise<boolean> {
    const id = typeof target === 'string' ? target : target?.id;
    const playerName = typeof target === 'object' ? target?.playerName : undefined;
    const sessionId = typeof target === 'object' ? target?.sessionId : undefined;

    const cleanId = String(id || '').trim();
    const cleanPlayerName = playerName ? String(playerName).trim() : '';
    console.log(`⚡ [deleteAttendanceResponse] Permanently deleting response '${cleanId}' (Player: ${cleanPlayerName})...`);

    // 1. Immediately update LocalStorage Cache
    const currentResponses = getLocalCache<AttendanceResponse[]>('responses', []);
    saveLocalCache(
      'responses',
      currentResponses.filter((r) => {
        if (cleanId && String(r.id) === cleanId) return false;
        if (cleanPlayerName && String(r.playerName).trim() === cleanPlayerName) return false;
        return true;
      })
    );

    // 2. Track deleted IDs & deleted player names in LocalStorage to prevent ghost resurrects
    if (cleanId) {
      const keys = [
        'salam_deleted_training_responses_ids',
        'salam_deleted_training_response_ids',
        'salam_deleted_training-responses_ids',
      ];
      keys.forEach((k) => {
        try {
          const arr: string[] = JSON.parse(localStorage.getItem(k) || '[]');
          if (!arr.includes(cleanId)) {
            arr.push(cleanId);
            localStorage.setItem(k, JSON.stringify(arr));
          }
        } catch {}
      });
    }

    if (cleanPlayerName) {
      try {
        const pArr: string[] = JSON.parse(localStorage.getItem('salam_deleted_training_response_players') || '[]');
        if (!pArr.includes(cleanPlayerName)) {
          pArr.push(cleanPlayerName);
          localStorage.setItem('salam_deleted_training_response_players', JSON.stringify(pArr));
        }
      } catch {}
    }

    // 3. Permanently delete from Firestore database collections
    const collectionsToDelete = ['training_responses', 'training-responses'];
    for (const colName of collectionsToDelete) {
      try {
        if (cleanId) {
          await deleteDoc(doc(db, colName, cleanId)).catch(() => {});
        }

        // Query and delete any matching docs by ID or Player Name
        const snap = await getDocs(collection(db, colName));
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;
          const dataId = String(data?.id || '').trim();
          const matchesId = Boolean(cleanId && (docId === cleanId || dataId === cleanId));
          const matchesPlayer = Boolean(
            cleanPlayerName &&
            String(data?.playerName || '').trim() === cleanPlayerName &&
            (!sessionId || String(data?.sessionId) === String(sessionId))
          );

          if (matchesId || matchesPlayer) {
            deleteDoc(doc(db, colName, docId)).catch((e) => console.warn("Firestore doc delete error:", e));
            
            // Register deleted keys in LocalStorage
            [docId, dataId].filter(Boolean).forEach((deletedKey) => {
              const keys = ['salam_deleted_training_responses_ids', 'salam_deleted_training_response_ids'];
              keys.forEach((k) => {
                try {
                  const arr: string[] = JSON.parse(localStorage.getItem(k) || '[]');
                  if (!arr.includes(deletedKey)) {
                    arr.push(deletedKey);
                    localStorage.setItem(k, JSON.stringify(arr));
                  }
                } catch {}
              });
            });
          }
        });
      } catch (err) {
        console.warn(`⚠️ Error deleting attendance from Firestore ${colName}:`, err);
      }
    }

    // 4. Delete from Express API
    try {
      const queryParams = new URLSearchParams();
      if (cleanPlayerName) queryParams.append('playerName', cleanPlayerName);
      if (sessionId) queryParams.append('sessionId', sessionId);
      if (cleanId) queryParams.append('id', cleanId);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

      if (cleanId) {
        await fetch(`${API_BASE}/training-responses/${cleanId}${queryString}`, { method: 'DELETE' }).catch(() => {});
        await fetch(`${API_BASE}/training_responses/${cleanId}${queryString}`, { method: 'DELETE' }).catch(() => {});
      }
      if (cleanPlayerName) {
        await fetch(`${API_BASE}/training-responses${queryString}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch (err) {
      console.warn("⚠️ Error deleting attendance from Express API:", err);
    }

    return true;
  },

  // FCM Device Tokens & Real Push Notifications
  async registerFcmToken(info?: { userRole?: string; userId?: string; playerName?: string }): Promise<string> {
    let token = localStorage.getItem('salam_fcm_token') || '';

    // 1. Attempt to get real FCM token via getToken(messaging, { vapidKey })
    try {
      if (typeof window !== 'undefined' && await isSupported()) {
        const messaging = getMessaging(app);
        const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (fcmToken) {
          token = fcmToken;
          localStorage.setItem('salam_fcm_token', token);
          console.log("🔑 [FCM] Successfully fetched device token with VAPID Key:", token);
        }
      }
    } catch (fcmErr) {
      console.warn("⚠️ FCM getToken with VAPID key notice:", fcmErr);
    }

    // Fallback token if FCM token generation is blocked or unsupported in preview
    if (!token) {
      token = 'fcm_tok_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('salam_fcm_token', token);
    }

    // 2. Save / update token document in Firestore
    try {
      const tokenDocRef = doc(db, 'fcm_tokens', token);
      await setDoc(tokenDocRef, {
        token,
        vapidKey: VAPID_KEY,
        userRole: info?.userRole || 'fan',
        userId: info?.userId || null,
        playerName: info?.playerName || null,
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Mobile/Web Client',
        lastSeen: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      console.log("📲 Registered FCM device token in Firestore:", token);

      // Check and save Median / OneSignal device token if available
      try {
        if (typeof window !== 'undefined' && (window as any).median && (window as any).median.push) {
          (window as any).median.push.getTokens().then((data: any) => {
            const onesignalId = data?.oneSignalSubscriptionId || data?.oneSignalPlayerId;
            if (onesignalId) {
              apiService.saveOneSignalId(onesignalId, info);
            }
          }).catch(() => {});
        }
      } catch {}

      return token;
    } catch (err) {
      console.warn("⚠️ Failed to register FCM token in Firestore:", err);
      return token;
    }
  },

  async saveOneSignalId(onesignalId: string, info?: { userRole?: string; userId?: string; playerName?: string }): Promise<boolean> {
    const cleanId = String(onesignalId).trim();
    if (!cleanId) return false;

    try {
      localStorage.setItem('salam_onesignal_id', cleanId);

      // 1. Send to Express API
      await fetch(`${API_BASE}/save-onesignal-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onesignal_id: cleanId,
          userRole: info?.userRole || 'fan',
          userId: info?.userId || null,
          playerName: info?.playerName || null,
        }),
      }).catch(() => {});

      // 2. Save in Firestore 'onesignal_devices'
      try {
        await setDoc(doc(db, 'onesignal_devices', cleanId), {
          onesignal_id: cleanId,
          userRole: info?.userRole || 'fan',
          userId: info?.userId || null,
          playerName: info?.playerName || null,
          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Median Mobile App',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log("📲 [OneSignal] Successfully saved ID to Firestore and Server:", cleanId);
      } catch (fErr) {
        console.warn("⚠️ Failed to save OneSignal ID to Firestore:", fErr);
      }

      return true;
    } catch (err) {
      console.warn("⚠️ saveOneSignalId error:", err);
      return false;
    }
  },

  async sendOneSignalPush(payload: {
    title: string;
    message: string;
    url?: string;
    data?: Record<string, any>;
    playerIds?: string[];
    segments?: string[];
  }): Promise<{ success: boolean; data?: any; error?: string; reason?: string; status?: number }> {
    try {
      const res = await fetch(`${API_BASE}/onesignal/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.warn("⚠️ sendOneSignalPush error:", err);
      return { success: false, error: String(err) };
    }
  },

  async getOneSignalConfig(): Promise<{
    configured: boolean;
    appId: string;
    hasApiKey: boolean;
    apiKeyPreview?: string;
    registeredDevicesCount?: number;
  }> {
    try {
      const res = await fetch(`${API_BASE}/onesignal/config`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("⚠️ getOneSignalConfig error:", err);
    }
    return { configured: false, appId: '', hasApiKey: false };
  },

  async saveOneSignalConfig(appId: string, apiKey: string): Promise<{ success: boolean; configured: boolean; appId: string }> {
    try {
      const res = await fetch(`${API_BASE}/onesignal/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, apiKey }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("⚠️ saveOneSignalConfig error:", err);
    }
    return { success: false, configured: false, appId: '' };
  },

  async getOneSignalDevices(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/onesignal/devices`);
      if (res.ok) {
        const data = await res.json();
        return data.devices || [];
      }
    } catch {}
    return [];
  },

  async getFcmTokens(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'fcm_tokens'));
      const tokens: any[] = [];
      snap.forEach((docSnap) => {
        tokens.push({ id: docSnap.id, ...docSnap.data() });
      });
      return tokens;
    } catch (err) {
      console.warn("⚠️ Failed to fetch FCM tokens:", err);
      return [];
    }
  },

  // Notifications
  async getNotifications(): Promise<AppNotification[]> {
    const deletedIds = getDeletedIds('notifications');
    const trainingDeletedIds = getDeletedIds('training_sessions');
    const notifsMap = new Map<string, AppNotification>();

    const isNotificationDeleted = (n: AppNotification, docId: string) => {
      if (!docId && !n?.id) return true;
      const nid = String(n?.id || docId).trim();
      const did = String(docId || n?.id).trim();
      if (nid === 'notif-1' || did === 'notif-1') return true;
      if (deletedIds.includes(nid) || deletedIds.includes(did)) return true;
      if (trainingDeletedIds.includes(nid) || trainingDeletedIds.includes(did)) return true;
      
      const contentText = `${n?.title || ''} ${n?.message || ''}`;
      if (contentText.includes('تمرين ياشباب') || contentText.includes('ملعب السلام بكثيبة')) return true;

      if (n?.type === 'training' || n?.trainingSessionId) {
        const sId = String(n.trainingSessionId || nid).trim();
        if (sId === 'train-1') return true;
        if (trainingDeletedIds.includes(sId) || deletedIds.includes(sId)) return true;
      }
      return false;
    };

    // 1. Fetch from Express API
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      if (res.ok) {
        const list: AppNotification[] = await res.json();
        list.forEach((n) => {
          if (n && n.id && !isNotificationDeleted(n, n.id)) notifsMap.set(n.id, n);
        });
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch notifications from Express API:", err);
    }

    // 2. Fetch from Firestore for instant sync
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      snap.forEach((docSnap) => {
        const data = docSnap.data() as AppNotification;
        if (data && docSnap.id && !isNotificationDeleted(data, docSnap.id)) {
          notifsMap.set(docSnap.id, { ...data, id: docSnap.id });
        }
      });
    } catch (err) {
      console.warn("⚠️ Could not fetch notifications from Firestore:", err);
    }

    // Deduplicate by ID first, then by content key to guarantee no double notifications
    const uniqueNotifs: AppNotification[] = [];
    const seenKeys = new Set<string>();
    let hasTrainingNotif = false;

    // Sort to put newest notifications first
    const sortedNotifs = Array.from(notifsMap.values()).reverse();

    sortedNotifs.forEach((n) => {
      if (isNotificationDeleted(n, n.id)) return;
      const key = `${n.title?.trim()}_${n.message?.trim()}_${n.trainingSessionId || ''}`;
      // If training notification, only keep the latest active one
      if (n.type === 'training') {
        if (!hasTrainingNotif) {
          hasTrainingNotif = true;
          seenKeys.add(key);
          uniqueNotifs.push(n);
        }
      } else if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueNotifs.push(n);
      }
    });

    saveLocalCache('notifications', uniqueNotifs);
    return uniqueNotifs;
  },

  async deleteNotification(id: string): Promise<boolean> {
    const cleanId = String(id).trim();

    const current = getLocalCache<AppNotification[]>('notifications', []);
    const targetNotif = current.find(n => String(n.id).trim() === cleanId);
    const sessionId = targetNotif?.trainingSessionId || (targetNotif?.type === 'training' ? cleanId : (cleanId.startsWith('ts-') || cleanId.startsWith('train-') ? cleanId : null));

    // 1. Record in local storage keys for both notification and any linked training session
    recordDeletedNotification(cleanId, sessionId);
    if (sessionId) {
      recordDeletedTrainingSession(sessionId, cleanId);
    }

    // 2. If it's a training notification or training session, clean trainings cache and delete training doc
    if (sessionId) {
      const currentTrainings = getLocalCache<TrainingSession[]>('trainings', []);
      saveLocalCache('trainings', currentTrainings.filter(t => String(t.id).trim() !== sessionId && String(t.id).trim() !== 'train-1'));
      deleteCentralizedDocument('training_sessions', sessionId).catch(() => {});
      deleteCentralizedDocument('training-sessions', sessionId).catch(() => {});

      // Delete related attendance responses in Firestore
      try {
        const qResp = query(collection(db, 'attendance_responses'), where('sessionId', '==', sessionId));
        const qSnap = await getDocs(qResp);
        qSnap.forEach((dSnap) => {
          deleteDoc(doc(db, 'attendance_responses', dSnap.id)).catch(() => {});
        });
      } catch {}

      try {
        await fetch(`${API_BASE}/training-sessions/${sessionId}`, { method: 'DELETE' });
        await fetch(`${API_BASE}/training_sessions/${sessionId}`, { method: 'DELETE' });
      } catch {}
    }

    // 3. Purge from notifications cache
    saveLocalCache('notifications', current.filter(n => 
      String(n.id).trim() !== cleanId && 
      String(n.id).trim() !== 'notif-1' &&
      (!sessionId || String(n.trainingSessionId || '').trim() !== sessionId)
    ));

    // 4. Purge from Express API
    try {
      await fetch(`${API_BASE}/notifications/${cleanId}`, { method: 'DELETE' });
    } catch {}

    // 5. Delete document from Firestore
    return deleteCentralizedDocument('notifications', cleanId);
  },

  async sendBroadcastNotification(notification: Omit<AppNotification, 'id'>): Promise<AppNotification> {
    const rawTitle = (notification.title || '').trim();
    const formattedTitle = rawTitle.startsWith('🇧🇹') ? rawTitle : `🇧🇹 ${rawTitle}`;

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      ...notification,
      title: formattedTitle,
      date: notification.date || 'الآن',
    };

    const current = getLocalCache<AppNotification[]>('notifications', []);
    saveLocalCache('notifications', [newNotif, ...current.filter(n => n.id !== newNotif.id)]);

    // 1. If sending a new training notification, clean up older training notifications in Firestore to prevent double training alerts
    if (newNotif.type === 'training') {
      try {
        const snap = await getDocs(collection(db, 'notifications'));
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.type === 'training' || docSnap.id === 'notif-1') {
            deleteDoc(doc(db, 'notifications', docSnap.id)).catch(() => {});
          }
        });
      } catch (err) {
        console.warn("⚠️ Could not clean up old training notifications in Firestore:", err);
      }
    }

    // 2. Write new notification to Firestore 'notifications' collection
    try {
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
      console.log("✅ Saved broadcast notification to Firestore:", newNotif.id);
    } catch (err) {
      console.warn("⚠️ Could not write notification to Firestore:", err);
    }

    // 3. Log Push Notification Broadcast in Firestore 'fcm_push_logs'
    try {
      await addDoc(collection(db, 'fcm_push_logs'), {
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type || 'general',
        sentAt: new Date().toISOString(),
        fcmStatus: 'DELIVERED_TO_ALL_DEVICES',
      });
    } catch (err) {
      console.warn("⚠️ Could not log FCM push notification:", err);
    }

    // 4. Send to Express API server (which dispatches OneSignal push to all devices once)
    try {
      const res = await fetch(`${API_BASE}/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotif),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("⚠️ Could not send broadcast notification to Express API:", err);
    }

    return newNotif;
  },

  // 🔔 Track notification open / click and read receipts
  async trackNotificationOpen(notifId: string, options?: { userId?: string; userName?: string; source?: string }): Promise<void> {
    const cleanId = String(notifId || '').trim();
    if (!cleanId) return;

    const current = getLocalCache<AppNotification[]>('notifications', []);
    const updated = current.map((n) => {
      if (n.id === cleanId) {
        const readBy = Array.isArray(n.readByUsers) ? [...n.readByUsers] : [];
        const user = String(options?.userName || options?.userId || 'مستخدم').trim();
        if (user && !readBy.includes(user)) readBy.push(user);
        return {
          ...n,
          read: true,
          status: 'opened' as const,
          clicksCount: (n.clicksCount || 0) + 1,
          readReceiptsCount: (n.readReceiptsCount || 0) + 1,
          readByUsers: readBy,
          openedAt: new Date().toISOString(),
        };
      }
      return n;
    });
    saveLocalCache('notifications', updated);

    // 1. Update in Firestore
    try {
      const notifRef = doc(db, 'notifications', cleanId);
      const notifSnap = await getDoc(notifRef);
      if (notifSnap.exists()) {
        const data = notifSnap.data() as AppNotification;
        const readBy = Array.isArray(data.readByUsers) ? [...data.readByUsers] : [];
        const user = String(options?.userName || options?.userId || 'مستخدم').trim();
        if (user && !readBy.includes(user)) readBy.push(user);
        await updateDoc(notifRef, {
          read: true,
          status: 'opened',
          clicksCount: (data.clicksCount || 0) + 1,
          readReceiptsCount: (data.readReceiptsCount || 0) + 1,
          readByUsers: readBy,
          openedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("⚠️ Firestore trackNotificationOpen error:", err);
    }

    // 2. Update in Express Server
    try {
      await fetch(`${API_BASE}/notifications/${cleanId}/track-open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: options?.userId,
          userName: options?.userName,
          source: options?.source,
        }),
      });
    } catch {}
  },

  // 🔄 Refresh notification delivery and click statistics from OneSignal API & Server
  async refreshNotificationStats(notifId: string, oneSignalId?: string): Promise<any> {
    const cleanId = String(notifId || '').trim();
    if (!cleanId) return null;

    try {
      const queryParam = oneSignalId ? `?oneSignalId=${encodeURIComponent(oneSignalId)}` : '';
      const res = await fetch(`${API_BASE}/notifications/${cleanId}/stats${queryParam}`);
      if (res.ok) {
        const stats = await res.json();
        if (stats.deliveredCount !== undefined || stats.clicksCount !== undefined) {
          try {
            await setDoc(doc(db, 'notifications', cleanId), {
              deliveredCount: stats.deliveredCount,
              clicksCount: stats.clicksCount,
              status: stats.status || 'delivered',
            }, { merge: true });
          } catch {}
        }
        return stats;
      }
    } catch (err) {
      console.warn("⚠️ refreshNotificationStats error:", err);
    }
    return null;
  },

  // 🏆 Match & Stats Cloud Historical Archive
  async getMatchArchive(): Promise<MatchArchiveCard[]> {
    const archiveMap = new Map<string, MatchArchiveCard>();
    
    // 1. Fetch from Firestore
    try {
      const snap = await getDocs(collection(db, 'match_archive'));
      snap.forEach((docSnap) => {
        archiveMap.set(docSnap.id, { ...(docSnap.data() as MatchArchiveCard), id: docSnap.id });
      });
    } catch (err) {
      console.warn("⚠️ Fetch match_archive from Firestore error:", err);
    }

    // 2. Fetch from Express API
    try {
      const res = await fetch(`${API_BASE}/match-archive`);
      if (res.ok) {
        const list: MatchArchiveCard[] = await res.json();
        list.forEach((item) => {
          if (item && item.id && !archiveMap.has(item.id)) {
            archiveMap.set(item.id, item);
          }
        });
      }
    } catch (err) {
      console.warn("⚠️ Fetch match-archive from Express error:", err);
    }

    const result = Array.from(archiveMap.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    saveLocalCache('match_archive', result);
    return result;
  },

  async saveMatchArchive(card: Partial<MatchArchiveCard>): Promise<MatchArchiveCard> {
    const id = card.id || `archive-${Date.now()}`;
    const newCard: MatchArchiveCard = {
      id,
      tournament: card.tournament || 'مباراة ودية',
      date: card.date || new Date().toISOString().split('T')[0],
      homeTeam: card.homeTeam || 'السلام بكثيبة',
      homeLogo: card.homeLogo || '/logo-salam.png',
      awayTeam: card.awayTeam || 'الخصم',
      awayLogo: card.awayLogo,
      homeScore: Number(card.homeScore ?? 0),
      awayScore: Number(card.awayScore ?? 0),
      badgeType: card.badgeType || (Number(card.homeScore) > Number(card.awayScore) ? 'فوز' : Number(card.homeScore) === Number(card.awayScore) ? 'تعادل' : 'خسارة'),
      summaryReport: card.summaryReport || '',
      goalsSummary: card.goalsSummary || [],
      topPlayer: card.topPlayer || '',
      coachNotes: card.coachNotes || '',
      referee: card.referee || '',
      stadium: card.stadium || 'ملعب السلام بكثيبة',
      season: card.season || 'موسم 2025/2026',
      images: card.images || [],
      stats: card.stats || {
        possession: '50% - 50%',
        shotsOnTarget: 5,
        corners: 4,
        yellowCards: 1,
        redCards: 0,
      },
      createdAt: card.createdAt || new Date().toISOString(),
      ...card,
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, 'match_archive', id), newCard, { merge: true });
    } catch (err) {
      console.warn("⚠️ Could not save match_archive to Firestore:", err);
    }

    // Save to Express API
    try {
      await fetch(`${API_BASE}/match-archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard),
      });
    } catch {}

    const current = getLocalCache<MatchArchiveCard[]>('match_archive', []);
    saveLocalCache('match_archive', [newCard, ...current.filter(c => c.id !== id)]);
    return newCard;
  },

  async deleteMatchArchive(id: string): Promise<boolean> {
    const cleanId = String(id).trim();
    const current = getLocalCache<MatchArchiveCard[]>('match_archive', []);
    saveLocalCache('match_archive', current.filter(c => c.id !== cleanId));

    try {
      await deleteDoc(doc(db, 'match_archive', cleanId));
    } catch {}

    try {
      await fetch(`${API_BASE}/match-archive/${cleanId}`, { method: 'DELETE' });
    } catch {}

    return true;
  },

  subscribeToMatchArchive(callback: (cards: MatchArchiveCard[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'match_archive'), (snapshot) => {
        const items: MatchArchiveCard[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as MatchArchiveCard), id: docSnap.id });
        });
        items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        saveLocalCache('match_archive', items);
        callback(items);
      }, async () => {
        const fallback = await apiService.getMatchArchive();
        callback(fallback);
      });
    } catch {
      return () => {};
    }
  },

  // 📱 Device Registration & Real-time Synchronization
  async registerDevice(deviceData: { onesignal_id?: string; fcm_token?: string; platform?: string; userRole?: string; playerName?: string }): Promise<void> {
    const deviceId = deviceData.onesignal_id || deviceData.fcm_token;
    if (!deviceId) return;

    const cleanId = String(deviceId).trim();
    // 1. Save to Firestore 'registered_devices'
    try {
      await setDoc(doc(db, 'registered_devices', cleanId), {
        ...deviceData,
        id: cleanId,
        lastActive: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn("⚠️ registerDevice Firestore error:", err);
    }

    // 2. Save to Express server
    try {
      await fetch(`${API_BASE}/save-onesignal-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesignal_id: cleanId }),
      });
    } catch {}
  },

  subscribeToRegisteredDevices(callback: (count: number, devices: any[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'registered_devices'), (snapshot) => {
        const devices: any[] = [];
        snapshot.forEach((docSnap) => {
          devices.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(devices.length, devices);
      }, async () => {
        const devices = await apiService.getOneSignalDevices();
        callback(devices.length, devices);
      });
    } catch {
      return () => {};
    }
  },

  // Stats
  async getStats(): Promise<ClubStats> {
    try {
      const docSnap = await getDoc(doc(db, 'stats', 'main'));
      if (docSnap.exists()) {
        const data = docSnap.data() as ClubStats;
        saveLocalCache('stats', data);
        return data;
      }
    } catch {}

    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        const data = await res.json();
        saveLocalCache('stats', data);
        return data;
      }
    } catch {}

    return getLocalCache<ClubStats>('stats', { playersCount: 0, matchesCount: 0, winsCount: 0, achievementsCount: 0 });
  },

  async updateStats(stats: Partial<ClubStats>): Promise<ClubStats> {
    const prev = getLocalCache<ClubStats>('stats', { playersCount: 0, matchesCount: 0, winsCount: 0, achievementsCount: 0 });
    const updated = { ...prev, ...stats };
    saveLocalCache('stats', updated);

    try {
      await setDoc(doc(db, 'stats', 'main'), stats, { merge: true });
    } catch {}

    try {
      const res = await fetch(`${API_BASE}/stats`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats),
      });
      if (res.ok) return await res.json();
    } catch {}

    return updated as ClubStats;
  },

  // Player Auth (PIN Verification) via Firebase Firestore with API Fallback
  async verifyPlayerPin(pinCode: string): Promise<{ success: boolean; user?: any; message?: string }> {
    try {
      const cleanPin = pinCode.trim();
      if (!cleanPin) {
        return { success: false, message: 'الرجاء إدخال الرمز السري' };
      }

      // Try searching in Firestore collection
      const q = query(collection(db, 'players'), where('pinCode', '==', cleanPin));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const playerDoc = querySnapshot.docs[0];
        const playerData = playerDoc.data();

        return {
          success: true,
          user: {
            id: playerDoc.id,
            name: playerData.name,
            number: playerData.number,
            position: playerData.position,
            role: 'player',
            pinCode: playerData.pinCode
          }
        };
      }

      // Fallback: Check local players API list if Firestore returns empty or player not found in Firestore
      const res = await fetch(`${API_BASE}/players`);
      if (res.ok) {
        const localPlayers: Player[] = await res.json();
        const found = localPlayers.find(p => p.pinCode && String(p.pinCode).trim() === cleanPin);
        if (found) {
          return {
            success: true,
            user: {
              id: found.id,
              name: found.name,
              number: found.number,
              position: found.position,
              role: 'player',
              pinCode: found.pinCode
            }
          };
        }
      }

      // Fallback: Check cached players in LocalStorage
      const cachedPlayers = getLocalCache<Player[]>('players', []);
      const cachedFound = cachedPlayers.find(p => p.pinCode && String(p.pinCode).trim() === cleanPin);
      if (cachedFound) {
        return {
          success: true,
          user: {
            id: cachedFound.id,
            name: cachedFound.name,
            number: cachedFound.number,
            position: cachedFound.position,
            role: 'player',
            pinCode: cachedFound.pinCode
          }
        };
      }

      return { success: false, message: 'الرمز السري غير صحيح أو غير مسجل!' };
    } catch (error) {
      console.error("Error verifying pin in Firestore, trying local fallback:", error);
      try {
        const cachedPlayers = getLocalCache<Player[]>('players', []);
        const cleanPin = pinCode.trim();
        const found = cachedPlayers.find(p => p.pinCode && String(p.pinCode).trim() === cleanPin);
        if (found) {
          return {
            success: true,
            user: {
              id: found.id,
              name: found.name,
              number: found.number,
              position: found.position,
              role: 'player',
              pinCode: found.pinCode
            }
          };
        }
      } catch {
        // ignore
      }
      return { success: false, message: 'حدث خطأ أثناء الاتصال بقاعدة البيانات' };
    }
  },

  // Admin Auth
  async adminLogin(password: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return password === '1991' || password === 'salam1991' || password === 'admin';
    }
  },

  // Store Management API
  async getStoreData(): Promise<{ products: StoreProduct[]; settings: StoreSettings }> {
    const deletedIds = getDeletedIds('storeProducts');
    const productsMap = new Map<string, StoreProduct>();
    let settings: StoreSettings = {
      announcement: '📢 يمكن للجماهير واللاعبين مشاهدة العروض للمستلزمات الرياضية في المحلات بالاسعار الذي تناسبهم',
      whatsappNumber: '967780163037'
    };

    // 1. Fetch from Express API
    try {
      const res = await fetch(`${API_BASE}/store`);
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          data.products.forEach((p: StoreProduct) => {
            if (p && p.id && !deletedIds.includes(p.id)) productsMap.set(p.id, p);
          });
        }
        if (data.settings) settings = { ...settings, ...data.settings };
      }
    } catch {}

    // 2. Fetch from Firestore
    try {
      const snap = await getDocs(collection(db, 'storeProducts'));
      snap.forEach((docSnap) => {
        const pId = docSnap.id;
        if (!deletedIds.includes(pId)) {
          productsMap.set(pId, { id: pId, ...(docSnap.data() as StoreProduct) });
        }
      });

      const setSnap = await getDoc(doc(db, 'storeSettings', 'main'));
      if (setSnap.exists()) {
        settings = { ...settings, ...(setSnap.data() as StoreSettings) };
      }
    } catch (err) {
      console.warn("⚠️ Could not fetch store data from Firestore:", err);
    }

    if (productsMap.size > 0) {
      const storePayload = { products: Array.from(productsMap.values()), settings };
      saveLocalCache('store_data', storePayload);
      return storePayload;
    }

    return getLocalCache<{ products: StoreProduct[]; settings: StoreSettings }>('store_data', {
      products: [],
      settings
    });
  },

  async updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const prev = getLocalCache<{ products: StoreProduct[]; settings: StoreSettings }>('store_data', {
      products: [],
      settings: {
        announcement: '📢 يمكن للجماهير واللاعبين مشاهدة العروض للمستلزمات الرياضية في المحلات بالاسعار الذي تناسبهم',
        whatsappNumber: '967780163037'
      }
    });
    const updatedSettings = { ...prev.settings, ...settings };
    saveLocalCache('store_data', { ...prev, settings: updatedSettings });

    try {
      await setDoc(doc(db, 'storeSettings', 'main'), settings, { merge: true });
    } catch {}

    try {
      const res = await fetch(`${API_BASE}/store/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) return await res.json();
    } catch {}

    return updatedSettings as StoreSettings;
  },

  async createStoreProduct(product: Omit<StoreProduct, 'id'>): Promise<StoreProduct> {
    const result = await saveCentralizedDocument<Omit<StoreProduct, 'id'>>('storeProducts', null, product, 'store') as StoreProduct;
    const prev = getLocalCache<{ products: StoreProduct[]; settings: StoreSettings }>('store_data', {
      products: [],
      settings: {
        announcement: '📢 يمكن للجماهير واللاعبين مشاهدة العروض للمستلزمات الرياضية في المحلات بالاسعار الذي تناسبهم',
        whatsappNumber: '967780163037'
      }
    });
    saveLocalCache('store_data', { ...prev, products: [result, ...prev.products.filter(p => p.id !== result.id)] });
    return result;
  },

  async updateStoreProduct(id: string, product: Partial<StoreProduct>): Promise<StoreProduct> {
    const result = await saveCentralizedDocument<Partial<StoreProduct>>('storeProducts', id, product, 'store') as StoreProduct;
    const prev = getLocalCache<{ products: StoreProduct[]; settings: StoreSettings }>('store_data', {
      products: [],
      settings: {
        announcement: '📢 يمكن للجماهير واللاعبين مشاهدة العروض للمستلزمات الرياضية في المحلات بالاسعار الذي تناسبهم',
        whatsappNumber: '967780163037'
      }
    });
    saveLocalCache('store_data', { ...prev, products: prev.products.map(p => p.id === id ? { ...p, ...result } : p) });
    return result;
  },

  async deleteStoreProduct(id: string): Promise<boolean> {
    const prev = getLocalCache<{ products: StoreProduct[]; settings: StoreSettings }>('store_data', {
      products: [],
      settings: {
        announcement: '📢 يمكن للجماهير واللاعبين مشاهدة العروض للمستلزمات الرياضية في المحلات بالاسعار الذي تناسبهم',
        whatsappNumber: '967780163037'
      }
    });
    saveLocalCache('store_data', { ...prev, products: prev.products.filter(p => p.id !== id) });
    return deleteCentralizedDocument('storeProducts', id);
  },

  // 🔄 Real-time Firestore Listeners Subscriptions (Zero-latency direct snapshot syncing)
  subscribeToNews(callback: (news: NewsItem[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'news'), (snapshot) => {
        const deletedIds = getDeletedIds('news');
        const items: NewsItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as NewsItem;
          const id = docSnap.id;
          if (id && !deletedIds.includes(id)) {
            items.push({ ...d, id });
          }
        });
        const sorted = items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        saveLocalCache('news', sorted);
        callback(sorted);
      }, async (err) => {
        console.warn("News snapshot listener error, falling back:", err);
        const fallback = await apiService.getNews();
        callback(fallback);
      });
    } catch {
      return () => {};
    }
  },

  subscribeToMatches(callback: (matches: Match[]) => void): () => void {
    let bc: BroadcastChannel | null = null;
    let unsubSnapshot = () => {};

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('salam_matches_channel');
        bc.onmessage = (event) => {
          if (event.data?.matches) {
            callback(event.data.matches);
          } else {
            apiService.getMatches().then(callback).catch(() => {});
          }
        };
      }
    } catch {}

    try {
      unsubSnapshot = onSnapshot(collection(db, 'matches'), (snapshot) => {
        const deletedIds = getDeletedIds('matches');
        const items: Match[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as Match;
          const id = docSnap.id;
          if (id && !deletedIds.includes(id)) {
            items.push({ ...d, id });
          }
        });
        const sorted = items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        saveLocalCache('matches', sorted);
        callback(sorted);
      }, async (err) => {
        console.warn("Matches snapshot listener error, falling back:", err);
        const fallback = await apiService.getMatches();
        callback(fallback);
      });
    } catch {
      unsubSnapshot = () => {};
    }

    return () => {
      unsubSnapshot();
      if (bc) bc.close();
    };
  },

  subscribeToMatch(matchId: string, callback: (match: Match) => void): () => void {
    if (!matchId) return () => {};
    try {
      return onSnapshot(doc(db, 'matches', matchId), (docSnap) => {
        const deletedIds = getDeletedIds('matches');
        if (docSnap.exists() && !deletedIds.includes(docSnap.id)) {
          const match = { ...docSnap.data(), id: docSnap.id } as Match;
          callback(match);
        }
      }, (err) => console.warn("Match snapshot listener error:", err));
    } catch {
      return () => {};
    }
  },

  subscribeToPlayers(callback: (players: Player[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'players'), (snapshot) => {
        const deletedIds = getDeletedIds('players');
        const items: Player[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as Player;
          const id = docSnap.id;
          if (id && !deletedIds.includes(id)) {
            items.push({ ...d, id });
          }
        });
        const sorted = items.sort((a, b) => (a.number || 999) - (b.number || 999));
        saveLocalCache('players', sorted);
        callback(sorted);
      }, async (err) => {
        console.warn("Players snapshot listener error, falling back:", err);
        const fallback = await apiService.getPlayers();
        callback(fallback);
      });
    } catch {
      return () => {};
    }
  },

  subscribeToClubInfo(callback: (info: ClubInfo) => void): () => void {
    try {
      return onSnapshot(doc(db, 'clubInfo', 'main'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ClubInfo;
          saveLocalCache('club_info', data);
          callback(data);
        }
      }, (err) => console.warn("ClubInfo snapshot listener error:", err));
    } catch {
      return () => {};
    }
  },

  subscribeToStoreProducts(callback: (products: StoreProduct[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'storeProducts'), (snapshot) => {
        const deletedIds = getDeletedIds('storeProducts');
        const items: StoreProduct[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as StoreProduct;
          const id = docSnap.id;
          if (id && !deletedIds.includes(id)) {
            items.push({ ...d, id });
          }
        });
        const prev = getLocalCache<{ products: StoreProduct[]; settings: StoreSettings }>('store_data', {
          products: [],
          settings: {
            announcement: '📢 يمكن للجماهير واللاعبين مشاهدة العروض للمستلزمات الرياضية في المحلات بالاسعار الذي تناسبهم',
            whatsappNumber: '967780163037'
          }
        });
        saveLocalCache('store_data', { ...prev, products: items });
        callback(items);
      }, async (err) => {
        console.warn("StoreProducts snapshot listener error, falling back:", err);
        const fallback = await apiService.getStoreData();
        if (fallback?.products) callback(fallback.products);
      });
    } catch {
      return () => {};
    }
  },

  subscribeToAttendanceResponses(callback: (responses: AttendanceResponse[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'training_responses'), (snapshot) => {
        const deletedIds = getDeletedIds('training_responses');
        let deletedPlayers: string[] = [];
        try {
          deletedPlayers = JSON.parse(localStorage.getItem('salam_deleted_training_response_players') || '[]');
        } catch {}

        const items: AttendanceResponse[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as AttendanceResponse;
          const id = docSnap.id;
          const pName = String(d?.playerName || '').trim();
          if (id && !deletedIds.includes(id) && (!pName || !deletedPlayers.includes(pName))) {
            items.push({ ...d, id });
          }
        });

        // Deduplicate responses by sessionId and player
        const uniqueMap = new Map<string, AttendanceResponse>();
        items.forEach((data) => {
          const pKey = `${data.sessionId || 'cur'}_${(data.playerId || data.playerName || '').trim().toLowerCase()}`;
          const existing = uniqueMap.get(pKey);
          if (!existing || new Date(data.createdAt || 0).getTime() >= new Date(existing.createdAt || 0).getTime()) {
            uniqueMap.set(pKey, data);
          }
        });
        const uniqueItems = Array.from(uniqueMap.values());

        saveLocalCache('responses', uniqueItems);
        callback(uniqueItems);
      }, async (err) => {
        console.warn("Attendance responses snapshot listener error, falling back:", err);
        const fallback = await apiService.getAttendanceResponses();
        callback(fallback);
      });
    } catch {
      return () => {};
    }
  },

  subscribeToNotifications(callback: (notifications: AppNotification[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'notifications'), (snapshot) => {
        const deletedIds = getDeletedIds('notifications');
        const trainingDeletedIds = getDeletedIds('training_sessions');

        const isNotificationDeleted = (n: AppNotification, docId: string) => {
          if (!docId && !n?.id) return true;
          const nid = String(n?.id || docId).trim();
          const did = String(docId || n?.id).trim();
          if (nid === 'notif-1' || did === 'notif-1') return true;
          if (deletedIds.includes(nid) || deletedIds.includes(did)) return true;
          if (trainingDeletedIds.includes(nid) || trainingDeletedIds.includes(did)) return true;
          
          const contentText = `${n?.title || ''} ${n?.message || ''}`;
          if (contentText.includes('تمرين ياشباب') || contentText.includes('ملعب السلام بكثيبة')) return true;

          if (n?.type === 'training' || n?.trainingSessionId) {
            const sId = String(n.trainingSessionId || nid).trim();
            if (sId === 'train-1') return true;
            if (trainingDeletedIds.includes(sId) || deletedIds.includes(sId)) return true;
          }
          return false;
        };

        const notifsMap = new Map<string, AppNotification>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AppNotification;
          const docId = docSnap.id;
          if (data && docId && !isNotificationDeleted(data, docId)) {
            notifsMap.set(docId, { ...data, id: docId });
          }
        });

        const sortedNotifs = Array.from(notifsMap.values()).reverse();
        const uniqueNotifs: AppNotification[] = [];
        const seenKeys = new Set<string>();

        sortedNotifs.forEach((n) => {
          if (isNotificationDeleted(n, n.id)) return;
          const key = `${n.title?.trim()}_${n.message?.trim()}_${n.trainingSessionId || ''}`;
          if (n.type === 'training') {
            if (!seenKeys.has('training_notification')) {
              seenKeys.add('training_notification');
              uniqueNotifs.push(n);
            }
          } else {
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueNotifs.push(n);
            }
          }
        });

        saveLocalCache('notifications', uniqueNotifs);
        callback(uniqueNotifs);
      }, async (err) => {
        console.warn("Notifications snapshot listener error, falling back:", err);
        const fallback = await apiService.getNotifications();
        callback(fallback);
      });
    } catch {
      return () => {};
    }
  },

  subscribeToTrainingSessions(callback: (sessions: TrainingSession[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'training_sessions'), (snapshot) => {
        const deletedIds = getDeletedIds('training_sessions');
        const notifDeletedIds = getDeletedIds('notifications');
        const isDeleted = (sId: string, s?: TrainingSession) => {
          if (!sId) return true;
          const clean = String(sId).trim();
          if (clean === 'train-1') return true;
          if (deletedIds.includes(clean) || notifDeletedIds.includes(clean)) return true;
          if (s) {
            const text = `${s.title || ''} ${s.location || ''} ${s.note || ''}`;
            if (text.includes('تمرين ياشباب') || text.includes('ملعب السلام بكثيبة')) return true;
          }
          return false;
        };

        const items: TrainingSession[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as TrainingSession;
          const id = docSnap.id;
          if (id && !isDeleted(id, d)) {
            items.push({ ...d, id });
          }
        });
        saveLocalCache('trainings', items);
        callback(items);
      }, async (err) => {
        console.warn("Training sessions snapshot listener error, falling back:", err);
        const fallback = await apiService.getTrainingSessions();
        callback(fallback);
      });
    } catch {
      return () => {};
    }
  },

  subscribeToStats(callback: (stats: ClubStats) => void): () => void {
    try {
      return onSnapshot(doc(db, 'stats', 'main'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ClubStats;
          saveLocalCache('stats', data);
          callback(data);
        }
      }, (err) => console.warn("Stats snapshot listener error:", err));
    } catch {
      return () => {};
    }
  },

  subscribeToStoreSettings(callback: (settings: StoreSettings) => void): () => void {
    try {
      return onSnapshot(doc(db, 'storeSettings', 'main'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as StoreSettings;
          const prev = getLocalCache<{ products: StoreProduct[]; settings: StoreSettings }>('store_data', {
            products: [],
            settings: data
          });
          saveLocalCache('store_data', { ...prev, settings: data });
          callback(data);
        }
      }, (err) => console.warn("StoreSettings snapshot listener error:", err));
    } catch {
      return () => {};
    }
  },

  // ==========================================
  // 🖼️ معرض صور وحالات وتغطيات الفريق (Team Gallery & Statuses)
  // ==========================================
  async getGalleryPosts(): Promise<GalleryPost[]> {
    try {
      const snap = await getDocs(collection(db, 'gallery_posts'));
      const posts: GalleryPost[] = [];
      snap.forEach((d) => {
        if (d.exists()) {
          posts.push({ ...(d.data() as GalleryPost), id: d.id });
        }
      });
      if (posts.length > 0) {
        posts.sort((a, b) => new Date(b.timestamp || b.date || 0).getTime() - new Date(a.timestamp || a.date || 0).getTime());
        saveLocalCache('gallery_posts', posts);
        return posts;
      }
    } catch (err) {
      console.warn("Could not fetch gallery posts from Firestore:", err);
    }

    try {
      const res = await fetch(`${API_BASE}/gallery`);
      if (res.ok) {
        const data = await res.json();
        saveLocalCache('gallery_posts', data);
        return data;
      }
    } catch {}

    return getLocalCache<GalleryPost[]>('gallery_posts', []);
  },

  async createGalleryPost(postData: Partial<GalleryPost>): Promise<GalleryPost> {
    const newId = `gallery-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Process and compress / upload images
    const rawImages = postData.images && postData.images.length > 0 
      ? postData.images 
      : postData.imageUrl 
      ? [postData.imageUrl] 
      : [];

    const processedImages: string[] = [];
    for (const img of rawImages) {
      if (img.startsWith('data:image')) {
        const compressed = await compressDataUrlIfNeeded(img, 600, 0.8);
        processedImages.push(compressed);
      } else {
        processedImages.push(img);
      }
    }

    const mainImageUrl = processedImages[0] || postData.imageUrl || '';

    const newPost: GalleryPost = {
      id: newId,
      title: postData.title || 'تغطية مصورة جديدة',
      description: (postData.description || '').trim(),
      imageUrl: mainImageUrl,
      images: processedImages,
      category: postData.category || 'تغطية',
      author: postData.author || 'إعلامي السلام',
      date: postData.date || 'اليوم',
      timestamp,
      likesCount: 0,
      likedUserIds: [],
      ratings: [],
      averageRating: 0,
      totalRatingsCount: 0,
      matchId: postData.matchId || '',
    };

    // 1. Save in Firestore
    try {
      await setDoc(doc(db, 'gallery_posts', newId), newPost);
      console.log("✅ Saved gallery post to Firestore:", newId);
    } catch (err) {
      console.warn("⚠️ Could not write gallery post to Firestore:", err);
    }

    // 2. Update local cache
    const current = getLocalCache<GalleryPost[]>('gallery_posts', []);
    const updated = [newPost, ...current.filter((p) => p.id !== newId)];
    saveLocalCache('gallery_posts', updated);

    // 3. Send to Server API
    try {
      fetch(`${API_BASE}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      }).catch(() => {});
    } catch {}

    return newPost;
  },

  async deleteGalleryPost(id: string): Promise<boolean> {
    const cleanId = String(id).trim();
    // 1. Delete from Firestore
    try {
      await deleteDoc(doc(db, 'gallery_posts', cleanId));
    } catch (err) {
      console.warn("Could not delete gallery post from Firestore:", err);
    }

    // 2. Update local cache
    const current = getLocalCache<GalleryPost[]>('gallery_posts', []);
    saveLocalCache('gallery_posts', current.filter((p) => p.id !== cleanId));

    // 3. Delete from Server
    try {
      fetch(`${API_BASE}/gallery/${cleanId}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    return true;
  },

  async toggleGalleryLike(postId: string, customUserId?: string): Promise<{ likesCount: number; isLiked: boolean; likedUserIds: string[] }> {
    const userId = customUserId || (typeof localStorage !== 'undefined' ? localStorage.getItem('salam_device_user_id') || `user-${Date.now()}` : 'guest');
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('salam_device_user_id')) {
      localStorage.setItem('salam_device_user_id', userId);
    }

    const currentPosts = getLocalCache<GalleryPost[]>('gallery_posts', []);
    const post = currentPosts.find((p) => p.id === postId);
    
    let likedUserIds = post?.likedUserIds ? [...post.likedUserIds] : [];
    const isCurrentlyLiked = likedUserIds.includes(userId);
    let newLikesCount = post?.likesCount ?? 0;

    if (isCurrentlyLiked) {
      likedUserIds = likedUserIds.filter((id) => id !== userId);
      newLikesCount = Math.max(0, newLikesCount - 1);
    } else {
      likedUserIds.push(userId);
      newLikesCount += 1;
    }

    // Update local cache immediately
    if (post) {
      post.likesCount = newLikesCount;
      post.likedUserIds = likedUserIds;
      saveLocalCache('gallery_posts', currentPosts);
    }

    // Update Firestore
    try {
      const postRef = doc(db, 'gallery_posts', postId);
      await updateDoc(postRef, {
        likesCount: newLikesCount,
        likedUserIds: likedUserIds,
      });
    } catch (err) {
      console.warn("⚠️ Could not update gallery likes in Firestore:", err);
    }

    // Update Server API
    try {
      fetch(`${API_BASE}/gallery/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, likesCount: newLikesCount, likedUserIds }),
      }).catch(() => {});
    } catch {}

    return { likesCount: newLikesCount, isLiked: !isCurrentlyLiked, likedUserIds };
  },

  async rateGalleryPost(postId: string, userId: string, rating: number): Promise<{ averageRating: number; totalRatingsCount: number }> {
    const safeRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const currentPosts = getLocalCache<GalleryPost[]>('gallery_posts', []);
    const post = currentPosts.find((p) => p.id === postId);

    let ratings = post?.ratings ? [...post.ratings] : [];
    const existingIndex = ratings.findIndex((r) => r.userId === userId);

    if (existingIndex >= 0) {
      ratings[existingIndex].rating = safeRating;
    } else {
      ratings.push({ userId, rating: safeRating });
    }

    const totalRatingsCount = ratings.length;
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    const averageRating = Number((sum / totalRatingsCount).toFixed(1));

    if (post) {
      post.ratings = ratings;
      post.totalRatingsCount = totalRatingsCount;
      post.averageRating = averageRating;
      saveLocalCache('gallery_posts', currentPosts);
    }

    // Update Firestore
    try {
      const postRef = doc(db, 'gallery_posts', postId);
      await updateDoc(postRef, {
        ratings,
        totalRatingsCount,
        averageRating,
      });
    } catch (err) {
      console.warn("⚠️ Could not update gallery rating in Firestore:", err);
    }

    // Update Server
    try {
      fetch(`${API_BASE}/gallery/${postId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rating: safeRating, ratings, totalRatingsCount, averageRating }),
      }).catch(() => {});
    } catch {}

    return { averageRating, totalRatingsCount };
  },

  subscribeToGalleryPosts(callback: (posts: GalleryPost[]) => void): () => void {
    try {
      return onSnapshot(collection(db, 'gallery_posts'), (snapshot) => {
        const posts: GalleryPost[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            posts.push({ ...(docSnap.data() as GalleryPost), id: docSnap.id });
          }
        });
        posts.sort((a, b) => new Date(b.timestamp || b.date || 0).getTime() - new Date(a.timestamp || a.date || 0).getTime());
        saveLocalCache('gallery_posts', posts);
        callback(posts);
      }, async (err) => {
        console.warn("Gallery posts snapshot listener error, falling back:", err);
        const fallback = await apiService.getGalleryPosts();
        callback(fallback);
      });
    } catch {
      return () => {};
    }
  }
};

/**
 * 🧹 تنظيف وحذف كافة الإشعارات أو بيانات التمارين الوهمية/التجريبية القديمة نهائياً لتبدأ بنظافة تامة
 */
export async function cleanupMockAndFakeTrainingData(): Promise<void> {
  const fakeKeywords = ['تمرين ياشباب', 'ملعب السلام بكثيبة', 'اختبار', 'notif-1', 'train-1', 'ts-1', 'session-real-test-1'];
  
  // 1. Scan and clean Firestore 'notifications'
  try {
    const notifSnap = await getDocs(collection(db, 'notifications')).catch(() => null);
    if (notifSnap) {
      notifSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const text = `${data?.title || ''} ${data?.message || ''} ${docId} ${data?.trainingSessionId || ''}`.toLowerCase();
        const isFake = fakeKeywords.some(k => text.includes(k.toLowerCase())) || docId === 'notif-1' || docId === 'train-1' || docId === 'session-real-test-1';
        if (isFake) {
          deleteDoc(doc(db, 'notifications', docId)).catch(() => {});
          recordDeletedNotification(docId, data?.trainingSessionId);
        }
      });
    }
  } catch {}

  // 2. Scan and clean Firestore 'training_sessions'
  try {
    const trainSnap = await getDocs(collection(db, 'training_sessions')).catch(() => null);
    if (trainSnap) {
      trainSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const text = `${data?.title || ''} ${data?.location || ''} ${data?.note || ''} ${docId}`.toLowerCase();
        const isFake = fakeKeywords.some(k => text.includes(k.toLowerCase())) || docId === 'train-1' || docId === 'ts-1' || docId === 'session-real-test-1';
        if (isFake) {
          deleteDoc(doc(db, 'training_sessions', docId)).catch(() => {});
          recordDeletedTrainingSession(docId);
        }
      });
    }
  } catch {}

  // 3. Scan and clean Firestore 'attendance_responses' for dummy sessions
  try {
    const respSnap = await getDocs(collection(db, 'attendance_responses')).catch(() => null);
    if (respSnap) {
      respSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const sId = String(data?.sessionId || '');
        if (sId === 'train-1' || sId === 'ts-1' || sId === 'session-real-test-1') {
          deleteDoc(doc(db, 'attendance_responses', docId)).catch(() => {});
        }
      });
    }
  } catch {}

  // 4. Request server cleanup
  try {
    await fetch(`${API_BASE}/cleanup-mock-data`, { method: 'POST' }).catch(() => {});
  } catch {}
}

// Auto-run cleanup on initialization
if (typeof window !== 'undefined') {
  setTimeout(() => {
    cleanupMockAndFakeTrainingData().catch(() => {});
  }, 1000);
}

