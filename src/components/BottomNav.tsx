import React from 'react';
import { Home, Users, Camera, Calendar, Newspaper, Info } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'team', label: 'الفريق', icon: Users },
    { id: 'gallery', label: 'المعرض', icon: Camera },
    { id: 'matches', label: 'المباريات', icon: Calendar },
    { id: 'news', label: 'الأخبار', icon: Newspaper },
    { id: 'about', label: 'من نحن', icon: Info },
  ];

  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#120505]/95 border-t-2 border-amber-500/50 backdrop-blur-lg px-1 py-1.5 dir-rtl shadow-[0_-8px_30px_rgba(0,0,0,0.9)] max-w-md mx-auto select-none safe-area-bottom"
    >
      <div className="grid grid-cols-6 gap-0.5 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 relative active:scale-90 min-h-[46px] cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-105 border border-amber-300'
                  : 'text-gray-400 hover:text-amber-200 hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 ${
                  isActive ? 'text-black scale-110 drop-shadow-sm' : 'text-amber-400/80'
                }`}
              />
              <span
                className={`text-[9px] sm:text-[9.5px] mt-0.5 whitespace-nowrap leading-none tracking-tight ${
                  isActive ? 'font-black text-black' : 'font-bold text-gray-300'
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <div className="absolute -bottom-1 w-5 h-1 bg-amber-200 rounded-full shadow-[0_0_8px_rgba(253,224,71,0.9)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

