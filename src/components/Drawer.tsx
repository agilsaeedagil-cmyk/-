import React from 'react';
import { Logo } from './Logo';
import { Home, Users, Calendar, Newspaper, ShoppingBag, ShieldCheck, Info, LogIn, X, Camera, Image as ImageIcon } from 'lucide-react';
import { ClubInfo } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAdmin: () => void;
  clubInfo?: ClubInfo;
  userRole?: 'player' | 'fan';
  loggedInPlayer?: any;
  onLogoutPlayer?: () => void;
  onShowWelcomePortal?: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenAdmin,
  clubInfo,
  userRole = 'fan',
  loggedInPlayer,
  onLogoutPlayer,
  onShowWelcomePortal,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleNav = (tab: string) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-start dir-rtl">
      {/* Drawer Panel Sliding in from Right (RTL) */}
      <div className="w-80 max-w-[85vw] bg-[#180a0a] border-l-2 border-amber-500/50 h-full flex flex-col justify-between text-white dir-rtl shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="bg-gradient-to-b from-[#3a0303] via-[#240505] to-[#180a0a] p-5 border-b border-amber-500/30 relative flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 p-2 rounded-full text-amber-300 border border-amber-500/30 transition-all active:scale-95 shadow-md"
            title={t.close}
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-1 rounded-full bg-amber-500/20 border border-amber-400/40 shadow-md mb-1">
            <Logo size={64} customLogoUrl={clubInfo?.logoUrl} />
          </div>
          <h2 className="font-black text-white text-base mt-1 drop-shadow-sm">{clubInfo?.name || t.appName}</h2>
          <span className="text-[11px] bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 text-amber-300 border border-amber-400/50 px-3 py-0.5 rounded-full font-black mt-1 shadow-sm">
            {clubInfo?.nickname || t.clubNickname}
          </span>
        </div>

        {/* Scrollable Navigation Options - Clean, Streamlined Hierarchy */}
        <div className="p-3.5 overflow-y-auto flex-1 space-y-1.5 text-xs dir-rtl text-right">
          <button
            onClick={() => handleNav('home')}
            className={`w-full p-3 rounded-xl font-black flex items-center justify-start gap-3 transition-all text-right ${
              activeTab === 'home'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-200'
                : 'bg-black/30 hover:bg-amber-500/10 text-gray-200 border border-amber-500/10'
            }`}
          >
            <Home className={`w-4 h-4 ${activeTab === 'home' ? 'text-black' : 'text-amber-400'}`} />
            <span className="text-right">{t.home}</span>
          </button>

          <button
            onClick={() => handleNav('team')}
            className={`w-full p-3 rounded-xl font-black flex items-center justify-start gap-3 transition-all text-right ${
              activeTab === 'team'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-200'
                : 'bg-black/30 hover:bg-amber-500/10 text-gray-200 border border-amber-500/10'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'team' ? 'text-black' : 'text-amber-400'}`} />
            <span className="text-right">{t.team}</span>
          </button>

          <button
            onClick={() => handleNav('gallery')}
            className={`w-full p-3 rounded-xl font-black flex items-center justify-start gap-3 transition-all text-right ${
              activeTab === 'gallery'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-200'
                : 'bg-black/30 hover:bg-amber-500/10 text-gray-200 border border-amber-500/10'
            }`}
          >
            <Camera className={`w-4 h-4 ${activeTab === 'gallery' ? 'text-black' : 'text-amber-400'}`} />
            <span className="text-right">المعرض 📸</span>
          </button>

          <button
            onClick={() => handleNav('matches')}
            className={`w-full p-3 rounded-xl font-black flex items-center justify-start gap-3 transition-all text-right ${
              activeTab === 'matches'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-200'
                : 'bg-black/30 hover:bg-amber-500/10 text-gray-200 border border-amber-500/10'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'matches' ? 'text-black' : 'text-amber-400'}`} />
            <span className="text-right">{t.matches}</span>
          </button>

          <button
            onClick={() => handleNav('news')}
            className={`w-full p-3 rounded-xl font-black flex items-center justify-start gap-3 transition-all text-right ${
              activeTab === 'news'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-200'
                : 'bg-black/30 hover:bg-amber-500/10 text-gray-200 border border-amber-500/10'
            }`}
          >
            <Newspaper className={`w-4 h-4 ${activeTab === 'news' ? 'text-black' : 'text-amber-400'}`} />
            <span className="text-right">{t.news}</span>
          </button>

          <button
            onClick={() => handleNav('about')}
            className={`w-full p-3 rounded-xl font-black flex items-center justify-start gap-3 transition-all text-right ${
              activeTab === 'about'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-200'
                : 'bg-black/30 hover:bg-amber-500/10 text-gray-200 border border-amber-500/10'
            }`}
          >
            <Info className={`w-4 h-4 ${activeTab === 'about' ? 'text-black' : 'text-amber-400'}`} />
            <span className="text-right">{t.about}</span>
          </button>

          <button
            onClick={() => handleNav('store')}
            className={`w-full p-3 rounded-xl font-black flex items-center justify-start gap-3 transition-all text-right ${
              activeTab === 'store'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-200'
                : 'bg-black/30 hover:bg-amber-500/10 text-gray-200 border border-amber-500/10'
            }`}
          >
            <ShoppingBag className={`w-4 h-4 ${activeTab === 'store' ? 'text-black' : 'text-amber-400'}`} />
            <span className="text-right">{t.store}</span>
          </button>

          {/* Admin Control Trigger */}
          <button
            onClick={() => {
              onClose();
              onOpenAdmin();
            }}
            className="w-full p-3 rounded-xl font-black flex items-center justify-start gap-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-right shadow-md transition-all active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-right">{t.adminPanel}</span>
          </button>

          {/* Player Logout Section (Only shown if currently logged in as player) */}
          {userRole === 'player' && (
            <button
              onClick={() => {
                onClose();
                if (onLogoutPlayer) onLogoutPlayer();
              }}
              className="w-full p-3 rounded-xl font-black flex items-center justify-between bg-emerald-950/60 hover:bg-red-950/60 text-emerald-300 hover:text-red-300 border border-emerald-500/40 hover:border-red-500/40 transition-all text-right shadow-md"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>⚽ لاعب: {loggedInPlayer?.name || 'مسجل'}</span>
              </div>
              <span className="text-[10px] bg-red-900/60 text-white px-2 py-0.5 rounded-md font-bold">
                تسجيل الخروج
              </span>
            </button>
          )}

          {/* Return to Initial Role Selection Portal */}
          {onShowWelcomePortal && (
            <button
              onClick={() => {
                onClose();
                onShowWelcomePortal();
              }}
              className="w-full p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gray-900/80 hover:bg-gray-800 text-amber-300/90 border border-amber-500/20 transition-all text-center"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>العودة لشاشة البدء وتغيير وضع الدخول</span>
            </button>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-[#120606] border-t border-amber-500/20 text-center text-[11px] text-gray-400 space-y-1">
          <p className="font-extrabold text-amber-300">© 2026 جميع الحقوق محفوظة لفريق السلام الرياضي بكثيبة</p>
          <p className="text-[10px] text-gray-400 font-bold">تطوير : عقيل سعيد بانصر</p>
        </div>
      </div>

      {/* Backdrop overlay click */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
