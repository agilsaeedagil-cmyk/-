import React, { useState, useEffect } from 'react';
import { Match, MatchArchiveCard } from '../types';
import { Logo } from './Logo';
import { Calendar, MapPin, Clock, Trophy, Radio, AlertCircle, Layers, FileText, Star, User, Image as ImageIcon, ChevronRight, X, Sparkles, RefreshCw } from 'lucide-react';
import { LiveMatchTicker } from './LiveMatchTicker';
import { formatArabicFullDate } from '../utils/dateUtils';
import { apiService, getLocalCache } from '../services/api';

interface MatchesViewProps {
  matches: Match[];
  archiveCards?: MatchArchiveCard[];
}

export const MatchesView: React.FC<MatchesViewProps> = ({ matches, archiveCards: propArchiveCards }) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'archive'>('upcoming');
  const [selectedLiveMatch, setSelectedLiveMatch] = useState<Match | null>(null);
  const [selectedArchiveDetail, setSelectedArchiveDetail] = useState<MatchArchiveCard | null>(null);
  const [archiveList, setArchiveList] = useState<MatchArchiveCard[]>(() => 
    propArchiveCards || getLocalCache<MatchArchiveCard[]>('match_archive', [])
  );
  const [isRefreshingArchive, setIsRefreshingArchive] = useState(false);

  useEffect(() => {
    const unsub = apiService.subscribeToMatchArchive((cards) => {
      if (Array.isArray(cards)) {
        setArchiveList(cards);
      }
    });
    return () => unsub();
  }, []);

  const handleRefreshArchive = async () => {
    setIsRefreshingArchive(true);
    try {
      const cards = await apiService.getMatchArchive();
      setArchiveList(cards);
    } catch {}
    finally {
      setIsRefreshingArchive(false);
    }
  };

  const upcomingMatches = matches.filter((m) => m.isUpcoming);
  const pastMatches = matches.filter((m) => !m.isUpcoming);

  const liveMatchToDisplay = selectedLiveMatch
    ? matches.find((m) => m.id === selectedLiveMatch.id) || selectedLiveMatch
    : null;

  return (
    <div className="space-y-4 pb-8 px-4 text-white dir-rtl">
      {/* Modal Live Ticker Viewer */}
      {liveMatchToDisplay && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <LiveMatchTicker match={liveMatchToDisplay} onClose={() => setSelectedLiveMatch(null)} />
          </div>
        </div>
      )}

      {/* Modal Detailed Match Archive Card */}
      {selectedArchiveDetail && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1b1111] border-2 border-amber-500/80 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl text-white dir-rtl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-950 via-amber-950 to-red-950 p-4 border-b border-amber-500/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-sm text-amber-300">بطاقة التقرير السحابي والأرشيف الرسمي</h3>
                  <span className="text-[10px] text-gray-300 font-bold">{selectedArchiveDetail.season || 'الموسم الرياضي'} • {selectedArchiveDetail.tournament}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedArchiveDetail(null)}
                className="p-1 rounded-full bg-black/50 hover:bg-black/80 text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Scoreboard Card */}
              <div className="bg-[#100808] border border-amber-500/40 rounded-2xl p-3.5 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">{selectedArchiveDetail.tournament}</span>
                  <span
                    className={`text-[10px] font-extrabold px-3 py-0.5 rounded-full ${
                      selectedArchiveDetail.badgeType === 'فوز'
                        ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-500/60 shadow'
                        : selectedArchiveDetail.badgeType === 'تعادل'
                        ? 'bg-amber-900/90 text-amber-200 border border-amber-500/60 shadow'
                        : 'bg-red-900/90 text-red-200 border border-red-500/60 shadow'
                    }`}
                  >
                    {selectedArchiveDetail.badgeType || 'نتيجة المباراة'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center overflow-hidden shrink-0 p-0.5 shadow">
                      {selectedArchiveDetail.homeLogo ? (
                        <img src={selectedArchiveDetail.homeLogo} alt={selectedArchiveDetail.homeTeam} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Logo size={40} />
                      )}
                    </div>
                    <span className="text-xs font-black text-white break-words">{selectedArchiveDetail.homeTeam}</span>
                  </div>

                  <div className="shrink-0 bg-[#221010] border-2 border-amber-400/80 px-4 py-1.5 rounded-xl font-black text-amber-300 text-lg font-mono shadow-inner dir-ltr tracking-wider text-center">
                    {selectedArchiveDetail.homeScore} - {selectedArchiveDetail.awayScore}
                  </div>

                  <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-left dir-ltr">
                    <span className="text-xs font-black text-white break-words text-right">{selectedArchiveDetail.awayTeam}</span>
                    <div className="w-11 h-11 rounded-full bg-red-950 border border-red-600 flex items-center justify-center text-base shrink-0 overflow-hidden p-0.5 shadow">
                      {selectedArchiveDetail.awayLogo ? (
                        <img src={selectedArchiveDetail.awayLogo} alt={selectedArchiveDetail.awayTeam} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span>🛡️</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1 text-amber-300 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {formatArabicFullDate(selectedArchiveDetail.date)}
                  </span>
                  {selectedArchiveDetail.stadium && (
                    <span className="flex items-center gap-1 text-gray-300">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      {selectedArchiveDetail.stadium}
                    </span>
                  )}
                </div>
              </div>

              {/* Comprehensive Summary Report */}
              {selectedArchiveDetail.summaryReport && (
                <div className="bg-[#120a0a] border border-red-900/40 rounded-2xl p-3.5 space-y-2">
                  <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                    <FileText className="w-3.5 h-3.5" /> التقرير الفني والإعلامي الشامل:
                  </h4>
                  <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-line">
                    {selectedArchiveDetail.summaryReport}
                  </p>
                </div>
              )}

              {/* Goal Scorers */}
              {selectedArchiveDetail.goalsSummary && selectedArchiveDetail.goalsSummary.length > 0 && (
                <div className="bg-[#120a0a] border border-red-900/40 rounded-2xl p-3.5 space-y-2">
                  <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                    <span>⚽</span> سجل وأهداف المباراة:
                  </h4>
                  <div className="space-y-1">
                    {selectedArchiveDetail.goalsSummary.map((goal, idx) => (
                      <div key={idx} className="bg-black/40 border border-white/5 p-2 rounded-xl text-amber-200 flex items-center gap-2 font-bold">
                        <span>⚽</span> {goal}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Match Highlights / Stats Grid */}
              {selectedArchiveDetail.stats && (
                <div className="bg-[#120a0a] border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5">
                  <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                    <span>📊</span> إحصائيات المباراة والأرقام:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    {selectedArchiveDetail.stats.possession && (
                      <div className="bg-black/50 border border-white/5 p-2 rounded-xl">
                        <span className="text-[10px] text-gray-400 block">الاستحواذ</span>
                        <span className="font-extrabold text-amber-300">{selectedArchiveDetail.stats.possession}</span>
                      </div>
                    )}
                    {selectedArchiveDetail.stats.shotsOnTarget !== undefined && (
                      <div className="bg-black/50 border border-white/5 p-2 rounded-xl">
                        <span className="text-[10px] text-gray-400 block">التسديدات للمرمى</span>
                        <span className="font-extrabold text-emerald-400">{selectedArchiveDetail.stats.shotsOnTarget}</span>
                      </div>
                    )}
                    {selectedArchiveDetail.stats.corners !== undefined && (
                      <div className="bg-black/50 border border-white/5 p-2 rounded-xl">
                        <span className="text-[10px] text-gray-400 block">الركنيات</span>
                        <span className="font-extrabold text-blue-400">{selectedArchiveDetail.stats.corners}</span>
                      </div>
                    )}
                    {selectedArchiveDetail.stats.yellowCards !== undefined && (
                      <div className="bg-black/50 border border-white/5 p-2 rounded-xl">
                        <span className="text-[10px] text-gray-400 block">البطاقات</span>
                        <span className="font-extrabold text-yellow-400">{selectedArchiveDetail.stats.yellowCards} 🟨</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Extra Info: Top Player, Coach Notes & Referee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedArchiveDetail.topPlayer && (
                  <div className="bg-[#120a0a] border border-amber-500/30 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400" /> رجل المباراة (الأفضل):
                    </span>
                    <p className="text-xs font-black text-white">{selectedArchiveDetail.topPlayer}</p>
                  </div>
                )}
                {selectedArchiveDetail.referee && (
                  <div className="bg-[#120a0a] border border-white/10 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" /> حكم اللقاء:
                    </span>
                    <p className="text-xs font-bold text-white">{selectedArchiveDetail.referee}</p>
                  </div>
                )}
              </div>

              {selectedArchiveDetail.coachNotes && (
                <div className="bg-[#120a0a] border border-red-900/40 rounded-2xl p-3 space-y-1">
                  <span className="text-[10px] text-red-400 font-bold block">ملاحظات الجهاز الفني والمدرب:</span>
                  <p className="text-xs text-gray-300 leading-relaxed">{selectedArchiveDetail.coachNotes}</p>
                </div>
              )}

              {/* Images Gallery */}
              {selectedArchiveDetail.images && selectedArchiveDetail.images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> صور المباراة من الأرشيف ({selectedArchiveDetail.images.length}):
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedArchiveDetail.images.map((img, idx) => (
                      <img key={idx} src={img} alt="صورة الأرشيف" className="w-full h-32 object-cover rounded-xl border border-amber-500/30 shadow" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Title */}
      <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <span>⚽</span> المباريات والتغطية والأرشيف
        </h2>
        {activeTab === 'archive' && (
          <button
            onClick={handleRefreshArchive}
            disabled={isRefreshingArchive}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingArchive ? 'animate-spin' : ''}`} />
            تحديث الأرشيف
          </button>
        )}
      </div>

      {/* 3 Tabs Selector */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#1c1616] p-1 rounded-xl border border-red-900/40 text-center">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'upcoming'
              ? 'bg-red-600 text-white shadow-md font-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          القادمة والمباشرة ({upcomingMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'past'
              ? 'bg-red-600 text-white shadow-md font-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          النتائج السابقة ({pastMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'archive'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md font-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🏆 الأرشيف والتقارير ({archiveList.length})
        </button>
      </div>

      {/* Upcoming & Live Matches Tab */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingMatches.length === 0 ? (
            <div className="text-center py-10 bg-[#171212] rounded-2xl border border-white/5 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs text-gray-400 font-semibold">سيتم نشر تفاصيل المباراة التالية فور اعتمادها من ادارة فريق السلام</p>
            </div>
          ) : (
            upcomingMatches.map((match) => (
              <div
                key={match.id}
                className={`bg-gradient-to-b from-[#241313] to-[#170e0e] border-2 ${
                  match.isLive ? 'border-red-600 shadow-[0_0_25px_rgba(239,68,68,0.3)]' : 'border-red-800/60'
                } rounded-2xl p-4 shadow-xl space-y-3 relative`}
              >
                {/* Tournament Badge Header */}
                <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    {match.tournament || 'مباراة ودية'}
                  </span>

                  {match.isLive && (
                    <span className="bg-red-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1 shadow">
                      <Radio className="w-3 h-3" />
                      مباشر الآن ({match.livePeriod || 'الشوط الأول'}) {match.liveMinute && `• ${match.liveMinute}`}
                    </span>
                  )}
                </div>

                {/* Horizontal Score / VS Card Layout */}
                <div className="bg-[#120808] border border-amber-500/20 rounded-xl p-3 flex items-center justify-between gap-2 shadow-inner">
                  {/* Home Team */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-400/50 shadow-md flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                      {match.homeLogo ? (
                        <img src={match.homeLogo} alt={match.homeTeam} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Logo size={42} />
                      )}
                    </div>
                    <span className="text-xs font-black text-white break-words leading-tight">{match.homeTeam}</span>
                  </div>

                  {/* Center Horizontal Score / VS Badge */}
                  <div className="shrink-0 flex flex-col items-center justify-center px-1">
                    {match.isLive ? (
                      <div className="bg-gradient-to-r from-red-950 via-black to-red-950 border-2 border-amber-400 px-3.5 py-1 rounded-xl font-black text-amber-400 text-lg shadow-[0_0_15px_rgba(245,158,11,0.4)] dir-ltr tracking-wider min-w-[70px] text-center font-mono">
                        {match.homeScore ?? 0} - {match.awayScore ?? 0}
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-700 to-amber-600 flex items-center justify-center font-black text-white text-xs border border-amber-400 shadow-md">
                        VS
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-left dir-ltr">
                    <span className="text-xs font-black text-white break-words leading-tight text-right">{match.awayTeam}</span>
                    <div className="w-11 h-11 rounded-full bg-red-950 border border-red-600 flex items-center justify-center text-lg font-bold text-amber-400 shadow-md overflow-hidden shrink-0 p-0.5">
                      {match.awayLogo ? (
                        <img src={match.awayLogo} alt={match.awayTeam} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span>🛡️</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date & Location */}
                <div className="bg-[#120b0b] rounded-xl p-2.5 text-xs text-gray-300 space-y-1 border border-red-900/30">
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-bold flex-wrap text-center">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{formatArabicFullDate(match.date)}</span>
                    {match.time && (
                      <>
                        <span>•</span>
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{match.time}</span>
                      </>
                    )}
                  </div>
                  {match.stadium && (
                    <div className="flex items-center justify-center gap-1 text-gray-400 text-[11px] mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{match.stadium}</span>
                    </div>
                  )}
                </div>

                {/* Live Match Broadcast Trigger Button */}
                <button
                  type="button"
                  onClick={() => setSelectedLiveMatch(match)}
                  className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md ${
                    match.isLive
                      ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white animate-pulse border border-amber-400'
                      : 'bg-red-950/80 hover:bg-red-900 text-amber-300 border border-red-700/50'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>{match.isLive ? '🔴 دخول البث والمتابعة الحية للمباراة' : '📜 استعراض تفاصيل وتغطية المباراة'}</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Past Matches Tab */}
      {activeTab === 'past' && (
        <div className="space-y-4">
          {pastMatches.length === 0 ? (
            <div className="text-center py-10 bg-[#171212] rounded-2xl border border-white/5 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs text-gray-400 font-semibold">لا توجد نتائج مباريات سابقة حالياً</p>
            </div>
          ) : (
            pastMatches.map((match) => (
              <div
                key={match.id}
                className="bg-[#191313] border border-red-900/40 rounded-2xl p-4 shadow-md space-y-3"
              >
                {/* Tournament Title & Status Badge */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-amber-400">{match.tournament || 'مباراة رسمية'}</span>

                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      match.badgeType === 'فوز'
                        ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50'
                        : match.badgeType === 'تعادل'
                        ? 'bg-amber-900/80 text-amber-300 border border-amber-500/50'
                        : 'bg-red-900/80 text-red-300 border border-red-500/50'
                    }`}
                  >
                    {match.badgeType || (match.homeScore! > match.awayScore! ? 'فوز' : 'تعادل')}
                  </span>
                </div>

                {/* Horizontal Match Scoreboard Display */}
                <div className="bg-[#120808] border border-amber-500/20 rounded-xl p-3 flex items-center justify-between gap-2 shadow-inner">
                  {/* Home Team */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                      {match.homeLogo ? (
                        <img src={match.homeLogo} alt={match.homeTeam} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Logo size={36} />
                      )}
                    </div>
                    <span className="text-xs font-black text-white break-words leading-tight">{match.homeTeam}</span>
                  </div>

                  {/* Horizontal Score Box */}
                  <div className="shrink-0 bg-[#241313] border-2 border-amber-500/50 px-3.5 py-1 rounded-xl font-black text-amber-300 text-base shadow-inner font-mono dir-ltr tracking-wider min-w-[70px] text-center">
                    {match.homeScore ?? 0} - {match.awayScore ?? 0}
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-left dir-ltr">
                    <span className="text-xs font-black text-white break-words leading-tight text-right">{match.awayTeam}</span>
                    <div className="w-10 h-10 rounded-full bg-red-950 border border-red-600 flex items-center justify-center text-sm shrink-0 overflow-hidden p-0.5">
                      {match.awayLogo ? (
                        <img src={match.awayLogo} alt={match.awayTeam} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span>🛡️</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Penalties or Extra Notes */}
                {match.penaltyScore && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl text-center text-xs text-amber-300 font-bold">
                    ⚽ {match.penaltyScore}
                  </div>
                )}

                {/* Goals Summary Breakdown */}
                {((match.goalsSummary && match.goalsSummary.length > 0) || (match.goalEvents && match.goalEvents.length > 0)) && (
                  <div className="bg-[#120d0d] p-2.5 rounded-xl text-[11px] text-gray-300 space-y-1.5 border border-amber-500/20">
                    <span className="text-amber-400 font-bold flex items-center gap-1 border-b border-white/5 pb-1">
                      <span>⚽</span> سجل الأهداف والتفاصيل:
                    </span>
                    {match.goalEvents && match.goalEvents.length > 0 ? (
                      match.goalEvents.map((ge, idx) => (
                        <div key={idx} className="flex items-center justify-between text-amber-200 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                          <span className="font-extrabold flex items-center gap-1">
                            <span>⚽</span> {ge.playerName}
                          </span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-bold border border-amber-500/30">
                            {ge.goalsCount > 1 ? `${ge.goalsCount} أهداف` : 'هدف'} {ge.minute ? `• الدقيقة (${ge.minute})` : ''}
                          </span>
                        </div>
                      ))
                    ) : (
                      match.goalsSummary?.map((goal, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-amber-200">
                          <span>⚽</span> {goal}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* View Event History Archive */}
                <button
                  type="button"
                  onClick={() => setSelectedLiveMatch(match)}
                  className="w-full bg-[#120707] hover:bg-[#1a0c0c] text-amber-300 border border-amber-500/30 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-98"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>عرض أرشيف وسجل أحداث المباراة بالتفصيل</span>
                </button>

                {/* Date & Location */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-red-400" />
                    {formatArabicFullDate(match.date)}
                  </span>
                  {match.stadium && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {match.stadium}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cloud Match Archive & Historical Reports Tab */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[#2b1010] via-[#1a0a0a] to-[#120606] p-4 rounded-2xl border border-amber-500/40 shadow-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                سجل وبطاقات أرشيف المباريات والتقارير التاريخية
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                قاعدة بيانات Firestore ☁️
              </span>
            </div>
            <p className="text-xs text-gray-300">
              أرشيف رقمي دائم يوثق تاريخ مباريات فريق السلام بكثيبة، التقارير الفنية، صور المباريات، وسجل الشرف.
            </p>
          </div>

          {archiveList.length === 0 ? (
            <div className="text-center py-12 bg-[#171212] rounded-2xl border border-white/5 space-y-2">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400 font-semibold">لا توجد بطاقات أرشيف سحابية محفوظة حالياً</p>
              <p className="text-[11px] text-gray-500">يمكن للمشرف أرشفة المباريات وإضافة التقارير من لوحة التحكم</p>
            </div>
          ) : (
            archiveList.map((card) => (
              <div
                key={card.id}
                className="bg-[#181010] border-2 border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 shadow-lg space-y-3 transition-all"
              >
                {/* Header: Season & Badge */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-amber-300">{card.tournament}</span>
                    {card.season && (
                      <span className="text-[10px] bg-black/50 text-gray-400 px-2 py-0.5 rounded border border-white/10">
                        {card.season}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      card.badgeType === 'فوز'
                        ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50'
                        : card.badgeType === 'تعادل'
                        ? 'bg-amber-900/80 text-amber-300 border border-amber-500/50'
                        : 'bg-red-900/80 text-red-300 border border-red-500/50'
                    }`}
                  >
                    {card.badgeType || 'مباراة سابقة'}
                  </span>
                </div>

                {/* Scoreboard Card */}
                <div className="bg-[#100808] border border-amber-500/20 rounded-xl p-3 flex items-center justify-between gap-2 shadow-inner">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                      {card.homeLogo ? (
                        <img src={card.homeLogo} alt={card.homeTeam} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Logo size={36} />
                      )}
                    </div>
                    <span className="text-xs font-black text-white break-words">{card.homeTeam}</span>
                  </div>

                  <div className="shrink-0 bg-[#221010] border-2 border-amber-500/60 px-3.5 py-1 rounded-xl font-black text-amber-300 text-base font-mono shadow-inner dir-ltr tracking-wider min-w-[65px] text-center">
                    {card.homeScore} - {card.awayScore}
                  </div>

                  <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-left dir-ltr">
                    <span className="text-xs font-black text-white break-words text-right">{card.awayTeam}</span>
                    <div className="w-10 h-10 rounded-full bg-red-950 border border-red-600 flex items-center justify-center text-sm shrink-0 overflow-hidden p-0.5">
                      {card.awayLogo ? (
                        <img src={card.awayLogo} alt={card.awayTeam} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span>🛡️</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Brief Summary Snippet */}
                {card.summaryReport && (
                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
                    {card.summaryReport}
                  </p>
                )}

                {/* Action button to open Full Detail Modal */}
                <button
                  type="button"
                  onClick={() => setSelectedArchiveDetail(card)}
                  className="w-full bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/40 text-amber-300 border border-amber-500/40 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-transform active:scale-98 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>فتح بطاقة التقرير الكامل والإحصائيات الشاملة</span>
                </button>

                {/* Footer Date & Stadium */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-red-400" />
                    {formatArabicFullDate(card.date)}
                  </span>
                  {card.stadium && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {card.stadium}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

