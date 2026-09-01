import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Flame, Clock, Trash2, X, Volume2, Camera, Image as ImageIcon } from 'lucide-react';
import { AppNotification, TrainingSession, AttendanceResponse, ClubInfo } from '../types';
import { apiService, getDeletedIds, recordDeletedNotification, recordDeletedTrainingSession } from '../services/api';
import { Logo } from './Logo';
import { requestNotificationPermission, showSystemNotification, playNotificationSound, enableNotificationsAndGoToSettings } from '../services/notificationService';

interface NotificationsCenterProps {
  notifications: AppNotification[];
  trainingSessions: TrainingSession[];
  onOpenTrainingModal: (session: TrainingSession, initialChoice?: 'attend' | 'absent') => void;
  onNavigateToGallery?: (galleryPostId?: string) => void;
  onClose: () => void;
  attendanceResponses?: AttendanceResponse[];
  respondedSessionIds?: string[];
  loggedInPlayer?: any;
  userRole?: 'player' | 'fan';
  onDeleteNotification?: (id: string) => void;
  clubInfo?: ClubInfo;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  notifications,
  trainingSessions,
  onOpenTrainingModal,
  onNavigateToGallery,
  onClose,
  attendanceResponses = [],
  respondedSessionIds = [],
  loggedInPlayer,
  userRole = 'fan',
  onDeleteNotification,
  clubInfo,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const notifDeleted = getDeletedIds('notifications');
      const trainDeleted = getDeletedIds('training_sessions');
      return Array.from(new Set([...notifDeleted, ...trainDeleted, 'notif-1', 'train-1']));
    } catch {
      return ['notif-1', 'train-1'];
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (permissionStatus !== 'granted') {
      await enableNotificationsAndGoToSettings();
      setPermissionStatus('granted');
      setNotificationsEnabled(true);
      await showSystemNotification('✅ تم تفعيل إشعارات نادي السلام', {
        body: 'ستصلك الآن كافة إشعارات المباريات، التمارين، والأخبار الرسمية على جهازك فوراً!',
      });
    } else {
      const nextState = !notificationsEnabled;
      setNotificationsEnabled(nextState);
      if (nextState) {
        await showSystemNotification('🔔 إشعار تجريبي', {
          body: 'إشعارات النظام تعمل بنجاح على هذا الجهاز!',
        });
      }
    }
  };

  const handleDismissCard = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanId = String(notifId).trim();
    if (!cleanId) return;

    const targetNotif = notifications.find((n) => String(n.id).trim() === cleanId);
    const sId = targetNotif?.trainingSessionId || (targetNotif?.type === 'training' ? cleanId : (cleanId.startsWith('ts-') || cleanId.startsWith('train-') ? cleanId : null));

    // 1. Mark immediately in component local state
    setDismissedNotifIds((prev) => Array.from(new Set([...prev, cleanId, 'notif-1', ...(sId ? [sId] : [])])));

    // 2. Persist in all permanent storage keys
    recordDeletedNotification(cleanId, sId);
    if (sId) {
      recordDeletedTrainingSession(sId, cleanId);
    }

    // 3. Notify parent App component
    if (onDeleteNotification) {
      onDeleteNotification(cleanId);
    }

    // 4. Delete from backend & Firestore completely
    try {
      if (sId) {
        await apiService.deleteTrainingSession(sId);
      }
      await apiService.deleteNotification(cleanId);
    } catch (err) {
      console.warn("⚠️ Error deleting notification:", err);
    }
  };

  // Helper to check if player has already responded to a notification's linked session
  const isNotificationResponded = (notif: AppNotification): boolean => {
    const cleanNotifId = String(notif.id || '').trim();
    if (dismissedNotifIds.includes(cleanNotifId)) return true;

    const sessionId = notif.trainingSessionId || (notif.type === 'training' ? (trainingSessions[0]?.id || cleanNotifId) : null);
    if (!sessionId) return false;

    const cleanSessionId = String(sessionId).trim();
    if (respondedSessionIds.includes(cleanSessionId) || respondedSessionIds.includes(cleanNotifId)) {
      return true;
    }

    if (attendanceResponses && attendanceResponses.length > 0) {
      return attendanceResponses.some((resp) => {
        if (String(resp.sessionId).trim() !== cleanSessionId) return false;
        if (loggedInPlayer?.id && resp.playerId === loggedInPlayer.id) return true;
        if (loggedInPlayer?.name && resp.playerName) {
          const p1 = loggedInPlayer.name.trim().toLowerCase();
          const p2 = resp.playerName.trim().toLowerCase();
          return p1 === p2 || p1.includes(p2) || p2.includes(p1);
        }
        return false;
      });
    }

    return false;
  };

  // Filter out deleted, dismissed, or responded notifications
  const visibleNotifications = notifications.filter((notif) => {
    if (!notif || !notif.id) return false;
    const nid = String(notif.id).trim();
    const sid = String(notif.trainingSessionId || '').trim();
    if (nid === 'notif-1' || sid === 'train-1') return false;

    // Check dismissed / deleted state
    if (dismissedNotifIds.includes(nid) || (sid && dismissedNotifIds.includes(sid))) {
      return false;
    }

    const notifDeleted = getDeletedIds('notifications');
    const trainDeleted = getDeletedIds('training_sessions');
    if (notifDeleted.includes(nid) || trainDeleted.includes(nid) || (sid && (notifDeleted.includes(sid) || trainDeleted.includes(sid)))) {
      return false;
    }

    const contentText = `${notif.title || ''} ${notif.message || ''}`;
    if (contentText.includes('تمرين ياشباب') || contentText.includes('ملعب السلام بكثيبة')) return false;

    if (notif.type === 'training' || notif.trainingSessionId) {
      if (isNotificationResponded(notif)) {
        return false; // Hide if player has responded
      }
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1a1111] border-2 border-red-800/80 rounded-3xl w-full max-w-md h-[80vh] flex flex-col shadow-2xl text-white dir-rtl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 via-amber-950 to-red-950 p-4 border-b border-red-800/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-400" />
            <h2 className="font-extrabold text-sm text-white">مركز الإشعارات التفاعلي</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Bar */}
        <div className="p-4 bg-[#120a0a] border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell className={`w-5 h-5 ${notificationsEnabled ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-white">إشعارات النظام والمتصفح</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : permissionStatus === 'denied'
                    ? 'bg-red-950 text-red-300 border border-red-500/40'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                }`}>
                  {permissionStatus === 'granted' ? 'مفعلة ✅' : permissionStatus === 'denied' ? 'محظورة ❌' : 'بحاجة للإذن 🔔'}
                </span>
              </div>
              <p className="text-xs text-gray-400">استلم إشعارات التمارين، النتائج، والأخبار على جهازك</p>
            </div>
          </div>

          <button
            onClick={handleToggleNotifications}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
              notificationsEnabled ? 'bg-emerald-600' : 'bg-gray-700'
            }`}
            title="انقر لتفعيل أو اختبار إشعارات النظام"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                notificationsEnabled ? 'translate-x-0' : '-translate-x-6'
              }`}
            />
          </button>
        </div>

        {/* List of Notifications */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {visibleNotifications.length === 0 ? (
            <div className="text-center py-16 text-gray-500 space-y-2">
              <Bell className="w-10 h-10 mx-auto text-gray-600" />
              <p className="text-xs font-semibold">لا توجد إشعارات حالياً</p>
            </div>
          ) : (
            visibleNotifications.map((notif) => {
              const linkedTraining = notif.trainingSessionId
                ? trainingSessions.find((t) => t.id === notif.trainingSessionId)
                : trainingSessions[0];

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    notif.type === 'training'
                      ? 'bg-gradient-to-r from-[#281717] to-[#1e1212] border-amber-500/60 shadow-lg'
                      : 'bg-[#140c0c] border-white/10 shadow-md'
                  }`}
                >
                  {/* Top Team Header Bar with Dismiss X Button */}
                  <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-0.5 rounded-full bg-amber-500/20 border border-amber-400/40">
                        <Logo size={24} customLogoUrl={clubInfo?.logoUrl} />
                      </div>
                      <span className="text-xs font-black text-amber-300 drop-shadow-sm">فريق السلام بكثيبة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span dir="rtl" className="inline-flex items-center gap-1.5 text-[10px] bg-amber-500/15 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                        {notif.type === 'training' ? (
                          <>
                            <span className="shrink-0">🇧🇹</span>
                            <span>إشعار تمرين</span>
                          </>
                        ) : notif.type === 'gallery' || notif.galleryPostId ? (
                          <>
                            <span className="shrink-0">📸</span>
                            <span>نقل مباشر / معرض</span>
                          </>
                        ) : (
                          '📢 إشعار رسمي'
                        )}
                      </span>
                      <button
                        onClick={(e) => handleDismissCard(notif.id, e)}
                        className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-600/40 transition-transform active:scale-90 cursor-pointer"
                        title="حذف الإشعار نهائياً"
                        aria-label="حذف الإشعار نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 w-full min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div dir="rtl" className="flex items-center gap-1.5 min-w-0 text-right">
                          <span className="text-xs shrink-0">
                            {notif.type === 'gallery' ? '📸' : '🇧🇹'}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-white break-words text-wrap">
                            {notif.title.replace(/^🇧🇹\s*/, '')}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium shrink-0">{notif.date}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-line mt-1 break-words text-wrap">{notif.message}</p>
                    </div>
                  </div>

                  {/* Gallery Direct View Button */}
                  {(notif.type === 'gallery' || notif.galleryPostId || notif.deepLink === 'gallery') && (
                    <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between">
                      <span className="text-[11px] text-amber-200 font-bold">تغطية مصورة حصرية:</span>
                      <button
                        onClick={() => {
                          apiService.trackNotificationOpen(notif.id, {
                            userId: loggedInPlayer?.pin || 'fan',
                            userName: loggedInPlayer?.name || 'مشجع',
                          });
                          onClose();
                          if (onNavigateToGallery) {
                            onNavigateToGallery(notif.galleryPostId);
                          }
                        }}
                        className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 text-black font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>فتح معرض الصور والتفاعل</span>
                      </button>
                    </div>
                  )}

                  {/* General / Match Notification Read Receipt Confirmation */}
                  {notif.type !== 'gallery' && !notif.galleryPostId && notif.type !== 'training' && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">تأكيد المتابعة:</span>
                      <button
                        onClick={() => {
                          apiService.trackNotificationOpen(notif.id, {
                            userId: loggedInPlayer?.pin || 'fan',
                            userName: loggedInPlayer?.name || (userRole === 'player' ? 'لاعب' : 'مشجع'),
                          });
                        }}
                        className="text-[10px] bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition active:scale-95"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>تأكيد الاطلاع والقراءة 👀</span>
                      </button>
                    </div>
                  )}

                  {/* Training Notification Action Buttons (Exclusive for Players) */}
                  {notif.type === 'training' && linkedTraining && (
                    <div className="mt-3 pt-2.5 border-t border-amber-500/20 space-y-2">
                      {userRole === 'player' ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-amber-200 font-bold">تسجيل موقفك المباشر:</span>
                            <button
                              type="button"
                              onClick={() => {
                                apiService.trackNotificationOpen(notif.id, {
                                  userId: loggedInPlayer?.pin || 'player',
                                  userName: loggedInPlayer?.name || 'لاعب',
                                });
                                onClose();
                                onOpenTrainingModal(linkedTraining);
                              }}
                              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-bold transition-colors"
                            >
                              انقر هنا لتأكيد حضورك أو الاعتذار 📲
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                apiService.trackNotificationOpen(notif.id, {
                                  userId: loggedInPlayer?.pin || 'player',
                                  userName: loggedInPlayer?.name || 'لاعب',
                                });
                                onClose();
                                onOpenTrainingModal(linkedTraining, 'attend');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1 border border-emerald-400"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تأكيد الحضور ✅</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                apiService.trackNotificationOpen(notif.id, {
                                  userId: loggedInPlayer?.pin || 'player',
                                  userName: loggedInPlayer?.name || 'لاعب',
                                });
                                onClose();
                                onOpenTrainingModal(linkedTraining, 'absent');
                              }}
                              className="bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1 border border-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>اعتذار ❌</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-between text-[11px] text-amber-300 font-semibold bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                          <span>📢 جدول مواعيد التمرين للمتابعة والعلم</span>
                          <button
                            onClick={() => {
                              apiService.trackNotificationOpen(notif.id, {
                                userId: loggedInPlayer?.pin || 'fan',
                                userName: loggedInPlayer?.name || 'مشجع',
                              });
                              onClose();
                              onOpenTrainingModal(linkedTraining);
                            }}
                            className="text-amber-400 underline font-bold"
                          >
                            عرض التفاصيل
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
