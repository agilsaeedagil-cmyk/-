import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, Clock, ArrowLeft, Flame, KeyRound, Info, Radio, CheckCircle2, XCircle, X, Camera, Image as ImageIcon } from 'lucide-react';
import { Match, NewsItem, TrainingSession, AttendanceResponse } from '../types';
import { Logo } from './Logo';
import { formatArabicFullDate, getMatchCountdown, MatchCountdown } from '../utils/dateUtils';
import { apiService, recordDeletedTrainingSession, recordDeletedNotification, getDeletedIds } from '../services/api';

interface HomeViewProps {
  news: NewsItem[];
  upcomingMatch?: Match;
  activeTraining?: TrainingSession;
  onSelectNews: (item: NewsItem) => void;
  onNavigateTab: (tab: string) => void;
  onOpenTrainingModal: (choice?: 'attend' | 'absent') => void;
  onOpenMatchDetail?: (match: Match) => void;
  userRole?: 'player' | 'fan';
  loggedInPlayer?: any;
  onOpenPlayerLogin?: () => void;
  attendanceResponses?: AttendanceResponse[];
  respondedSessionIds?: string[];
  onAttendanceSubmitted?: (sessionId?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  news,
  upcomingMatch,
  activeTraining,
  onSelectNews,
  onNavigateTab,
  onOpenTrainingModal,
  onOpenMatchDetail,
  userRole = 'fan',
  loggedInPlayer,
  onOpenPlayerLogin,
  attendanceResponses = [],
  respondedSessionIds = [],
  onAttendanceSubmitted,
}) => {
  const [currentNewsIdx, setCurrentNewsIdx] = useState(0);
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);
  const [isTrainingBannerDismissed, setIsTrainingBannerDismissed] = useState<boolean>(() => {
    try {
      if (!activeTraining?.id) return true;
      const cleanId = String(activeTraining.id).trim();
      if (sessionStorage.getItem(`salam_dismissed_training_${cleanId}`) === 'true') return true;
      const trainDeleted = getDeletedIds('training_sessions');
      const notifDeleted = getDeletedIds('notifications');
      const exSet = new Set([...trainDeleted, ...notifDeleted, 'train-1', 'notif-1']);
      if (exSet.has(cleanId)) return true;
      const text = `${activeTraining.title || ''} ${activeTraining.location || ''} ${activeTraining.note || ''}`;
      if (text.includes('تمرين ياشباب') || text.includes('ملعب السلام بكثيبة')) return true;
    } catch {}
    return false;
  });

  useEffect(() => {
    if (!activeTraining?.id) return;
    try {
      const cleanId = String(activeTraining.id).trim();
      if (sessionStorage.getItem(`salam_dismissed_training_${cleanId}`) === 'true') {
        setIsTrainingBannerDismissed(true);
        return;
      }
      const trainDeleted = getDeletedIds('training_sessions');
      const notifDeleted = getDeletedIds('notifications');
      const exSet = new Set([...trainDeleted, ...notifDeleted, 'train-1', 'notif-1']);
      if (exSet.has(cleanId)) {
        setIsTrainingBannerDismissed(true);
      }
    } catch {}
  }, [activeTraining?.id]);

  const handleDismissTrainingBanner = () => {
    setIsTrainingBannerDismissed(true);
    if (activeTraining?.id) {
      const cleanId = String(activeTraining.id).trim();
      try {
        sessionStorage.setItem(`salam_dismissed_training_${cleanId}`, 'true');
      } catch {}
    }
  };

  // Find response of current logged-in player
  const playerResponse = attendanceResponses.find((resp) => {
    if (!activeTraining?.id || resp.sessionId !== activeTraining.id) return false;
    if (loggedInPlayer?.id && resp.playerId === loggedInPlayer.id) return true;
    if (loggedInPlayer?.name && resp.playerName) {
      const p1 = loggedInPlayer.name.trim().toLowerCase();
      const p2 = resp.playerName.trim().toLowerCase();
      if (p1 === p2 || p1.includes(p2) || p2.includes(p1)) return true;
    }
    return false;
  });

  const hasRespondedToTraining = Boolean(
    activeTraining && (respondedSessionIds.includes(activeTraining.id) || playerResponse)
  );
  const isAttending = playerResponse ? playerResponse.attending === true : (activeTraining ? respondedSessionIds.includes(activeTraining.id) : false);
  const isApologized = playerResponse ? playerResponse.attending === false : false;

  const handleQuickAttend = async () => {
    if (!activeTraining) return;
    setIsQuickSubmitting(true);
    try {
      await apiService.submitAttendanceResponse({
        sessionId: activeTraining.id,
        playerId: loggedInPlayer?.id,
        playerName: loggedInPlayer?.name || 'لاعب الفريق',
        attending: true,
      });
      if (onAttendanceSubmitted) {
        onAttendanceSubmitted(activeTraining.id);
      }
    } catch {
      onOpenTrainingModal('attend');
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  // Live Countdown State
  const [countdown, setCountdown] = useState<MatchCountdown>({
    isStarted: false,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // News Carousel Timer
  useEffect(() => {
    if (news.length === 0) return;
    const interval = setInterval(() => {
      setCurrentNewsIdx((prev) => (prev + 1) % news.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [news.length]);

  // Real-time Countdown Timer calculation (Asia/Aden timezone UTC+3)
  useEffect(() => {
    if (!upcomingMatch?.date) return;

    const updateTimer = () => {
      const res = getMatchCountdown(upcomingMatch.date, upcomingMatch.time);
      setCountdown(res);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [upcomingMatch?.date, upcomingMatch?.time]);

  const activeNews = news[currentNewsIdx] || news[0];

  return (
    <div dir="rtl" className="space-y-5 pb-8 px-4 text-white">
      {/* 🇧🇹 Active Training Session Card (Directly Below Stats Bar) */}
      {activeTraining && !isTrainingBannerDismissed && (
        <section 
          id="training-session-card" 
          aria-label="إشعار التمرين الرسمي"
          className="relative bg-gradient-to-b from-[#2e0909] via-[#1a0808] to-[#120505] border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-amber-400/30 overflow-hidden text-right"
        >
          {/* Subtle Ambient Watermark */}
          <div className="absolute -left-6 -bottom-6 opacity-10 pointer-events-none select-none">
            <Logo size={140} />
          </div>

          {/* Top Header Row */}
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-black px-3 py-1 rounded-full shadow-md select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-700"></span>
                </span>
                <span>🇧🇹 إشعار تمرين رسمي</span>
              </span>
              {activeTraining.time && (
                <span className="inline-flex items-center gap-1 bg-black/50 text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{activeTraining.time}</span>
                </span>
              )}
            </div>

            {/* Dismiss Card Button (X) */}
            <button
              type="button"
              onClick={handleDismissTrainingBanner}
              className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-gray-300 hover:text-amber-300 border border-white/10 hover:border-amber-500/50 shrink-0 transition-transform active:scale-90 cursor-pointer"
              title="إخفاء الإشعار"
              aria-label="إخفاء الإشعار"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Training Title (No text truncation) */}
          <div className="mt-3 relative z-10 space-y-2">
            <h3 className="font-black text-white text-base sm:text-lg leading-snug break-words text-wrap">
              {activeTraining.title.replace(/^🇧🇹\s*/, '')}
            </h3>

            {/* Chips Row: Date & Location */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-200">
              {activeTraining.date && (
                <div className="inline-flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10 text-gray-200">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold">{activeTraining.date}</span>
                </div>
              )}
              {activeTraining.location && (
                <div className="inline-flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10 text-gray-200">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold">{activeTraining.location}</span>
                </div>
              )}
            </div>

            {/* Full Coach Notes Box (No line clamps or truncation) */}
            {activeTraining.note && (
              <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 sm:p-3.5 border border-amber-500/40 text-amber-100 text-xs sm:text-sm mt-2.5 space-y-1.5 break-words text-wrap shadow-inner">
                <span className="font-black text-amber-400 flex items-center gap-1.5 text-xs">
                  <span>📝</span>
                  <span>توجيهات وملاحظات الجهاز الفني:</span>
                </span>
                <p className="leading-relaxed whitespace-pre-line break-words text-wrap text-amber-100/95 font-medium">
                  {activeTraining.note}
                </p>
              </div>
            )}
          </div>

          {/* Interactive Attendance Actions / Status Section */}
          <div className="mt-4 pt-3 border-t border-amber-500/30 relative z-10">
            {userRole === 'player' ? (
              hasRespondedToTraining ? (
                /* Player Already Responded Status */
                <div className="bg-black/50 rounded-xl p-3 border border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    {isAttending ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-emerald-300">
                          ✅ تم تأكيد حضورك بنجاح في هذا التمرين
                        </span>
                      </>
                    ) : isApologized ? (
                      <>
                        <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-red-300">
                          ❌ تم تسجيل اعتذارك عن هذا التمرين
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-amber-300">
                          تم تسجيل موقفك في سجل التمرين
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTrainingModal()}
                    className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold px-3 py-1.5 rounded-lg border border-amber-500/40 transition-transform active:scale-95 cursor-pointer"
                  >
                    تعديل الرد
                  </button>
                </div>
              ) : (
                /* Player Pending Response Buttons */
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-amber-200 font-bold">
                    ⚽ أهلاً كابتن {loggedInPlayer?.name || 'اللاعب'}: يرجى تسجيل موقفك من الحضور:
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={isQuickSubmitting}
                      onClick={handleQuickAttend}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm py-2.5 px-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5 border border-emerald-400 cursor-pointer min-h-[44px]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                      <span>{isQuickSubmitting ? 'جاري الحفظ...' : 'تأكيد الحضور ✅'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTrainingModal('absent')}
                      className="bg-red-700 hover:bg-red-600 text-white font-black text-xs sm:text-sm py-2.5 px-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5 border border-red-400 cursor-pointer min-h-[44px]"
                    >
                      <XCircle className="w-4 h-4 text-red-200 shrink-0" />
                      <span>اعتذار عن التمرين ❌</span>
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* Fan / Guest Mode */
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs text-amber-200">
                <span className="flex items-center gap-1.5 font-bold">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>📢 إشعار رسمي خاص بلاعبي الفريق والجماهير للمتابعة</span>
                </span>
                {onOpenPlayerLogin && (
                  <button
                    type="button"
                    onClick={onOpenPlayerLogin}
                    className="bg-amber-500 text-black hover:bg-amber-400 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-transform active:scale-95 shadow cursor-pointer min-h-[38px]"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>دخول اللاعبين لتأكيد الحضور</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured News Carousel Banner */}
      {activeNews && (
        <div 
          onClick={() => onSelectNews(activeNews)}
          className="relative bg-[#1e1b1b] rounded-2xl overflow-hidden border border-red-900/40 hover:border-red-600/80 transition-all shadow-lg cursor-pointer group"
        >
          <div className="relative h-48 w-full">
            <img
              src={activeNews.image}
              alt={activeNews.title}
              className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            
            {/* Category Tag */}
            <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-md shadow-md">
              {activeNews.category}
            </div>

            {/* News Content */}
            <div className="absolute bottom-3 right-3 left-3 space-y-1">
              <h2 className="text-base font-extrabold text-white line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
                {activeNews.title}
              </h2>
              <p className="text-xs text-gray-300 line-clamp-1">{activeNews.content}</p>
            </div>
          </div>

          {/* Pagination Indicators */}
          <div className="flex items-center justify-center gap-1.5 py-2.5 bg-[#141212]">
            {news.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentNewsIdx(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentNewsIdx ? 'w-6 bg-red-500' : 'w-2 bg-gray-600'
                }`}
                aria-label={`الشريحة ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Next Match / Live Match Card */}
      {upcomingMatch ? (
        <div className={`rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.7)] relative overflow-hidden space-y-3 border-2 transition-all ${
          upcomingMatch.isLive
            ? 'bg-gradient-to-b from-[#3b0808] via-[#200808] to-[#120404] border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.35)]'
            : 'bg-gradient-to-b from-[#2e0e0e] via-[#1a0808] to-[#100505] border-amber-500/50'
        }`}>
          {/* Decorative Top Line */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${
            upcomingMatch.isLive
              ? 'bg-gradient-to-r from-red-600 via-amber-400 to-red-600 animate-pulse'
              : 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500'
          }`} />

          {/* Header & Status Indicator */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              {upcomingMatch.isLive ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              ) : (
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
              )}

              <h3 className="font-black text-sm md:text-base text-amber-400 flex items-center gap-1.5 drop-shadow-sm">
                {upcomingMatch.isLive ? (
                  <span className="text-red-400 flex items-center gap-1 font-black">
                    <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                    تغطية وبث حي ومباشر الآن
                  </span>
                ) : (
                  <span>⚽ المباراة القادمة</span>
                )}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              {upcomingMatch.isLive && (
                <span className="text-[10px] bg-red-600 text-white px-2.5 py-0.5 rounded-full font-black animate-pulse shadow">
                  {upcomingMatch.livePeriod || 'مباشر'} {upcomingMatch.liveMinute && `• ${upcomingMatch.liveMinute}`}
                </span>
              )}
              <span className="text-[11px] bg-gradient-to-r from-amber-500/20 to-yellow-500/30 text-amber-300 border border-amber-400/50 px-2.5 py-0.5 rounded-full font-black shadow-md">
                {upcomingMatch.tournament || 'بطولة الفريق الأول'}
              </span>
            </div>
          </div>

          {/* Teams versus Layout */}
          <div className="flex items-center justify-between my-2 px-2">
            {/* Home Team */}
            <div className="flex flex-col items-center space-y-1 text-center w-5/12 min-w-0">
              <div className="w-13 h-13 rounded-full bg-amber-500/20 border-2 border-amber-400/40 shadow-md flex items-center justify-center overflow-hidden p-0.5 shrink-0">
                {upcomingMatch.homeLogo ? (
                  <img src={upcomingMatch.homeLogo} alt={upcomingMatch.homeTeam} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Logo size={48} />
                )}
              </div>
              <span className="text-xs font-black text-white mt-1 break-words leading-tight">
                {upcomingMatch.homeTeam}
              </span>
            </div>

            {/* Score or VS Badge */}
            <div className="flex flex-col items-center justify-center">
              {upcomingMatch.isLive ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-black/90 border-2 border-amber-400 px-3.5 py-1.5 rounded-2xl font-black text-amber-400 text-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] dir-ltr tracking-widest">
                    {upcomingMatch.homeScore ?? 0} - {upcomingMatch.awayScore ?? 0}
                  </div>
                  <span className="text-[9px] text-red-300 font-black">
                    ● {upcomingMatch.livePeriod || 'جارية الآن'} {upcomingMatch.liveMinute && `(${upcomingMatch.liveMinute})`}
                  </span>
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center font-black text-black text-sm shadow-[0_0_15px_rgba(245,158,11,0.6)] border-2 border-amber-200">
                  VS
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center space-y-1 text-center w-5/12 min-w-0">
              <div className="w-13 h-13 rounded-full bg-red-950/90 border-2 border-red-600 flex items-center justify-center shadow-md overflow-hidden p-0.5 shrink-0">
                {upcomingMatch.awayLogo ? (
                  <img src={upcomingMatch.awayLogo} alt={upcomingMatch.awayTeam} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-xl font-bold text-amber-400">🛡️</span>
                )}
              </div>
              <span className="text-xs font-black text-white mt-1 break-words leading-tight">
                {upcomingMatch.awayTeam}
              </span>
            </div>
          </div>

          {/* Latest Live Event Ticker (if match is Live or has recent events/warmup photos) */}
          {upcomingMatch.liveEvents && upcomingMatch.liveEvents.length > 0 && (
            <div className="bg-[#180808] p-2.5 rounded-xl border border-red-500/40 text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between text-amber-300 font-extrabold text-[11px]">
                <span className="flex items-center gap-1">
                  <span>⚡</span> آخر أحداث وتغطية المباراة:
                </span>
                <span className="text-amber-400 text-[10px] bg-black/50 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {upcomingMatch.liveEvents[0].minute || 'مباشر'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                {upcomingMatch.liveEvents[0].imageUrl && (
                  <img
                    src={upcomingMatch.liveEvents[0].imageUrl}
                    alt="صورة التغطية"
                    className="w-12 h-10 object-cover rounded-lg border border-amber-400/50 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-amber-100 font-bold leading-snug break-words">
                    {upcomingMatch.liveEvents[0].title} — {upcomingMatch.liveEvents[0].detail}
                  </p>
                  {(upcomingMatch.liveEvents[0].likesCount !== undefined && upcomingMatch.liveEvents[0].likesCount > 0) && (
                    <span className="text-[10px] text-red-400 font-black mt-0.5 inline-block">
                      ❤️ {upcomingMatch.liveEvents[0].likesCount} إعجاب
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Match Details info */}
          <div className="bg-[#120707] rounded-xl p-2 text-xs text-gray-300 border border-amber-500/25">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-extrabold flex-wrap text-center">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-amber-200 font-black">
                {upcomingMatch.date ? formatArabicFullDate(upcomingMatch.date) : 'قريباً'}
              </span>
              {upcomingMatch.stadium && (
                <>
                  <span className="text-amber-500/60">•</span>
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{upcomingMatch.stadium}</span>
                </>
              )}
              {upcomingMatch.time && (
                <>
                  <span className="text-amber-500/60">•</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{upcomingMatch.time}</span>
                </>
              )}
            </div>
          </div>

          {/* Live Countdown Clock Box or Started Status */}
          {upcomingMatch.isLive ? (
            <button
              type="button"
              onClick={() => {
                if (onOpenMatchDetail) onOpenMatchDetail(upcomingMatch);
                else onNavigateTab('matches');
              }}
              className="w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-white font-black text-xs md:text-sm py-3 px-4 rounded-xl border border-amber-400 shadow-xl text-center flex items-center justify-center gap-2 animate-pulse cursor-pointer transition-transform active:scale-98"
            >
              <Radio className="w-4 h-4 text-white animate-ping" />
              <span>🔴 دخول البث والمتابعة الحية للمباراة</span>
            </button>
          ) : countdown.isStarted ? (
            <div className="space-y-2">
              <div className="bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 text-white font-black text-sm p-3 rounded-xl border border-amber-400 shadow-lg text-center flex items-center justify-center gap-2">
                <span>⚽ موعد المباراة حان الآن - بانتظار صافرة البداية</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onOpenMatchDetail) onOpenMatchDetail(upcomingMatch);
                  else onNavigateTab('matches');
                }}
                className="w-full bg-[#1e0a0a] hover:bg-[#2a0e0e] text-amber-300 font-bold text-xs py-2 rounded-xl border border-amber-500/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>📜 استعراض تفاصيل وتشكيلة المباراة</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-center text-xs font-black text-amber-300 flex items-center justify-center gap-1.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <span>⏳ باقي على انطلاق المباراة</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center bg-[#0a0404] p-3 rounded-xl border border-amber-500/30">
                <div className="bg-gradient-to-b from-[#220a0a] to-[#120505] rounded-lg p-1.5 border border-amber-500/30 shadow-md">
                  <span className="block text-lg font-black text-amber-400">
                    {String(countdown.days).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-amber-200/80 font-bold">يوم</span>
                </div>
                <div className="bg-gradient-to-b from-[#220a0a] to-[#120505] rounded-lg p-1.5 border border-amber-500/30 shadow-md">
                  <span className="block text-lg font-black text-amber-400">
                    {String(countdown.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-amber-200/80 font-bold">ساعة</span>
                </div>
                <div className="bg-gradient-to-b from-[#220a0a] to-[#120505] rounded-lg p-1.5 border border-amber-500/30 shadow-md">
                  <span className="block text-lg font-black text-amber-400">
                    {String(countdown.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-amber-200/80 font-bold">دقيقة</span>
                </div>
                <div className="bg-gradient-to-b from-[#220a0a] to-[#120505] rounded-lg p-1.5 border border-amber-500/30 shadow-md">
                  <span className="block text-lg font-black text-red-400 animate-pulse">
                    {String(countdown.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-red-200/80 font-bold">ثانية</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onOpenMatchDetail) onOpenMatchDetail(upcomingMatch);
                  else onNavigateTab('matches');
                }}
                className="w-full bg-[#1a0808] hover:bg-[#260c0c] text-amber-300 font-bold text-xs py-2 rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>📜 استعراض تفاصيل وتشكيلة المباراة</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#180a0a] border border-amber-500/30 rounded-2xl p-6 text-center text-gray-300 space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-amber-400 text-sm">لا توجد مباراة قادمة حالياً</h3>
            <p className="text-xs text-gray-400 mt-1">سيتم نشر تفاصيل المباراة التالية فور اعتمادها من ادارة فريق السلام</p>
          </div>
        </div>
      )}

      {/* Achievements Banner Section */}
      <div className="bg-[#1c1818] border border-amber-500/30 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-white text-base">الإنجازات والبطولات</h3>
          </div>
          <button
            onClick={() => onNavigateTab('news')}
            className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
          >
            عرض الكل
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs text-amber-300/80 mb-3 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
          📌 سيتم تدوين كافة انجازات الفريق مند بداية التاسيس.
        </p>

        {/* Latest Highlights Feed */}
        <div className="space-y-2.5">
          {news.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400 font-semibold bg-[#120a0a] rounded-xl border border-white/5">
              لا توجد أخبار منشورة حالياً
            </div>
          ) : (
            news.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectNews(item)}
                className="bg-[#141212] hover:bg-[#252020] p-3 rounded-xl border border-white/5 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-900/40 border border-red-700/40 flex items-center justify-center flex-shrink-0 text-red-400">
                    📰
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                    <span className="text-[10px] text-amber-400 font-semibold">{item.category}</span>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
