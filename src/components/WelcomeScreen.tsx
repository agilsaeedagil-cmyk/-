import React from 'react';
import { UserCheck, Users, Shield, Trophy, KeyRound, Sparkles, ArrowRight, X } from 'lucide-react';
import { Logo } from './Logo';
import { ClubInfo } from '../types';

interface WelcomeScreenProps {
  onSelectFan: () => void;
  onSelectPlayer: () => void;
  clubInfo?: ClubInfo;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectFan,
  onSelectPlayer,
  clubInfo,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#300202] via-[#1a0505] to-[#0d0303] text-white flex flex-col justify-between p-4 dir-rtl relative overflow-hidden">
      {/* Top Close / Cancel Button X */}
      <button
        onClick={onSelectFan}
        className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/80 text-amber-300 border border-amber-500/40 shadow-lg transition-transform active:scale-95 flex items-center gap-1 text-xs font-bold"
        title="إلغاء وتصفح التطبيق كمشجع"
        aria-label="إلغاء وتصفح التطبيق"
      >
        <X className="w-5 h-5 text-amber-400" />
      </button>
      {/* Background Decorative Glows */}
      <div className="absolute top-10 right-1/2 translate-x-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="relative z-10 pt-6 text-center space-y-3">
        <div className="inline-block p-2 rounded-full bg-amber-500/10 border-2 border-amber-400/40 shadow-2xl backdrop-blur-md animate-bounce-slow">
          <Logo size={84} customLogoUrl={clubInfo?.logoUrl} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 drop-shadow-md">
            {clubInfo?.name || 'فريق السلام بكثيبة'}
          </h1>
          <p className="text-xs text-amber-200/80 font-bold mt-1 max-w-xs mx-auto">
            {clubInfo?.slogan || 'التطبيق الرسمي لفريق السلام بكثيبة'}
          </p>
        </div>
      </div>

      {/* Role Selection Cards Container */}
      <div className="relative z-10 my-auto py-6 max-w-sm mx-auto w-full space-y-4">
        <div className="text-center space-y-1 mb-2">
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black px-3.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            اختر طريقة الدخول للتطبيق
          </span>
        </div>

        {/* Option 1: Player Entrance Card (دخول خاص للاعبين) */}
        <button
          onClick={onSelectPlayer}
          className="w-full text-right bg-gradient-to-r from-amber-950/80 via-red-950/90 to-amber-950/80 hover:from-amber-900/90 hover:to-red-900/90 border-2 border-amber-500/70 hover:border-amber-400 rounded-3xl p-5 shadow-[0_10px_25px_rgba(217,119,6,0.25)] transition-all duration-300 active:scale-95 group relative overflow-hidden"
        >
          {/* Badge */}
          <div className="absolute top-0 left-0 bg-amber-500 text-black font-black text-[10px] px-3 py-1 rounded-br-2xl shadow-md flex items-center gap-1">
            <KeyRound className="w-3 h-3" />
            <span>رمز PIN سري</span>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1 flex-1 pr-1">
              <h2 className="font-black text-base text-amber-300 flex items-center gap-1.5">
                <span>دخول خاص للاعبين</span>
              </h2>
              <p className="text-xs text-amber-100/80 font-medium leading-relaxed">
                هذا الخيار خاص للاعبي فريق السلام وذلك لمعرفة تأكيدهم على الحضور أو الغياب عن التمرين.
              </p>
            </div>
          </div>
        </button>

        {/* Option 2: Fan Entrance Card (الدخول كمشجع) */}
        <button
          onClick={onSelectFan}
          className="w-full text-right bg-gradient-to-r from-gray-900/90 via-black/90 to-gray-900/90 hover:from-gray-800/90 hover:to-gray-900/90 border-2 border-gray-700/80 hover:border-amber-500/50 rounded-3xl p-5 shadow-xl transition-all duration-300 active:scale-95 group relative overflow-hidden"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gray-800 text-amber-400 border border-gray-700 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>

            <div className="space-y-1 flex-1 pr-1">
              <h2 className="font-black text-base text-white flex items-center gap-1.5">
                <span>الدخول كمشجع</span>
              </h2>
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                حساب المشجع يتابع الأخبار، نتائج المباريات مواعيد التمارين والمزيد
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Footer info */}
      <div className="relative z-10 text-center pb-4 text-[11px] text-gray-300 font-semibold space-y-1">
        <p className="flex items-center justify-center gap-1">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>تطبيق السلام بكثيبة — غيل باوزير</span>
        </p>
        <p className="text-[10px]">جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};
