import React, { useState, useEffect } from 'react';
import { Match, MatchLiveEvent } from '../types';
import { apiService } from '../services/api';
import { Logo } from './Logo';
import { Trophy, Clock, MapPin, Radio, AlertCircle, RefreshCw, X, Shield, Users, Goal, FileText, ChevronDown, ChevronUp, Heart, Star, Camera, Image as ImageIcon } from 'lucide-react';

interface LiveMatchTickerProps {
  match: Match;
  onClose?: () => void;
}

export const LiveMatchTicker: React.FC<LiveMatchTickerProps> = ({ match: initialMatch, onClose }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'lineups' | 'stats'>('events');
  const [match, setMatch] = useState<Match>(initialMatch);
  const [likedEvents, setLikedEvents] = useState<Record<string, boolean>>({});
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  const userId = typeof window !== 'undefined'
    ? localStorage.getItem('salam_user_device_id') || `user_${Math.random().toString(36).substring(2, 9)}`
    : 'user_1';

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('salam_user_device_id')) {
      try { localStorage.setItem('salam_user_device_id', userId); } catch {}
    }
  }, [userId]);

  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  useEffect(() => {
    if (!initialMatch?.id) return;
    const unsub = apiService.subscribeToMatch(initialMatch.id, (liveMatch) => {
      if (liveMatch) {
        setMatch(liveMatch);
      }
    });
    return () => unsub();
  }, [initialMatch?.id]);

  const liveEvents = match.liveEvents || [];
  const lineup = match.lineup;

  const handleToggleLike = async (eventId: string) => {
    // Optimistic local update
    const currentEvent = liveEvents.find(e => e.id === eventId);
    const currentlyLiked = likedEvents[eventId] || currentEvent?.likedUserIds?.includes(userId);
    const newLiked = !currentlyLiked;

    setLikedEvents(prev => ({ ...prev, [eventId]: newLiked }));
    setMatch(prev => ({
      ...prev,
      liveEvents: prev.liveEvents?.map(ev => {
        if (ev.id === eventId) {
          const count = ev.likesCount || 0;
          return {
            ...ev,
            likesCount: newLiked ? count + 1 : Math.max(0, count - 1),
            likedUserIds: newLiked
              ? [...(ev.likedUserIds || []), userId]
              : (ev.likedUserIds || []).filter(id => id !== userId)
          };
        }
        return ev;
      })
    }));

    try {
      await apiService.likeMatchLiveEvent(match.id, eventId, userId);
    } catch (err) {
      console.warn("Could not toggle like:", err);
    }
  };

  const handleRateEvent = async (eventId: string, rating: number) => {
    setUserRatings(prev => ({ ...prev, [eventId]: rating }));
    setMatch(prev => ({
      ...prev,
      liveEvents: prev.liveEvents?.map(ev => {
        if (ev.id === eventId) {
          const currentRatings = ev.ratings || [];
          const existingIdx = currentRatings.findIndex(r => r.userId === userId);
          const updatedRatings = [...currentRatings];
          if (existingIdx >= 0) {
            updatedRatings[existingIdx] = { userId, rating };
          } else {
            updatedRatings.push({ userId, rating });
          }
          const sum = updatedRatings.reduce((acc, curr) => acc + curr.rating, 0);
          const avg = Math.round((sum / updatedRatings.length) * 10) / 10;
          return {
            ...ev,
            ratings: updatedRatings,
            averageRating: avg,
            totalRatingsCount: updatedRatings.length
          };
        }
        return ev;
      })
    }));

    try {
      await apiService.rateMatchLiveEvent(match.id, eventId, rating, userId);
    } catch (err) {
      console.warn("Could not save rating:", err);
    }
  };

  const getEventIcon = (type: MatchLiveEvent['type']) => {
    switch (type) {
      case 'goal':
        return '⚽';
      case 'yellow_card':
        return '🟨';
      case 'red_card':
        return '🟥';
      case 'sub':
        return '🔄';
      case 'warmup':
        return '🏃‍♂️';
      case 'photo':
        return '📸';
      case 'start':
      case 'whistle':
        return '🟢';
      default:
        return '📢';
    }
  };

  const getEventBadgeClass = (type: MatchLiveEvent['type']) => {
    switch (type) {
      case 'goal':
        return 'bg-emerald-950/80 border-emerald-500 text-emerald-300';
      case 'yellow_card':
        return 'bg-amber-950/80 border-amber-500 text-amber-300';
      case 'red_card':
        return 'bg-red-950/80 border-red-500 text-red-300';
      case 'sub':
        return 'bg-blue-950/80 border-blue-500 text-blue-300';
      case 'warmup':
      case 'photo':
        return 'bg-gradient-to-br from-amber-950/90 to-red-950/90 border-amber-500/80 text-amber-200 shadow-lg';
      case 'start':
      case 'whistle':
        return 'bg-green-950/80 border-green-500 text-green-300';
      default:
        return 'bg-gray-900 border-gray-700 text-gray-300';
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#240e0e] via-[#150808] to-[#0d0404] border-2 border-amber-500/70 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.8)] text-white dir-rtl space-y-4 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-400 to-red-600 animate-pulse" />

      {/* Top Header & Status Bar */}
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-xs font-black text-amber-400 flex items-center gap-1">
            <Radio className="w-4 h-4 text-red-500 animate-pulse" />
            تغطية وبث مباشر لأحداث المباراة
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-red-900/80 text-amber-200 border border-red-500/50 px-3 py-1 rounded-full font-black shadow">
            {match.livePeriod || (match.isLive ? 'جارية الآن' : 'بث مباشر')} {match.liveMinute && `(${match.liveMinute})`}
          </span>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 transition-all"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Scoreboard Horizontal Display */}
      <div className="bg-[#120707] border border-amber-500/40 rounded-2xl p-3.5 shadow-inner relative">
        <div className="text-center text-[11px] text-amber-300/90 font-black mb-2 flex items-center justify-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{match.tournament || 'تغطية المباراة'}</span>
        </div>

        <div className="bg-[#1a0b0b] border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-2 shadow-md">
          {/* Home Team */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400/60 shadow-md flex items-center justify-center overflow-hidden shrink-0 p-0.5">
              {match.homeLogo ? (
                <img src={match.homeLogo} alt={match.homeTeam} className="w-full h-full object-cover rounded-full" />
              ) : (
                <Logo size={46} />
              )}
            </div>
            <span className="text-xs md:text-sm font-black text-white break-words leading-tight">{match.homeTeam}</span>
          </div>

          {/* Live Score Counter */}
          <div className="shrink-0 flex flex-col items-center justify-center px-1">
            <div className="bg-gradient-to-r from-red-950 via-black to-red-950 border-2 border-amber-400 px-4 py-1.5 rounded-xl font-black text-amber-400 text-xl md:text-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] tracking-wider dir-ltr font-mono min-w-[76px] text-center">
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </div>
            <span className="text-[10px] text-red-400 font-extrabold animate-pulse mt-1">
              ● {match.livePeriod || 'مباشر'} {match.liveMinute && `(${match.liveMinute})`}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0 text-left dir-ltr">
            <span className="text-xs md:text-sm font-black text-white break-words leading-tight text-right">{match.awayTeam}</span>
            <div className="w-12 h-12 rounded-full bg-red-950 border-2 border-red-600 flex items-center justify-center shadow-md overflow-hidden shrink-0 p-0.5">
              {match.awayLogo ? (
                <img src={match.awayLogo} alt={match.awayTeam} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-xl font-bold text-amber-400">🛡️</span>
              )}
            </div>
          </div>
        </div>

        {/* Stadium & Referee Info */}
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-around text-[11px] text-gray-300">
          <span className="flex items-center gap-1 text-amber-200">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            {match.stadium || 'الملعب الرئيسي'}
          </span>
          {match.referee && (
            <span className="flex items-center gap-1 text-gray-400">
              الحكم: <strong className="text-white">{match.referee}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Tabs Switcher Inside Match Center */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#170a0a] p-1 rounded-xl border border-amber-500/30">
        <button
          onClick={() => setActiveTab('events')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'events'
              ? 'bg-amber-500 text-black font-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>📜</span> الأحداث والتغطية ({liveEvents.length})
        </button>

        <button
          onClick={() => setActiveTab('lineups')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'lineups'
              ? 'bg-amber-500 text-black font-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>📋</span> تشكيلة الفريقين
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'stats'
              ? 'bg-amber-500 text-black font-black shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>⚽</span> الأهداف والإحصائيات
        </button>
      </div>

      {/* TAB 1: LIVE EVENTS TIMELINE FEED */}
      {activeTab === 'events' && (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {liveEvents.length === 0 ? (
            <div className="text-center py-8 bg-[#120707] rounded-2xl border border-white/5 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs text-gray-400 font-semibold">لم تبدأ الأحداث بعد، يرجى الانتظار لحين بدء التغطية المباشرة من المشرف.</p>
            </div>
          ) : (
            liveEvents.map((ev) => {
              const allImages = (ev.images && ev.images.length > 0)
                ? ev.images
                : ev.imageUrl ? [ev.imageUrl] : [];
              const isLiked = likedEvents[ev.id] || (ev.likedUserIds && ev.likedUserIds.includes(userId));
              const likesCount = ev.likesCount || 0;
              const currentRating = userRatings[ev.id] || (ev.ratings?.find(r => r.userId === userId)?.rating) || 0;
              const avgRating = ev.averageRating || 5.0;
              const ratingsCount = ev.totalRatingsCount || ev.ratings?.length || 0;

              return (
                <div
                  key={ev.id}
                  className={`p-3.5 rounded-2xl border ${getEventBadgeClass(ev.type)} transition-transform shadow-md space-y-2 relative`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getEventIcon(ev.type)}</span>
                      <h4 className="font-extrabold text-xs md:text-sm text-white">{ev.title || 'تحديث مباشر'}</h4>
                    </div>
                    <span className="bg-black/60 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/40 dir-ltr">
                      {ev.minute}
                    </span>
                  </div>

                  <p className="text-xs text-gray-200 leading-relaxed pr-7">{ev.detail}</p>

                  {/* Attached images gallery (single or multi-photo) */}
                  {allImages.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className={`grid gap-2 ${allImages.length === 1 ? 'grid-cols-1' : allImages.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                        {allImages.map((img, imgIdx) => (
                          <div key={imgIdx} className="rounded-xl overflow-hidden border border-amber-500/40 shadow-md bg-black/60 aspect-video relative group">
                            <img
                              src={img}
                              alt={`لقطة ${imgIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                              onClick={() => {
                                if (typeof window !== 'undefined') window.open(img, '_blank');
                              }}
                            />
                            <div className="absolute bottom-1 right-1 bg-black/70 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded backdrop-blur-sm">
                              📷 صورة {imgIdx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Event specific metadata */}
                  {(ev.playerName || ev.playerOut || ev.playerIn) && (
                    <div className="pt-1 text-[11px] text-amber-300 font-bold flex items-center gap-2 border-t border-white/10">
                      {ev.type === 'sub' ? (
                        <span>🔄 التبديل: خروج ({ev.playerOut || 'اللاعب'}) ⬅️ دخول ({ev.playerIn || 'اللاعب البديل'})</span>
                      ) : (
                        <span>👤 اللاعب: {ev.playerName} {ev.team && `(${ev.team === 'home' ? match.homeTeam : match.awayTeam})`}</span>
                      )}
                    </div>
                  )}

                  {/* ❤️ INTERACTIVE LIKES & ⭐ STAR RATINGS BAR */}
                  <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap text-xs">
                    {/* Like Heart Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleLike(ev.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer ${
                        isLiked
                          ? 'bg-red-600/30 text-red-400 border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500 animate-bounce' : 'text-gray-400'}`} />
                      <span>{likesCount > 0 ? `${likesCount} إعجاب` : 'إعجاب'}</span>
                    </button>

                    {/* 5-Star Interactive Rating */}
                    <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-xl border border-amber-500/30">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRateEvent(ev.id, star)}
                            className="p-0.5 hover:scale-125 transition-transform cursor-pointer"
                            title={`تقييم ${star} نجوم`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                star <= (currentRating || Math.round(avgRating))
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-amber-300">
                        {avgRating} {ratingsCount > 0 && `(${ratingsCount})`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: STARTING XI AND SUBSTITUTES LINEUPS */}
      {activeTab === 'lineups' && (
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {!lineup ? (
            <div className="text-center py-8 bg-[#120707] rounded-2xl border border-white/5">
              <p className="text-xs text-gray-400">لم يتم إدخال التشكيلة الرسمية للمباراة بعد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Home Lineup */}
              <div className="bg-[#180b0b] border border-amber-500/40 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2 border-b border-amber-500/30 pb-2">
                  <Logo size={24} />
                  <h4 className="font-extrabold text-amber-400 text-xs">{match.homeTeam}</h4>
                </div>

                <div>
                  <h5 className="text-[11px] font-extrabold text-white mb-1">الفئة الأساسية (11 لاعب):</h5>
                  <div className="space-y-1">
                    {lineup.homeStarting.map((player, idx) => (
                      <div key={idx} className="bg-black/40 text-gray-200 text-[11px] px-2.5 py-1 rounded-lg border border-white/5 flex items-center justify-between">
                        <span>{player}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {lineup.homeSubs && lineup.homeSubs.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <h5 className="text-[11px] font-extrabold text-amber-300 mb-1">دكة البدلاء:</h5>
                    <div className="space-y-1">
                      {lineup.homeSubs.map((sub, idx) => (
                        <div key={idx} className="bg-black/30 text-gray-300 text-[10px] px-2.5 py-0.5 rounded-md">
                          {sub}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Away Lineup */}
              <div className="bg-[#180b0b] border border-red-800/50 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2 border-b border-red-800/30 pb-2">
                  <span className="text-lg">🛡️</span>
                  <h4 className="font-extrabold text-amber-400 text-xs">{match.awayTeam}</h4>
                </div>

                <div>
                  <h5 className="text-[11px] font-extrabold text-white mb-1">الفئة الأساسية (11 لاعب):</h5>
                  <div className="space-y-1">
                    {lineup.awayStarting.map((player, idx) => (
                      <div key={idx} className="bg-black/40 text-gray-200 text-[11px] px-2.5 py-1 rounded-lg border border-white/5 flex items-center justify-between">
                        <span>{player}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {lineup.awaySubs && lineup.awaySubs.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <h5 className="text-[11px] font-extrabold text-amber-300 mb-1">دكة البدلاء:</h5>
                    <div className="space-y-1">
                      {lineup.awaySubs.map((sub, idx) => (
                        <div key={idx} className="bg-black/30 text-gray-300 text-[10px] px-2.5 py-0.5 rounded-md">
                          {sub}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GOALS & MATCH SUMMARY */}
      {activeTab === 'stats' && (
        <div className="bg-[#150a0a] border border-amber-500/30 rounded-2xl p-4 space-y-3">
          <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5 border-b border-white/10 pb-2">
            <span>⚽</span> ملخص مسجلي الأهداف في المباراة:
          </h4>

          {liveEvents.filter(e => e.type === 'goal').length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">لم يتم تسجيل أهداف حتى الآن.</p>
          ) : (
            <div className="space-y-2">
              {liveEvents
                .filter(e => e.type === 'goal')
                .map((goal, idx) => (
                  <div key={idx} className="bg-black/50 p-2.5 rounded-xl border border-amber-500/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚽</span>
                      <div>
                        <span className="font-black text-white">{goal.playerName || 'هدف'}</span>
                        <p className="text-[10px] text-gray-400">{goal.detail}</p>
                      </div>
                    </div>
                    <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg font-bold text-[11px]">
                      الدقيقة ({goal.minute})
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
