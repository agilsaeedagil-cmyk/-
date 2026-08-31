import React from 'react';
import { X, Moon, Sun, Bell, Globe, UserCheck, Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  userRole?: 'player' | 'fan';
  onToggleUserRole?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  userRole = 'player',
  onToggleUserRole,
}) => {
  const { language, toggleLanguage, setAppLanguage } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1111] border-2 border-red-800/80 rounded-3xl w-full max-w-sm p-5 shadow-2xl text-white dir-rtl space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-red-900/40 pb-3">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-amber-400" />
            <h2 className="font-extrabold text-base text-white">
              {language === 'ar' ? 'الإعدادات وتحديد الصلاحية' : 'Settings & Role Selection'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* User Role Selection (Player vs Fan) */}
          <div className="p-3 bg-[#120a0a] rounded-2xl border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">
                  {language === 'ar' ? 'نوع الحساب والتنبيهات' : 'Account Role & Alerts'}
                </span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                {userRole === 'player'
                  ? language === 'ar' ? 'لاعب (Player)' : 'Player Account'
                  : language === 'ar' ? 'مشجع (Fan)' : 'Fan Account'}
              </span>
            </div>

            <p className="text-[10px] text-gray-400">
              {userRole === 'player'
                ? (language === 'ar'
                    ? 'حساب اللاعب يتلقى إشعارات التمارين الفورية للرد بالحضور أو الاعتذار.'
                    : 'Player accounts receive instant training alerts to confirm attendance or excuses.')
                : (language === 'ar'
                    ? 'حساب المشجع يتابع الأخبار، نتائج المباريات والعداد التنازلي فقط.'
                    : 'Fan accounts follow club news, live match results, and countdowns.')}
            </p>

            {onToggleUserRole && (
              <button
                onClick={onToggleUserRole}
                className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-extrabold py-2 rounded-xl text-xs shadow-md transition-all mt-1"
              >
                {language === 'ar'
                  ? `تبديل إلى ${userRole === 'player' ? 'حساب مشجع 📣' : 'حساب لاعب ⚽'}`
                  : `Switch to ${userRole === 'player' ? 'Fan Account 📣' : 'Player Account ⚽'}`}
              </button>
            )}
          </div>

          {/* Dark Mode Switch */}
          <div className="flex items-center justify-between p-3 bg-[#120a0a] rounded-2xl border border-white/5">
            <div className="flex items-center gap-2.5">
              {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
              <span className="font-bold text-white">
                {language === 'ar' ? 'الوضع الداكن' : 'Dark Mode'}
              </span>
            </div>
            <button
              onClick={onToggleDarkMode}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                isDarkMode ? 'bg-red-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isDarkMode ? 'translate-x-0' : '-translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* Notifications Switch */}
          <div className="flex items-center justify-between p-3 bg-[#120a0a] rounded-2xl border border-white/5">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-red-400" />
              <span className="font-bold text-white">
                {language === 'ar' ? 'الإشعارات' : 'Notifications'}
              </span>
            </div>
            <button
              className="w-11 h-6 rounded-full bg-red-600 relative p-0.5"
            >
              <div className="w-5 h-5 rounded-full bg-white translate-x-0" />
            </button>
          </div>

          {/* Language Selection & Immediate Switch */}
          <div className="flex items-center justify-between p-3 bg-[#120a0a] rounded-2xl border border-amber-500/30">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-blue-400" />
              <div>
                <span className="font-bold text-white block">
                  {language === 'ar' ? 'لغة التطبيق (Language)' : 'App Language'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {language === 'ar' ? 'انقر للتبديل للإنجليزية' : 'Click to switch to Arabic'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleLanguage}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black px-3 py-1.5 rounded-xl border border-amber-300 shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              title={language === 'ar' ? 'التحويل للإنجليزية' : 'Switch to Arabic'}
            >
              <span className="text-sm">{language === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
              <span>{language === 'ar' ? 'العربية' : 'English'}</span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
        >
          {language === 'ar' ? 'حفظ وإغلاق' : 'Save & Close'}
        </button>
      </div>
    </div>
  );
};
