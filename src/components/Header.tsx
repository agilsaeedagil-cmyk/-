import React from 'react';
import { Menu, Bell, Settings, KeyRound, UserCheck, Users, Shield, Trophy, Award } from 'lucide-react';
import { Logo } from './Logo';
import { ClubStats, ClubInfo } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  stats: ClubStats;
  clubInfo?: ClubInfo;
  userRole?: 'player' | 'fan';
  loggedInPlayer?: any;
  onOpenPlayerLogin?: () => void;
  onLogoutPlayer?: () => void;
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  unreadNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  clubInfo,
  userRole = 'fan',
  loggedInPlayer,
  onOpenPlayerLogin,
  onLogoutPlayer,
  onOpenDrawer,
  onOpenNotifications,
  onOpenSettings,
  unreadNotificationsCount,
}) => {
  const { t, shareApp, toggleLanguage } = useLanguage();

  return (
    <header className="bg-gradient-to-b from-[#4a0202] via-[#240303] to-[#120707] text-white pt-3 pb-4 px-4 border-b-2 border-amber-500/40 sticky top-0 z-20 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
      {/* Top Controls Row */}
      <div className="flex items-center justify-between mb-2 dir-rtl">
        {/* Right Side in RTL (Menu Toggle - Three Lines) */}
        <button
          onClick={onOpenDrawer}
          className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-amber-300 border border-amber-500/30 transition-all active:scale-95 shadow-md"
          title="القائمة"
          aria-label="القائمة الرئيسية"
        >
          <Menu className="w-5 h-5 text-amber-400" />
        </button>

        {/* Center Role Badge / Player Login Trigger */}
        {userRole === 'player' ? (
          <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-black px-3 py-1 rounded-full border border-amber-300 shadow-lg font-black text-[11px]">
            <UserCheck className="w-3.5 h-3.5" />
            <span className="truncate max-w-[110px]">⚽ {loggedInPlayer?.name || 'حساب لاعب'}</span>
            {onLogoutPlayer && (
              <button
                onClick={onLogoutPlayer}
                className="mr-1 text-black/80 hover:text-red-900 font-bold text-[10px] bg-black/10 px-1.5 py-0.5 rounded-md hover:bg-black/20"
                title="تسجيل الخروج والعودة كـ مشجع"
              >
                خروج
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenPlayerLogin}
            className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-[11px] px-3.5 py-1 rounded-full border border-amber-300 shadow-lg transition-all active:scale-95 flex items-center gap-1.5 animate-pulse"
            title="انقر لإدخال الرمز السري وتأكيد الحضور"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>🔑 دخول اللاعبين</span>
          </button>
        )}

        {/* Left Side in RTL (Notifications & Settings) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenNotifications}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-red-300 border border-red-500/30 transition-all active:scale-95 relative shadow-md"
            title="الإشعارات"
            aria-label="الإشعارات"
          >
            <Bell className="w-4 h-4 text-red-400" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-md border border-amber-300">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-amber-300 border border-amber-500/30 transition-all active:scale-95 shadow-md"
            title="الإعدادات"
            aria-label="الإعدادات"
          >
            <Settings className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Club Identity Hero Badge */}
      <div className="flex flex-col items-center justify-center my-2 text-center">
        <div className="relative p-1.5 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_25px_rgba(251,191,36,0.5)] border-2 border-amber-300">
          <Logo size={92} customLogoUrl={clubInfo?.logoUrl} />
        </div>
        <h1 className="text-xl font-black text-white mt-2 tracking-wide font-arabic drop-shadow-[0_2px_8px_rgba(220,38,38,0.8)]">
          {clubInfo?.name || 'فريق السلام بكثيبة'}
        </h1>
        <div className="flex items-center gap-1.5 mt-1 bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/60 px-3.5 py-0.5 rounded-full shadow-md">
          <span className="text-amber-300 text-xs font-black drop-shadow-[0_0_5px_rgba(250,204,21,0.6)]">
            👑 {clubInfo?.nickname || 'صقور الريف'} 👑
          </span>
        </div>
      </div>

      {/* Quick Stats Grid Row */}
      <div className="grid grid-cols-4 gap-2 mt-3.5 dir-rtl">
        <div className="bg-gradient-to-b from-[#2a0e0e] to-[#160808] border border-amber-500/30 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-md hover:border-amber-400 transition-colors">
          <div className="text-amber-400 mb-0.5">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-white">{stats.playersCount}</span>
          <span className="text-[10px] text-amber-200/80 font-bold">اللاعبون</span>
        </div>

        <div className="bg-gradient-to-b from-[#2a0e0e] to-[#160808] border border-red-500/30 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-md hover:border-red-400 transition-colors">
          <div className="text-red-400 mb-0.5">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-white">{stats.matchesCount}</span>
          <span className="text-[10px] text-red-200/80 font-bold">المباريات</span>
        </div>

        <div className="bg-gradient-to-b from-[#2a0e0e] to-[#160808] border border-amber-500/30 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-md hover:border-amber-400 transition-colors">
          <div className="text-amber-400 mb-0.5">
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-white">{stats.winsCount}</span>
          <span className="text-[10px] text-amber-200/80 font-bold">الانتصارات</span>
        </div>

        <div className="bg-gradient-to-b from-[#2a0e0e] to-[#160808] border border-amber-500/30 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-md hover:border-amber-400 transition-colors">
          <div className="text-amber-400 mb-0.5">
            <Award className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-white">{stats.achievementsCount}</span>
          <span className="text-[10px] text-amber-200/80 font-bold">الإنجازات</span>
        </div>
      </div>
    </header>
  );
};
