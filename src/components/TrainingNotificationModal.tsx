import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, MapPin, Clock, Send, User, KeyRound, Info } from 'lucide-react';
import { TrainingSession, ClubInfo } from '../types';
import { apiService } from '../services/api';
import { Logo } from './Logo';

interface TrainingNotificationModalProps {
  session: TrainingSession;
  onClose: () => void;
  onSubmitted?: (sessionId?: string) => void;
  userRole?: 'player' | 'fan';
  loggedInPlayer?: any;
  onOpenPlayerLogin?: () => void;
  clubInfo?: ClubInfo;
  initialChoice?: 'attend' | 'absent' | null;
}

export const TrainingNotificationModal: React.FC<TrainingNotificationModalProps> = ({
  session,
  onClose,
  onSubmitted,
  userRole = 'fan',
  loggedInPlayer,
  onOpenPlayerLogin,
  clubInfo,
  initialChoice = null,
}) => {
  const [choice, setChoice] = useState<'attend' | 'absent' | null>(initialChoice);
  const [playerName, setPlayerName] = useState(loggedInPlayer?.name || '');
  const [excuseReason, setExcuseReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialChoice) {
      setChoice(initialChoice);
    }
  }, [initialChoice]);

  useEffect(() => {
    if (loggedInPlayer?.name) {
      setPlayerName(loggedInPlayer.name);
    }
  }, [loggedInPlayer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!playerName.trim()) {
      setErrorMessage('يرجى كتابة اسمك الكامل لإنهاء التسجيل');
      return;
    }

    if (choice === 'absent' && !excuseReason.trim()) {
      setErrorMessage('يرجى كتابة السبب / العذر للاعتذار');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.submitAttendanceResponse({
        sessionId: session.id,
        playerId: loggedInPlayer?.id,
        playerName: playerName.trim(),
        attending: choice === 'attend',
        excuseReason: choice === 'absent' ? excuseReason.trim() : undefined,
      });

      setIsSuccess(true);
      if (onSubmitted) onSubmitted(session.id);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setErrorMessage('حدث خطأ أثناء إرسال استجابتك، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1e1515] border-2 border-red-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 dir-rtl text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 via-amber-950 to-red-950 p-4 border-b border-red-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 shadow-sm">
              <Logo size={32} customLogoUrl={clubInfo?.logoUrl} />
            </div>
            <div>
              <h2 className="font-black text-sm text-amber-300 drop-shadow-sm">فريق السلام بكثيبة</h2>
              <p dir="rtl" className="text-[10px] text-gray-200 font-semibold inline-flex items-center gap-1">
                <span className="shrink-0">🇧🇹</span>
                <span>إشعار تمرين رسمي • {session.time}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Training Session Info Card */}
          <div className="bg-[#130b0b] border border-red-900/40 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm">
            <h3 dir="rtl" className="font-bold text-white text-base text-amber-400 flex items-start gap-1.5 text-right break-words text-wrap">
              <span className="shrink-0 mt-0.5">🇧🇹</span>
              <span className="break-words text-wrap">{session.title.replace(/^🇧🇹\s*/, '')}</span>
            </h3>
            <div className="flex items-center gap-2 text-gray-200">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>الموعد: {session.time} ({session.date})</span>
            </div>
            <div className="flex items-center gap-2 text-gray-200">
              <MapPin className="w-4 h-4 text-red-400 shrink-0" />
              <span>الموقع: {session.location}</span>
            </div>
            {session.note && (
              <div className="text-xs sm:text-sm text-amber-200/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/25 break-words text-wrap leading-relaxed whitespace-pre-line">
                <span className="font-bold text-amber-400 block mb-0.5">📝 ملاحظات المدرب:</span>
                {session.note}
              </div>
            )}
          </div>

          {/* Content Based on User Role */}
          {userRole === 'fan' ? (
            /* Fan View: Show Training Info Only without Attendance Buttons */
            <div className="space-y-3 pt-1 border-t border-red-900/40">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-2 text-center text-xs">
                <p className="font-extrabold text-amber-300 flex items-center justify-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-400" />
                  حساب المشجع (عرض تفاصيل التمرين)
                </p>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  أنت تستعرض تفاصيل التمرين كمشجع. أزرار تسجيل وتأكيد الحضور (سأحضر / لن أحضر) تظهر حصرياً للاعبي الفريق المسجلين عبر الرمز السري PIN.
                </p>
              </div>

              {onOpenPlayerLogin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPlayerLogin();
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>دخول اللاعبين وتسجيل الحضور بالرمز السري</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="bg-red-950/90 border border-red-500/70 text-red-200 text-xs px-3 py-2 rounded-xl text-center font-bold animate-in fade-in shadow-md">
                  {errorMessage}
                </div>
              )}

              {isSuccess ? (
                /* Success Banner */
            <div className="bg-emerald-900/80 border-2 border-emerald-500 rounded-2xl p-4 text-center space-y-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="font-extrabold text-base text-white">
                {choice === 'attend' ? 'تم تسجيل حضورك بنجاح! ⚽' : 'تم استلام عذرك بنجاح 📋'}
              </h3>
              <p className="text-xs text-emerald-200">شكرًا لك كابتن {playerName}، تم إبلاغ مدرب الفريق والإدارة.</p>
            </div>
          ) : choice === null ? (
            /* Player Step 1: Exclusive Attendance Choice Buttons */
            <div className="space-y-3 pt-2">
              <p className="text-xs text-center font-bold text-amber-300">
                أهلاً كابتن {loggedInPlayer?.name || 'اللاعب'} ⚽ يرجى تحديد موقفك من التمرين:
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Option 1: ساحضر التمرين */}
                <button
                  type="button"
                  onClick={() => setChoice('attend')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold p-3.5 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 border-2 border-emerald-400"
                >
                  <CheckCircle2 className="w-7 h-7 text-white" />
                  <span className="text-sm">✅ سأحضر التمرين</span>
                </button>

                {/* Option 2: لن احضر التمرين */}
                <button
                  type="button"
                  onClick={() => setChoice('absent')}
                  className="bg-red-700 hover:bg-red-600 text-white font-extrabold p-3.5 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 border-2 border-red-500"
                >
                  <XCircle className="w-7 h-7 text-white" />
                  <span className="text-sm">❌ لن أحضر التمرين</span>
                </button>
              </div>
            </div>
          ) : choice === 'attend' ? (
            /* Step 2 Popup: ساحضر التمرين - Prompt Player Name */
            <form onSubmit={handleSubmit} className="space-y-3 bg-[#160f0f] p-4 rounded-2xl border border-emerald-500/40 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs border-b border-white/10 pb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>تسجيل الحضور للتمرين</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                  اكتب اسمك الكامل (اللاعب): <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="أدخل اسمك الثلاثي"
                    className="w-full bg-[#241919] border border-gray-700 rounded-xl py-2.5 pr-9 pl-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'جاري الإرسال...' : 'تأكيد الحضور'}
                </button>
                <button
                  type="button"
                  onClick={() => setChoice(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-2.5 rounded-xl"
                >
                  رجوع
                </button>
              </div>
            </form>
          ) : (
            /* Step 2 Popup: لن احضر التمرين - Prompt Player Excuse */
            <form onSubmit={handleSubmit} className="space-y-3 bg-[#160f0f] p-4 rounded-2xl border border-red-500/40 animate-in fade-in">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs border-b border-white/10 pb-2">
                <XCircle className="w-4 h-4" />
                <span>تقديم اعتذار عن التمرين</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                  اسمك الكامل (اللاعب): <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="مثال: حسين خالد بن همام"
                    className="w-full bg-[#241919] border border-gray-700 rounded-xl py-2.5 pr-9 pl-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-300 mb-1">
                  ما هو عذرك؟ (سبب عدم الحضور): <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <textarea
                    required
                    rows={2}
                    value={excuseReason}
                    onChange={(e) => setExcuseReason(e.target.value)}
                    placeholder="اكتب سبب عذرك هنا (مثال: ظروف العمل / إصابة / سفر خارج المنطقة)..."
                    className="w-full bg-[#241919] border border-gray-700 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'جاري الإرسال...' : 'إرسال الاعتذار'}
                </button>
                <button
                  type="button"
                  onClick={() => setChoice(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-2.5 rounded-xl"
                >
                  رجوع
                </button>
              </div>
            </form>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
};
