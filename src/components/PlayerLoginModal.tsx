import React, { useState } from 'react';
import { X, KeyRound, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { apiService } from '../services/api';
import { Logo } from './Logo';
import { ClubInfo } from '../types';

interface PlayerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (playerData: any) => void;
  clubInfo?: ClubInfo;
}

export const PlayerLoginModal: React.FC<PlayerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  clubInfo,
}) => {
  const [pinCode, setPinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pinCode.trim()) {
      setErrorMsg('الرجاء إدخال الرمز السري');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.verifyPlayerPin(pinCode.trim());
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        setPinCode('');
        onClose();
      } else {
        setErrorMsg(res.message || 'الرمز السري غير صحيح!');
      }
    } catch {
      setErrorMsg('حدث خطأ أثناء الاتصال، حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-white">
      <div className="bg-[#1c1212] border-2 border-amber-500/80 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 via-amber-950 to-red-950 p-4 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-amber-500/20 border border-amber-400/40 shadow-sm">
              <Logo size={28} customLogoUrl={clubInfo?.logoUrl} />
            </div>
            <div>
              <h2 className="font-black text-sm text-amber-300">دخول اللاعبين</h2>
              <p className="text-[10px] text-amber-100/70 font-bold">فريق السلام بكثيبة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-amber-500/20 border-2 border-amber-500/50 rounded-2xl flex items-center justify-center mx-auto text-amber-400 shadow-md">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white">أدخل الرمز السري (PIN)</h3>
            <p className="text-sm text-gray-300">
              يرجى كتابة الرمز السري المخصص لك كلاعب
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-950/80 border border-red-600/80 rounded-xl p-2.5 flex items-center gap-2 text-red-200 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PIN Input field */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold text-amber-300 text-center">
              الرمز السري الخاص باللاعب
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              required
              value={pinCode}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val.length <= 6) setPinCode(val);
              }}
              placeholder="1234"
              className="w-full bg-[#100808] border-2 border-amber-500/50 focus:border-amber-400 rounded-2xl py-3 text-center text-2xl tracking-[0.25em] font-black text-amber-300 placeholder-gray-600 outline-none shadow-inner font-mono dir-ltr"
            />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-200/90 leading-relaxed text-center">
            💡 أدخل الرمز السري الذي تم تعيينه لك من قِبل إدارة الفريق في لوحة التحكم
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={loading || pinCode.trim().length === 0}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-black text-xs py-3 rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'جاري التحقق...' : 'تأكيد الدخول'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs px-4 py-3 rounded-xl transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
