import React, { useState, useEffect } from 'react';
import { Match, MatchLiveEvent, Player } from '../types';
import { apiService } from '../services/api';
import { Radio, Play, Pause, X, Edit2, Trash2, MoreVertical, Send, AlertTriangle, Trophy, Check, Shield, Clock, Camera, Image as ImageIcon, Heart, Star, Upload, Plus } from 'lucide-react';
import { parseStandardNumber } from '../utils/numberUtils';

interface LiveMatchAdminConsoleProps {
  matches: Match[];
  players: Player[];
  onMatchUpdated: (updatedMatch: Match) => void;
  initialSelectedMatchId?: string;
}

export const LiveMatchAdminConsole: React.FC<LiveMatchAdminConsoleProps> = ({
  matches,
  players,
  onMatchUpdated,
  initialSelectedMatchId,
}) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    initialSelectedMatchId || matches.find((m) => m.isLive)?.id || matches[0]?.id || ''
  );

  const activeMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];

  // Primary "Write Event" Box state
  const [mainEventText, setMainEventText] = useState<string>('');
  const [mainEventMinute, setMainEventMinute] = useState<string>('1');
  const [mainEventPush, setMainEventPush] = useState<boolean>(true);

  // Quick Modal States
  const [activeModal, setActiveModal] = useState<'goal' | 'card' | 'sub' | 'event' | null>(null);
  const [modalMinute, setModalMinute] = useState<string>('1');
  const [modalTeam, setModalTeam] = useState<'home' | 'away'>('home');
  const [modalPlayer, setModalPlayer] = useState<string>('');
  const [modalPlayerOut, setModalPlayerOut] = useState<string>('');
  const [modalPlayerIn, setModalPlayerIn] = useState<string>('');
  const [modalText, setModalText] = useState<string>('');
  const [modalPushNotification, setModalPushNotification] = useState<boolean>(true);

  // Edit / Delete Event State
  const [editingEvent, setEditingEvent] = useState<MatchLiveEvent | null>(null);
  const [deleteConfirmEventId, setDeleteConfirmEventId] = useState<string | null>(null);
  const [openEventOptionsId, setOpenEventOptionsId] = useState<string | null>(null);

  // End Match Modal Confirmation
  const [showEndMatchModal, setShowEndMatchModal] = useState<boolean>(false);

  // Manual Score Modal State
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);
  const [manualHomeScore, setManualHomeScore] = useState<number>(0);
  const [manualAwayScore, setManualAwayScore] = useState<number>(0);
  const [scorePushNotification, setScorePushNotification] = useState<boolean>(true);

  // Manual Time / Period Edit Modal State
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [manualPeriod, setManualPeriod] = useState<string>('الشوط الأول');
  const [manualMinute, setManualMinute] = useState<string>('1');
  const [timePushNotification, setTimePushNotification] = useState<boolean>(false);

  // Status Message
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (activeMatch) {
      setManualHomeScore(activeMatch.homeScore ?? 0);
      setManualAwayScore(activeMatch.awayScore ?? 0);
      if (activeMatch.livePeriod) setManualPeriod(activeMatch.livePeriod);
      if (activeMatch.liveMinute) {
        const rawMin = activeMatch.liveMinute.replace("'", '');
        setManualMinute(rawMin);
        if (rawMin && !isNaN(parseInt(rawMin))) setMainEventMinute(rawMin);
      }
    }
  }, [activeMatch?.id, activeMatch?.liveMinute, activeMatch?.livePeriod, activeMatch?.homeScore, activeMatch?.awayScore]);

  if (!activeMatch) {
    return (
      <div className="bg-[#180a0a] border border-red-900/40 p-6 rounded-2xl text-center text-gray-300 dir-rtl">
        <p className="font-bold">لا توجد مباريات مضافة في النظام حالياً.</p>
        <p className="text-xs text-gray-400 mt-1">يرجى إضافة مباراة جديدة أولاً من قسم المباريات لتبدأ بالتغطية المباشرة.</p>
      </div>
    );
  }

  // Quick Action Opener
  const openQuickModal = (type: 'goal' | 'card' | 'sub' | 'event') => {
    setActiveModal(type);
    setModalMinute(mainEventMinute || '1');
    setModalTeam('home');
    setModalPlayer('');
    setModalPlayerOut('');
    setModalPlayerIn('');
    setModalText('');
    setModalPushNotification(true);
  };

  // Publish Main Event (from big box)
  const handlePublishMainEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainEventText.trim()) {
      setStatusMsg('⚠️ يرجى كتابة نص الحدث قبل النشر');
      setTimeout(() => setStatusMsg(''), 2500);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiService.addMatchLiveEvent(activeMatch.id, {
        type: 'comment',
        minute: `${mainEventMinute.trim()}'`,
        period: activeMatch.livePeriod || 'الشوط الأول',
        detail: mainEventText,
        sendPushNotification: mainEventPush,
      });

      if (res.match) onMatchUpdated(res.match);

      setMainEventText('');
      setStatusMsg(
        mainEventPush
          ? '✅ تم نشر الحدث وإرسال إشعار فوري للجماهير'
          : '✅ تم نشر الحدث صامتاً داخل التطبيق'
      );
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      setStatusMsg('❌ حدث خطأ في نشر الحدث');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Publish Quick Modal Event (Goal, Card, Sub, Event)
  const handlePublishModalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let eventType: any = 'comment';
    let defaultDetail = '';

    if (activeModal === 'goal') {
      eventType = 'goal';
      const teamName = modalTeam === 'home' ? activeMatch.homeTeam : activeMatch.awayTeam;
      defaultDetail = `هدف لصالح ${teamName} ${modalPlayer ? `— بواسطة اللاعب ${modalPlayer}` : ''}`;
    } else if (activeModal === 'card') {
      eventType = 'yellow_card';
      const teamName = modalTeam === 'home' ? activeMatch.homeTeam : activeMatch.awayTeam;
      defaultDetail = `بطاقة صفراء للاعب ${modalPlayer || ''} (${teamName})`;
    } else if (activeModal === 'sub') {
      eventType = 'sub';
      const teamName = modalTeam === 'home' ? activeMatch.homeTeam : activeMatch.awayTeam;
      defaultDetail = `تبديل لصالح ${teamName}: خروج (${modalPlayerOut || 'اللاعب'}) ⬅️ دخول (${modalPlayerIn || 'اللاعب البديل'})`;
    } else if (activeModal === 'event') {
      eventType = 'comment';
      defaultDetail = modalText;
    }

    try {
      const res = await apiService.addMatchLiveEvent(activeMatch.id, {
        type: eventType,
        minute: `${modalMinute.trim()}'`,
        period: activeMatch.livePeriod || 'الشوط الأول',
        team: modalTeam,
        playerName: modalPlayer,
        playerOut: modalPlayerOut,
        playerIn: modalPlayerIn,
        detail: modalText || defaultDetail,
        sendPushNotification: modalPushNotification,
      });

      if (res.match) onMatchUpdated(res.match);

      setActiveModal(null);
      setStatusMsg('✅ تم نشر الحدث وتحديث النتيجة والمتابعة المباشرة');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      setStatusMsg('❌ خطأ أثناء إرسال البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Event Edit
  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setIsSubmitting(true);

    try {
      const res = await apiService.updateMatchLiveEvent(activeMatch.id, editingEvent.id, {
        detail: modalText,
        minute: `${modalMinute.trim()}'`,
        playerName: modalPlayer,
      });

      if (res.match) onMatchUpdated(res.match);
      setEditingEvent(null);
      setStatusMsg('✅ تم تعديل الحدث بنجاح');
      setTimeout(() => setStatusMsg(''), 2500);
    } catch {
      setStatusMsg('❌ خطأ في التعديل');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Event Confirmation Execution
  const handleConfirmDeleteEvent = async () => {
    if (!deleteConfirmEventId) return;
    try {
      const res = await apiService.deleteMatchLiveEvent(activeMatch.id, deleteConfirmEventId);
      if (res.match) onMatchUpdated(res.match);
      setDeleteConfirmEventId(null);
      setStatusMsg('🗑️ تم حذف الحدث وإعادة حساب النتيجة تلقائياً');
      setTimeout(() => setStatusMsg(''), 2500);
    } catch {
      setStatusMsg('❌ خطأ في عملية الحذف');
    }
  };

  // Save Manual Score Update
  const handleSaveManualScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedMatch = await apiService.updateMatchLiveControl(activeMatch.id, {
        homeScore: manualHomeScore,
        awayScore: manualAwayScore,
        action: 'update_score',
        sendPushNotification: scorePushNotification,
      });

      onMatchUpdated(updatedMatch);
      setShowScoreModal(false);
      setStatusMsg(`⚽ تم كتابة وتحديث نتيجة المباراة إلى (${manualHomeScore} - ${manualAwayScore}) بنجاح!`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      setStatusMsg('❌ خطأ أثناء حفظ النتيجة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Manual Time & Period Update
  const handleSaveTimeUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const cleanMin = manualMinute.trim().replace("'", '');
    const formattedMinute = cleanMin ? `${cleanMin}'` : "0'";
    try {
      const updatedMatch = await apiService.updateMatchLiveControl(activeMatch.id, {
        livePeriod: manualPeriod,
        liveMinute: formattedMinute,
        action: 'update_time',
        sendPushNotification: timePushNotification,
      });

      onMatchUpdated(updatedMatch);
      setShowTimeModal(false);
      setStatusMsg(`⏱️ تم تعديل الشوط والدقيقة إلى (${manualPeriod} | الدقيقة: ${formattedMinute}) بنجاح!`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      setStatusMsg('❌ خطأ أثناء تعديل الوقت والشوط');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Match Controls (Start, Pause, Resume, End)
  const handleMatchControlState = async (newState: 'start_first_half' | 'pause' | 'resume' | 'end_first_half' | 'start_second_half' | 'end_match') => {
    try {
      let isLive = true;
      let liveStatus = 'مباشر الآن';
      let livePeriod = activeMatch.livePeriod || 'الشوط الأول';

      if (newState === 'start_first_half') {
        isLive = true;
        liveStatus = 'مباشر الآن';
        livePeriod = 'الشوط الأول';
      } else if (newState === 'pause') {
        isLive = true;
        liveStatus = 'متوقفة مؤقتاً';
      } else if (newState === 'resume') {
        isLive = true;
        liveStatus = 'مباشر الآن';
      } else if (newState === 'end_first_half') {
        isLive = true;
        liveStatus = 'استراحة الشوطين';
        livePeriod = 'استراحة الشوطين';
      } else if (newState === 'start_second_half') {
        isLive = true;
        liveStatus = 'مباشر الآن';
        livePeriod = 'الشوط الثاني';
      } else if (newState === 'end_match') {
        isLive = false;
        liveStatus = 'انتهت';
        livePeriod = 'انتهت المباراة';
      }

      const updated = await apiService.updateMatchLiveControl(activeMatch.id, {
        isLive,
        liveStatus,
        livePeriod,
        action: newState,
      });

      onMatchUpdated(updated);
      setShowEndMatchModal(false);

      if (newState === 'start_first_half') {
        setStatusMsg(`🚀 تم إطلاق صافرة البداية وإرسال إشعار عاجل للجماهير بالنتيجة (0-0) والدقيقة (1')`);
      } else if (newState === 'start_second_half') {
        setStatusMsg(`🚀 تم انطلاق الشوط الثاني وإرسال إشعار عاجل للجماهير بالنتيجة والدقيقة (46')`);
      } else if (newState === 'end_match') {
        setStatusMsg(`🏁 تم إنهاء المباراة رسمياً وإرسال إشعار النتيجة النهائية للجماهير`);
      } else {
        setStatusMsg(`✅ تم تحديث حالة المباراة إلى: (${livePeriod} - ${liveStatus})`);
      }
      setTimeout(() => setStatusMsg(''), 3500);
    } catch {
      setStatusMsg('❌ حدث خطأ في التحكم بحالة المباراة');
    }
  };

  return (
    <div className="space-y-4 dir-rtl text-white font-sans max-w-xl mx-auto pb-10">
      
      {/* Toast Notification Header */}
      {statusMsg && (
        <div className="bg-amber-400 text-black px-4 py-3 rounded-2xl font-black text-xs text-center shadow-xl animate-bounce flex items-center justify-center gap-2 border-2 border-black">
          <span>⚡</span> {statusMsg}
        </div>
      )}

      {/* Match Selector if multiple */}
      {matches.length > 1 && (
        <div className="bg-[#1a0a0a] p-3 rounded-2xl border border-red-800/40 space-y-1">
          <label className="block text-amber-400 font-black text-[11px]">اختر المباراة المراد التحكم بها:</label>
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="w-full bg-[#0d0404] border border-amber-500/40 rounded-xl p-2 text-amber-300 font-bold text-xs"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.homeTeam} VS {m.awayTeam} — ({m.date}) {m.isLive ? '🔴 مباشر' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 🔴 HEADER DISPLAY: Match Direct Screen (شاشة المباراة المباشرة) */}
      <div className="bg-gradient-to-b from-[#2d0f0f] via-[#1a0606] to-[#0e0202] p-4 sm:p-5 rounded-3xl border-2 border-red-600 shadow-2xl space-y-3 relative overflow-hidden">
        
        {/* Status Badge */}
        <div className="flex items-center justify-between border-b border-red-900/50 pb-2">
          <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5 shadow">
            <Radio className="w-3.5 h-3.5" />
            {activeMatch.isLive ? '🔴 مباشر الآن' : activeMatch.liveStatus || 'لم تبدأ'}
          </span>
          <span className="text-amber-400 text-xs font-black">{activeMatch.tournament}</span>
        </div>

        {/* Teams and Score Display */}
        <div className="grid grid-cols-3 items-center text-center py-2">
          {/* Home Team (السلام بكثيبة) */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-full bg-black/60 border-2 border-amber-400 flex items-center justify-center p-1.5 shadow-md">
              {activeMatch.homeLogo ? (
                <img src={activeMatch.homeLogo} alt={activeMatch.homeTeam} className="w-full h-full object-contain rounded-full" />
              ) : (
                <Shield className="w-7 h-7 text-amber-400" />
              )}
            </div>
            <span className="font-black text-xs text-amber-300 max-w-[100px] leading-tight">{activeMatch.homeTeam}</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center justify-center">
            <div className="bg-black/90 px-4 py-2 rounded-2xl border-2 border-amber-400 shadow-inner flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-black text-amber-400 tracking-wider">
                {activeMatch.homeScore ?? 0} — {activeMatch.awayScore ?? 0}
              </span>
            </div>
            
            {/* ✏️ Button to Write / Edit Score */}
            <button
              type="button"
              onClick={() => {
                setManualHomeScore(activeMatch.homeScore ?? 0);
                setManualAwayScore(activeMatch.awayScore ?? 0);
                setShowScoreModal(true);
              }}
              className="mt-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 hover:border-amber-400 text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow transition-all active:scale-95"
            >
              <Edit2 className="w-3 h-3 text-amber-400" />
              <span>كتابة النتيجة</span>
            </button>

            {/* ⏱️ Button to Edit Period & Minute */}
            <button
              type="button"
              onClick={() => {
                setManualPeriod(activeMatch.livePeriod || 'الشوط الأول');
                setManualMinute(activeMatch.liveMinute ? activeMatch.liveMinute.replace("'", '') : '1');
                setShowTimeModal(true);
              }}
              className="text-[11px] text-amber-300 hover:text-white font-extrabold mt-1.5 bg-red-950/90 hover:bg-red-900 px-3 py-1 rounded-xl border border-red-700/60 flex items-center gap-1.5 shadow transition-all cursor-pointer active:scale-95 group"
              title="انقر لتعديل الشوط والدقيقة"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>
                {activeMatch.livePeriod || 'الشوط الأول'} | الدقيقة: {activeMatch.liveMinute || "0'"}
              </span>
              <Edit2 className="w-2.5 h-2.5 text-gray-400 group-hover:text-amber-300" />
            </button>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-full bg-black/60 border-2 border-amber-400 flex items-center justify-center p-1.5 shadow-md">
              {activeMatch.awayLogo ? (
                <img src={activeMatch.awayLogo} alt={activeMatch.awayTeam} className="w-full h-full object-contain rounded-full" />
              ) : (
                <Shield className="w-7 h-7 text-amber-400" />
              )}
            </div>
            <span className="font-black text-xs text-amber-300 max-w-[100px] leading-tight">{activeMatch.awayTeam}</span>
          </div>
        </div>

        {/* Dynamic Match Control Buttons (التحكم بالمباراة) */}
        <div className="pt-2 border-t border-red-900/50">
          {/* State 1: Before Match */}
          {(!activeMatch.isLive && (activeMatch.livePeriod === 'لم تبدأ' || !activeMatch.livePeriod || activeMatch.liveStatus === 'لم تبدأ')) && (
            <button
              type="button"
              onClick={() => handleMatchControlState('start_first_half')}
              className="w-full bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm py-3 rounded-2xl shadow-xl flex items-center justify-center gap-2 animate-pulse border border-amber-300"
            >
              <span>🔴</span> بدء المباراة
            </button>
          )}

          {/* State 2: First Half */}
          {activeMatch.isLive && activeMatch.livePeriod === 'الشوط الأول' && activeMatch.liveStatus === 'مباشر الآن' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleMatchControlState('pause')}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs py-2.5 rounded-xl border border-amber-400 shadow flex items-center justify-center gap-1"
              >
                <span>⏸️</span> إيقاف المباراة
              </button>
              <button
                type="button"
                onClick={() => handleMatchControlState('end_first_half')}
                className="bg-red-700 hover:bg-red-600 text-white font-black text-xs py-2.5 rounded-xl border border-red-500 shadow flex items-center justify-center gap-1"
              >
                <span>🏁</span> نهاية الشوط الأول
              </button>
            </div>
          )}

          {/* State 3: Paused */}
          {activeMatch.isLive && activeMatch.liveStatus === 'متوقفة مؤقتاً' && (
            <button
              type="button"
              onClick={() => handleMatchControlState('resume')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-2xl shadow border border-emerald-400 flex items-center justify-center gap-2"
            >
              <span>▶️</span> استئناف المباراة
            </button>
          )}

          {/* State 4: Half-Time Break */}
          {activeMatch.isLive && (activeMatch.livePeriod === 'استراحة الشوطين' || activeMatch.liveStatus === 'استراحة الشوطين') && (
            <button
              type="button"
              onClick={() => handleMatchControlState('start_second_half')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm py-3 rounded-2xl shadow border border-emerald-400 flex items-center justify-center gap-2 animate-pulse"
            >
              <span>▶️</span> بدء الشوط الثاني
            </button>
          )}

          {/* State 5: Second Half */}
          {activeMatch.isLive && activeMatch.livePeriod === 'الشوط الثاني' && activeMatch.liveStatus === 'مباشر الآن' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleMatchControlState('pause')}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs py-2.5 rounded-xl border border-amber-400 shadow flex items-center justify-center gap-1"
              >
                <span>⏸️</span> إيقاف المباراة
              </button>
              <button
                type="button"
                onClick={() => setShowEndMatchModal(true)}
                className="bg-red-800 hover:bg-red-700 text-white font-black text-xs py-2.5 rounded-xl border border-red-500 shadow flex items-center justify-center gap-1"
              >
                <span>🏁</span> إنهاء المباراة
              </button>
            </div>
          )}

          {/* State 6: Match Ended */}
          {!activeMatch.isLive && (activeMatch.livePeriod === 'انتهت المباراة' || activeMatch.liveStatus === 'انتهت') && (
            <div className="bg-red-950/80 p-2.5 rounded-xl text-center border border-red-700/50 flex items-center justify-between">
              <span className="font-extrabold text-amber-300 text-xs">🏁 المباراة منتهية</span>
              <button
                type="button"
                onClick={() => handleMatchControlState('start_first_half')}
                className="bg-amber-500 text-black text-[10px] font-black px-2.5 py-1 rounded-lg"
              >
                إعادة فتح المباراة
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ✍️ MAIN PUBLISH BOX (خانة نشر الحدث الرئيسية) */}
      <form onSubmit={handlePublishMainEvent} className="bg-[#1c0808] p-4 rounded-3xl border-2 border-amber-500/60 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="font-black text-amber-400 text-sm flex items-center gap-2">
            <span>✍️</span> اكتب حدث المباراة
          </h3>
          <span className="text-[10px] text-gray-400 font-bold">النشر المباشر السريع</span>
        </div>

        {/* Large Text Area */}
        <textarea
          rows={3}
          value={mainEventText}
          onChange={(e) => setMainEventText(e.target.value)}
          placeholder="مثال: السلام يضغط بقوة على مرمى الفريق المنافس وفرصة خطيرة..."
          className="w-full bg-[#0e0303] border-2 border-red-900/60 rounded-2xl p-3 text-white font-bold text-xs focus:outline-none focus:border-amber-400 placeholder:text-gray-500 leading-relaxed"
        />

        {/* Minute & Notification Options */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-[#0e0303] px-3 py-1.5 rounded-xl border border-red-900/60">
            <span className="text-amber-400 font-extrabold text-xs">الدقيقة:</span>
            <input
              type="text"
              value={mainEventMinute}
              onChange={(e) => setMainEventMinute(e.target.value)}
              className="w-12 bg-black border border-amber-500/50 text-amber-300 font-black text-center text-xs p-1 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3 text-[11px] bg-[#0e0303] px-3 py-1.5 rounded-xl border border-red-900/60">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mainPush"
                checked={!mainEventPush}
                onChange={() => setMainEventPush(false)}
                className="accent-amber-500 w-3.5 h-3.5"
              />
              <span className="text-gray-300 font-bold">🔕 صامت</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mainPush"
                checked={mainEventPush}
                onChange={() => setMainEventPush(true)}
                className="accent-red-500 w-3.5 h-3.5"
              />
              <span className="text-red-300 font-black">🔔 إشعار فوري</span>
            </label>
          </div>
        </div>

        {/* Big Publish Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm py-3.5 rounded-2xl shadow-xl border border-amber-300 flex items-center justify-center gap-2 active:scale-98 transition-transform"
        >
          <span>📢</span>
          <span>{isSubmitting ? 'جاري النشر...' : 'نشر الحدث'}</span>
        </button>
      </form>

      {/* ⚡ 4 QUICK ACTION BUTTONS (الأحداث السريعة - أربعة أزرار كبيرة فقط) */}
      <div className="bg-[#180707] p-4 rounded-3xl border border-red-800/50 space-y-2.5">
        <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1">
          <span>⚡</span> الأحداث السريعة:
        </h4>

        <div className="grid grid-cols-2 gap-2.5">
          {/* ⚽ Goal Button */}
          <button
            type="button"
            onClick={() => openQuickModal('goal')}
            className="bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-black py-4 px-3 rounded-2xl shadow-xl border border-emerald-400 text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="text-xl">⚽</span>
            <span>هدف</span>
          </button>

          {/* 🟨 Card Button */}
          <button
            type="button"
            onClick={() => openQuickModal('card')}
            className="bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-black py-4 px-3 rounded-2xl shadow-xl border border-amber-300 text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="text-xl">🟨</span>
            <span>بطاقة</span>
          </button>

          {/* 🔄 Sub Button */}
          <button
            type="button"
            onClick={() => openQuickModal('sub')}
            className="bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-black py-4 px-3 rounded-2xl shadow-xl border border-blue-400 text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="text-xl">🔄</span>
            <span>تبديل</span>
          </button>

          {/* 📝 Event Button */}
          <button
            type="button"
            onClick={() => openQuickModal('event')}
            className="bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-black py-4 px-3 rounded-2xl shadow-xl border border-purple-400 text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="text-xl">📝</span>
            <span>حدث</span>
          </button>
        </div>
      </div>

      {/* 🕒 RECENT EVENTS LOG (آخر الأحداث) */}
      <div className="bg-[#160606] p-4 rounded-3xl border border-red-900/60 space-y-3">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <h3 className="font-black text-amber-400 text-xs flex items-center gap-1.5">
            <span>🕒</span> آخر الأحداث ({activeMatch.liveEvents?.length || 0})
          </h3>
          <span className="text-[10px] text-gray-400">مرتبة من الأحدث للأقدم</span>
        </div>

        {activeMatch.liveEvents && activeMatch.liveEvents.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 dir-rtl">
            {activeMatch.liveEvents.map((ev) => {
              const eventImages = (ev.images && ev.images.length > 0) ? ev.images : ev.imageUrl ? [ev.imageUrl] : [];
              return (
                <div
                  key={ev.id}
                  className="bg-[#0c0202] p-3 rounded-2xl border border-white/10 flex items-start justify-between gap-2 hover:border-amber-500/40 transition-all"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-amber-500 text-black font-black text-[11px] px-2 py-0.5 rounded-md">
                        {ev.minute}
                      </span>
                      <span className="font-extrabold text-xs text-white">
                        {ev.type === 'goal' && '⚽ هدف'}
                        {ev.type === 'yellow_card' && '🟨 بطاقة صفراء'}
                        {ev.type === 'red_card' && '🟥 بطاقة حمراء'}
                        {ev.type === 'sub' && '🔄 تبديل'}
                        {ev.type === 'warmup' && '🏃‍♂️ صور إحماء وتغطية'}
                        {ev.type === 'photo' && '📸 صورة ميدانية'}
                        {ev.type === 'comment' && '🔴 نقل مباشر للمباراة'}
                        {ev.type !== 'goal' && ev.type !== 'yellow_card' && ev.type !== 'red_card' && ev.type !== 'sub' && ev.type !== 'comment' && ev.type !== 'warmup' && ev.type !== 'photo' && '📢 خبر'}
                      </span>
                      {ev.playerName && (
                        <span className="text-[11px] text-amber-300 font-bold">— {ev.playerName}</span>
                      )}
                    </div>

                    <p className="text-xs text-gray-200 leading-relaxed font-semibold">
                      {ev.detail || ev.title}
                    </p>

                    {/* Image thumbnails preview */}
                    {eventImages.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                        {eventImages.map((img, iIdx) => (
                          <img
                            key={iIdx}
                            src={img}
                            alt="صورة الحدث"
                            className="w-14 h-10 object-cover rounded-lg border border-amber-500/40"
                          />
                        ))}
                      </div>
                    )}

                    {/* Interaction summary (Likes & Stars) */}
                    {((ev.likesCount && ev.likesCount > 0) || ev.averageRating) && (
                      <div className="flex items-center gap-3 text-[10px] text-amber-300 pt-1 font-bold">
                        {ev.likesCount !== undefined && ev.likesCount > 0 && (
                          <span className="flex items-center gap-1 text-red-400">
                            <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                            {ev.likesCount} إعجاب
                          </span>
                        )}
                        {ev.averageRating !== undefined && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {ev.averageRating} {ev.totalRatingsCount ? `(${ev.totalRatingsCount})` : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3 Dots Menu Button for Edit/Delete */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenEventOptionsId(openEventOptionsId === ev.id ? null : ev.id)}
                      className="p-1.5 text-gray-400 hover:text-white bg-white/5 rounded-xl border border-white/10"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Options Dropdown */}
                    {openEventOptionsId === ev.id && (
                      <div className="absolute left-0 mt-1 w-28 bg-[#200a0a] border border-amber-500/50 rounded-xl shadow-2xl z-20 overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenEventOptionsId(null);
                            setEditingEvent(ev);
                            setModalText(ev.detail || '');
                            setModalMinute(ev.minute.replace("'", ''));
                            setModalPlayer(ev.playerName || '');
                          }}
                          className="w-full text-right px-3 py-2 text-amber-300 hover:bg-white/10 font-bold flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> ✏️ تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenEventOptionsId(null);
                            setDeleteConfirmEventId(ev.id);
                          }}
                          className="w-full text-right px-3 py-2 text-red-400 hover:bg-white/10 font-bold flex items-center gap-1.5 border-t border-white/5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 🗑️ حذف
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-xs">
            لا توجد أحداث مسجلة بعد. استخدم خانة النشر أو الأزرار السريعة بالأعلى!
          </div>
        )}
      </div>

      {/* QUICK ACTION MODAL (نافذة الأحداث السريعة) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handlePublishModalEvent} className="bg-[#200909] border-2 border-amber-500 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-white dir-rtl">
            
            <div className="flex justify-between items-center border-b border-red-900/60 pb-2">
              <h3 className="font-black text-amber-400 text-sm flex items-center gap-1.5">
                {activeModal === 'goal' && '⚽ هدف'}
                {activeModal === 'card' && '🟨 بطاقة'}
                {activeModal === 'sub' && '🔄 تبديل'}
                {activeModal === 'event' && '📝 حدث'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Minute Input */}
            <div>
              <label className="block text-gray-300 font-bold text-xs mb-1">الدقيقة:</label>
              <input
                type="text"
                required
                value={modalMinute}
                onChange={(e) => setModalMinute(e.target.value)}
                className="w-full bg-[#0d0202] border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-black text-center text-sm"
              />
            </div>

            {/* Goal Specific Inputs */}
            {activeModal === 'goal' && (
              <>
                <div>
                  <label className="block text-gray-300 font-bold text-xs mb-1.5">لمن؟</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setModalTeam('home')}
                      className={`p-2.5 rounded-xl border text-center ${
                        modalTeam === 'home' ? 'bg-emerald-600 border-amber-400 text-white font-black' : 'bg-black/50 text-gray-300 border-white/10'
                      }`}
                    >
                      🟢 {activeMatch.homeTeam}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTeam('away')}
                      className={`p-2.5 rounded-xl border text-center ${
                        modalTeam === 'away' ? 'bg-emerald-600 border-amber-400 text-white font-black' : 'bg-black/50 text-gray-300 border-white/10'
                      }`}
                    >
                      ⚪ {activeMatch.awayTeam}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold text-xs mb-1">اللاعب:</label>
                  <input
                    type="text"
                    list="players-suggestions"
                    placeholder="اختر أو اكتب اسم صاحب الهدف..."
                    value={modalPlayer}
                    onChange={(e) => setModalPlayer(e.target.value)}
                    className="w-full bg-[#0d0202] border border-gray-700 rounded-xl p-2.5 text-white font-bold text-xs"
                  />
                  <datalist id="players-suggestions">
                    {players.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>
              </>
            )}

            {/* Card Specific Inputs */}
            {activeModal === 'card' && (
              <>
                <div>
                  <label className="block text-gray-300 font-bold text-xs mb-1">اللاعب:</label>
                  <input
                    type="text"
                    list="players-suggestions"
                    placeholder="اختر أو اكتب اسم اللاعب..."
                    value={modalPlayer}
                    onChange={(e) => setModalPlayer(e.target.value)}
                    className="w-full bg-[#0d0202] border border-gray-700 rounded-xl p-2.5 text-white font-bold text-xs"
                  />
                </div>
              </>
            )}

            {/* Substitution Specific Inputs */}
            {activeModal === 'sub' && (
              <>
                <div>
                  <label className="block text-red-300 font-bold text-xs mb-1">اللاعب الخارج:</label>
                  <input
                    type="text"
                    list="players-suggestions"
                    placeholder="اسم المغادر..."
                    value={modalPlayerOut}
                    onChange={(e) => setModalPlayerOut(e.target.value)}
                    className="w-full bg-[#0d0202] border border-red-800 rounded-xl p-2.5 text-white font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-emerald-300 font-bold text-xs mb-1">اللاعب الداخل:</label>
                  <input
                    type="text"
                    list="players-suggestions"
                    placeholder="اسم البديل..."
                    value={modalPlayerIn}
                    onChange={(e) => setModalPlayerIn(e.target.value)}
                    className="w-full bg-[#0d0202] border border-emerald-800 rounded-xl p-2.5 text-white font-bold text-xs"
                  />
                </div>
              </>
            )}

            {/* Event Specific Text */}
            {activeModal === 'event' && (
              <div>
                <label className="block text-gray-300 font-bold text-xs mb-1">نص الحدث:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="مثال: فرصة خطيرة للسلام..."
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  className="w-full bg-[#0d0202] border border-gray-700 rounded-xl p-2.5 text-white font-bold text-xs"
                />
              </div>
            )}

            {/* Push Notification option */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer bg-black/40 p-2 rounded-xl border border-white/10">
                <input
                  type="checkbox"
                  checked={modalPushNotification}
                  onChange={(e) => setModalPushNotification(e.target.checked)}
                  className="accent-red-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-amber-300">🔔 إرسال إشعار فوري للجمهور</span>
              </label>
            </div>

            {/* Publish Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm py-3 rounded-2xl shadow-xl flex items-center justify-center gap-1.5"
            >
              <span>📢</span>
              <span>
                {activeModal === 'goal' && 'نشر الهدف'}
                {activeModal === 'card' && 'نشر البطاقة'}
                {activeModal === 'sub' && 'نشر التبديل'}
                {activeModal === 'event' && 'نشر الحدث'}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* EDIT EVENT MODAL (تعديل الحدث) */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditEvent} className="bg-[#200909] border-2 border-amber-400 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-3 text-white dir-rtl">
            <div className="flex justify-between items-center border-b border-red-900/60 pb-2">
              <h3 className="font-black text-amber-400 text-xs">✏️ تعديل الحدث</h3>
              <button type="button" onClick={() => setEditingEvent(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-gray-300 font-bold text-xs mb-1">الدقيقة:</label>
              <input
                type="text"
                value={modalMinute}
                onChange={(e) => setModalMinute(e.target.value)}
                className="w-full bg-black border border-amber-500/50 rounded-xl p-2 text-amber-300 font-bold text-xs text-center"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-bold text-xs mb-1">اللاعب المعني (إن وجد):</label>
              <input
                type="text"
                value={modalPlayer}
                onChange={(e) => setModalPlayer(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-xl p-2 text-white font-bold text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-bold text-xs mb-1">النص / التفاصيل:</label>
              <textarea
                rows={3}
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-xl p-2 text-white font-bold text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 text-black font-black py-2.5 rounded-xl text-xs"
            >
              حفظ التعديلات
            </button>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG (حذف الحدث) */}
      {deleteConfirmEventId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#240808] border-2 border-red-600 rounded-3xl w-full max-w-xs p-5 text-center space-y-4 dir-rtl shadow-2xl">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto animate-pulse" />
            <h3 className="font-black text-amber-300 text-sm">هل تريد حذف هذا الحدث؟</h3>
            <p className="text-[11px] text-gray-300">
              إذا كان الحدث هدفاً، سيعيد النظام حساب نتيجة المباراة تلقائياً.
            </p>
            <div className="grid grid-cols-2 gap-2 font-bold text-xs pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmEventId(null)}
                className="bg-gray-800 text-gray-300 py-2.5 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEvent}
                className="bg-red-600 text-white font-black py-2.5 rounded-xl shadow"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL SCORE EDIT MODAL (كتابة وتعديل النتيجة) */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveManualScore} className="bg-[#200909] border-2 border-amber-400 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-white dir-rtl">
            <div className="flex justify-between items-center border-b border-red-900/60 pb-2">
              <h3 className="font-black text-amber-400 text-sm flex items-center gap-1.5">
                <span>✏️</span> كتابة نتيجة المباراة
              </h3>
              <button type="button" onClick={() => setShowScoreModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Teams score controls */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Home Team Score */}
              <div className="bg-[#0e0202] p-3 rounded-2xl border border-red-900/60 text-center space-y-2">
                <span className="block font-black text-xs text-amber-300 truncate">{activeMatch.homeTeam}</span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualHomeScore((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 bg-red-950 text-red-300 border border-red-700/60 font-black rounded-lg text-base flex items-center justify-center active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    dir="ltr"
                    value={manualHomeScore}
                    onChange={(e) => setManualHomeScore(Math.max(0, parseStandardNumber(e.target.value, 0)))}
                    className="w-14 bg-black border-2 border-amber-500/80 rounded-xl py-1.5 text-center text-amber-300 font-black text-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setManualHomeScore((prev) => prev + 1)}
                    className="w-8 h-8 bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-black rounded-lg text-base flex items-center justify-center active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Away Team Score */}
              <div className="bg-[#0e0202] p-3 rounded-2xl border border-red-900/60 text-center space-y-2">
                <span className="block font-black text-xs text-amber-300 truncate">{activeMatch.awayTeam}</span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualAwayScore((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 bg-red-950 text-red-300 border border-red-700/60 font-black rounded-lg text-base flex items-center justify-center active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    dir="ltr"
                    value={manualAwayScore}
                    onChange={(e) => setManualAwayScore(Math.max(0, parseStandardNumber(e.target.value, 0)))}
                    className="w-14 bg-black border-2 border-amber-500/80 rounded-xl py-1.5 text-center text-amber-300 font-black text-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setManualAwayScore((prev) => prev + 1)}
                    className="w-8 h-8 bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-black rounded-lg text-base flex items-center justify-center active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Checkbox */}
            <div className="bg-black/50 p-2.5 rounded-xl border border-white/10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scorePushNotification}
                  onChange={(e) => setScorePushNotification(e.target.checked)}
                  className="accent-amber-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-amber-300">🔔 إرسال إشعار عاجل للجماهير بالنتيجة الجديدة</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black py-3 rounded-2xl shadow-xl border border-amber-300 text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وتحديث النتيجة فوراً'}</span>
            </button>
          </form>
        </div>
      )}

      {/* MANUAL PERIOD & MINUTE EDIT MODAL (تعديل الشوط والدقيقة) */}
      {showTimeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveTimeUpdate} className="bg-[#200909] border-2 border-amber-400 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-white dir-rtl">
            <div className="flex justify-between items-center border-b border-red-900/60 pb-2">
              <h3 className="font-black text-amber-400 text-sm flex items-center gap-1.5">
                <span>⏱️</span> تعديل الشوط والدقيقة
              </h3>
              <button type="button" onClick={() => setShowTimeModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Period Selection */}
            <div>
              <label className="block text-gray-300 font-bold text-xs mb-1.5">اختر الشوط / المرحلة الحالية:</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold mb-2">
                {['الشوط الأول', 'استراحة الشوطين', 'الشوط الثاني', 'الأشواط الإضافية', 'ركلات الترجيح'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setManualPeriod(period)}
                    className={`p-2 rounded-xl border text-center text-[11px] transition-all ${
                      manualPeriod === period
                        ? 'bg-amber-500 border-amber-300 text-black font-black shadow-md'
                        : 'bg-black/50 text-gray-300 border-white/10 hover:border-amber-500/40'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={manualPeriod}
                onChange={(e) => setManualPeriod(e.target.value)}
                placeholder="أو اكتب الشوط هنا..."
                className="w-full bg-[#0e0202] border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold text-xs"
              />
            </div>

            {/* Minute Input */}
            <div>
              <label className="block text-gray-300 font-bold text-xs mb-1">الدقيقة الحالية:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={manualMinute}
                  onChange={(e) => setManualMinute(e.target.value)}
                  placeholder="مثال: 4, 45+2, 90"
                  className="w-full bg-[#0e0202] border-2 border-amber-500/80 rounded-xl p-2.5 text-center text-amber-300 font-black text-xl"
                />
                <span className="text-amber-400 font-black text-2xl font-mono">'</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">اكتب رقم الدقيقة فقط وسيتكفل النظام بوضع الفاصلة.</p>
            </div>

            {/* Notification Checkbox */}
            <div className="bg-black/50 p-2.5 rounded-xl border border-white/10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timePushNotification}
                  onChange={(e) => setTimePushNotification(e.target.checked)}
                  className="accent-amber-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-amber-300">🔔 إرسال إشعار عاجل للجمهور بالتوقيت الجديد</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black py-3 rounded-2xl shadow-xl border border-amber-300 text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وتحديث الشوط والدقيقة'}</span>
            </button>
          </form>
        </div>
      )}

      {/* END MATCH CONFIRMATION MODAL (إنهاء المباراة) */}
      {showEndMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#2a0a0a] border-2 border-red-600 rounded-3xl w-full max-w-xs p-5 text-center space-y-4 dir-rtl shadow-2xl">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
            
            <div className="space-y-1">
              <h3 className="font-black text-amber-300 text-base">هل تريد إنهاء المباراة؟</h3>
              <p className="text-xs font-black text-white bg-black/60 p-2.5 rounded-xl border border-amber-500/40">
                {activeMatch.homeTeam} {activeMatch.homeScore ?? 0} — {activeMatch.awayScore ?? 0} {activeMatch.awayTeam}
              </p>
            </div>

            <p className="text-[11px] text-gray-300 leading-relaxed">
              عند التأكيد، ستتوقف المباراة وتثبت النتيجة، ويتم تعطيل النشر وتحويل المباراة إلى "انتهت".
            </p>

            <div className="grid grid-cols-2 gap-2 font-bold text-xs pt-1">
              <button
                type="button"
                onClick={() => setShowEndMatchModal(false)}
                className="bg-gray-800 text-gray-300 py-2.5 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleMatchControlState('end_match')}
                className="bg-red-600 text-white font-black py-2.5 rounded-xl shadow border border-red-400"
              >
                🏁 إنهاء المباراة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
