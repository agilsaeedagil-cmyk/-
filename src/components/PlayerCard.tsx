import React from 'react';
import { Player, Position } from '../types';
import { MapPin } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onClick: () => void;
  layout?: 'grid' | 'wide';
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, layout = 'grid' }) => {
  const getPositionBadgeColor = (pos: Position) => {
    switch (pos) {
      case 'حارس مرمى':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'مدافع':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'لاعب وسط':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'مهاجم':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
  };

  const getPositionIcon = (pos: Position) => {
    switch (pos) {
      case 'حارس مرمى':
        return '🧤';
      case 'مدافع':
        return '🛡️';
      case 'لاعب وسط':
        return '🎯';
      case 'مهاجم':
        return '⚡';
      default:
        return '⚽';
    }
  };

  // Calculate real player stats
  const matches = player.matchesPlayed ?? 0;
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;

  if (layout === 'wide') {
    return (
      <div
        onClick={onClick}
        className="group relative bg-gradient-to-l from-[#2d1f1f] via-[#1c1313] to-[#100a0a] border-2 border-amber-500/35 hover:border-amber-400 rounded-2xl p-3 shadow-[0_8px_25px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_30px_rgba(217,119,6,0.25)] active:scale-[0.98] active:brightness-125 transition-all duration-300 cursor-pointer flex items-center gap-3.5 select-none dir-rtl overflow-hidden w-full"
      >
        {/* Top Metallic Gold Border Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600 z-20" />

        {/* Shimmer light pass on touch/hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-500 pointer-events-none z-20" />

        {/* Player Photo on Right */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-black/60 border border-amber-500/30 shadow-inner">
          <img
            src={player.image}
            alt={player.name}
            className="w-full h-full object-cover group-hover:scale-105 group-active:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

          {/* Player Jersey Number Badge */}
          {player.number && (
            <div className="absolute top-1.5 right-1.5 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-black font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-md border border-amber-200 z-10">
              #{player.number}
            </div>
          )}
        </div>

        {/* Player Info & Stats on Left */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 w-fit ${getPositionBadgeColor(
                  player.position
                )}`}
              >
                <span>{getPositionIcon(player.position)}</span>
                <span>{player.position}</span>
              </span>

              <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                <span className="truncate max-w-[110px]">{player.location || 'كثيبة'}</span>
              </div>
            </div>

            <h3 className="font-black text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors truncate">
              {player.name}
            </h3>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-1.5 bg-black/50 p-1.5 rounded-xl border border-white/5 text-center text-[9px] mt-2">
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-[8px]">مباريات</span>
              <span className="font-black text-amber-300 text-[10px]">{matches}</span>
            </div>
            <div className="flex flex-col items-center border-r border-l border-white/10">
              <span className="text-gray-400 text-[8px]">{player.position === 'حارس مرمى' ? 'نظافة' : 'أهداف'}</span>
              <span className="font-black text-red-400 text-[10px]">{goals}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-[8px]">صناعة</span>
              <span className="font-black text-emerald-400 text-[10px]">{assists}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group relative bg-gradient-to-b from-[#2d1f1f] via-[#1c1313] to-[#0d0808] border-2 border-amber-500/35 hover:border-amber-400 rounded-2xl overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_30px_rgba(217,119,6,0.25)] active:scale-95 active:brightness-125 transition-all duration-300 cursor-pointer flex flex-col justify-between select-none dir-rtl"
    >
      {/* Top Metallic Gold Border Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600 z-20" />

      {/* Shimmer light pass on touch/hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-500 pointer-events-none z-20" />

      {/* Player Photo Section */}
      <div className="relative w-full aspect-[4/5] bg-black/60 overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/15 via-red-950/30 to-transparent" />

        <img
          src={player.image}
          alt={player.name}
          className="w-full h-full object-cover group-hover:scale-105 group-active:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0808] via-transparent to-black/40" />

        {/* Top Right: Player Jersey Number Badge */}
        {player.number && (
          <div className="absolute top-2.5 right-2.5 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-black font-black text-[10px] px-2 py-0.5 rounded-lg shadow-lg border border-amber-200 flex items-center gap-1 z-10">
            <span className="text-[9px] font-black">رقم القميص</span>
            <span>{player.number}</span>
          </div>
        )}

        {/* Position Badge Overlay */}
        <div className="absolute bottom-2 right-2 left-2 flex justify-between items-end z-10">
          <span
            className={`text-[10px] font-black px-2.5 py-1 rounded-lg border backdrop-blur-md shadow-lg flex items-center gap-1 ${getPositionBadgeColor(
              player.position
            )}`}
          >
            <span>{getPositionIcon(player.position)}</span>
            <span>{player.position}</span>
          </span>
        </div>
      </div>

      {/* Player Details Container */}
      <div className="p-3 bg-[#110b0b] space-y-2 border-t border-amber-500/20">
        {/* Player Name */}
        <div className="text-center">
          <h3 className="font-black text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-1 tracking-wide">
            {player.name}
          </h3>
          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 mt-0.5">
            <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="truncate">{player.location || 'كثيبة - غيل باوزير'}</span>
          </div>
        </div>

        {/* Tactical Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-1 bg-black/60 p-1.5 rounded-xl border border-white/5 text-center text-[9px]">
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-[8px]">مباريات</span>
            <span className="font-black text-amber-300 text-[10px]">{matches}</span>
          </div>
          <div className="flex flex-col items-center border-r border-l border-white/10">
            <span className="text-gray-400 text-[8px]">{player.position === 'حارس مرمى' ? 'نظافة' : 'أهداف'}</span>
            <span className="font-black text-red-400 text-[10px]">{goals}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-[8px]">صناعة</span>
            <span className="font-black text-emerald-400 text-[10px]">{assists}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
