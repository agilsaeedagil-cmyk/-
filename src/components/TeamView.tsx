import React, { useState } from 'react';
import { Search, MapPin, User, Shield, Crosshair, Award, X, AlertCircle } from 'lucide-react';
import { Player, Position, ClubInfo } from '../types';
import { PlayerCard } from './PlayerCard';

interface TeamViewProps {
  players: Player[];
  clubInfo?: ClubInfo;
}

export const TeamView: React.FC<TeamViewProps> = ({ players, clubInfo }) => {
  const [selectedPosition, setSelectedPosition] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [cardLayout, setCardLayout] = useState<'grid' | 'wide'>(() => {
    try {
      const saved = localStorage.getItem('salam_player_card_layout');
      if (saved === 'wide' || saved === 'grid') return saved;
    } catch {}
    return 'grid';
  });

  const handleLayoutChange = (layout: 'grid' | 'wide') => {
    setCardLayout(layout);
    try {
      localStorage.setItem('salam_player_card_layout', layout);
    } catch {}
  };

  const positions: { label: string; value: string }[] = [
    { label: 'الكل', value: 'الكل' },
    { label: 'حارس مرمى', value: 'حارس مرمى' },
    { label: 'مدافع', value: 'مدافع' },
    { label: 'لاعب وسط', value: 'لاعب وسط' },
    { label: 'مهاجم', value: 'مهاجم' },
  ];

  // Position ordering hierarchy for clean tactical squad sorting
  const positionOrder: Record<string, number> = {
    'حارس مرمى': 1,
    'مدافع': 2,
    'لاعب وسط': 3,
    'مهاجم': 4,
  };

  const coachPlayer = players.find((p) => p.isCoach);
  const coachName = clubInfo?.coachName || coachPlayer?.name || 'معاذ بامطرف (بكرون)';
  const coachTitle = clubInfo?.coachTitle || 'مدرب الفريق الأول';
  const coachContract = clubInfo?.coachContract || coachPlayer?.contractType || 'عقد دائم';
  const coachPhoto = clubInfo?.coachPhotoUrl || coachPlayer?.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  // Filter and sort players by position rank and jersey number
  const filteredPlayers = players
    .filter((p) => !p.isCoach)
    .filter((p) => selectedPosition === 'الكل' || p.position === selectedPosition)
    .filter((p) => (p.name || '').includes(searchQuery) || (p.number && String(p.number).includes(searchQuery)))
    .sort((a, b) => {
      const posA = positionOrder[a.position || ''] || 99;
      const posB = positionOrder[b.position || ''] || 99;
      if (posA !== posB) return posA - posB;
      return (a.number || 99) - (b.number || 99);
    });

  // Group players by position for tactical lineup view
  const groupedPlayers = [
    { title: '🧤 حراس المرمى', pos: 'حارس مرمى', items: filteredPlayers.filter((p) => p.position === 'حارس مرمى') },
    { title: '🛡️ خط الدفاع', pos: 'مدافع', items: filteredPlayers.filter((p) => p.position === 'مدافع') },
    { title: '🎯 خط الوسط', pos: 'لاعب وسط', items: filteredPlayers.filter((p) => p.position === 'لاعب وسط') },
    { title: '⚡ خط الهجوم', pos: 'مهاجم', items: filteredPlayers.filter((p) => p.position === 'مهاجم') },
    { title: '⚽ خيارات إضافية', pos: 'غير محدد', items: filteredPlayers.filter((p) => !['حارس مرمى', 'مدافع', 'لاعب وسط', 'مهاجم'].includes(p.position || '')) },
  ].filter((group) => group.items.length > 0);

  const getPositionBadgeColor = (pos: Position) => {
    switch (pos) {
      case 'حارس مرمى':
        return 'bg-purple-900/60 text-purple-300 border-purple-500/40';
      case 'مدافع':
        return 'bg-blue-900/60 text-blue-300 border-blue-500/40';
      case 'لاعب وسط':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40';
      case 'مهاجم':
        return 'bg-red-900/60 text-red-300 border-red-500/40';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-600';
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

  return (
    <div className="space-y-4 pb-8 px-4 text-white dir-rtl">
      {/* View Title */}
      <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <span>👥</span> قائمة الفريق
        </h2>
        <span className="text-xs bg-red-900/40 text-red-300 border border-red-700/40 px-3 py-1 rounded-full font-bold">
          {filteredPlayers.length} لاعب
        </span>
      </div>

      {/* Head Coach Highlight Card */}
      <div className="bg-gradient-to-r from-[#380e0e] via-[#220909] to-[#120505] border-2 border-amber-500/50 rounded-2xl p-3.5 shadow-lg flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 flex-shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.4)]">
            <img src={coachPhoto} alt={coachName} className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">
              👑 {coachTitle}
            </span>
            <h3 className="font-extrabold text-white text-base">{coachName}</h3>
            <span className="inline-block mt-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/30 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-400/50">
              {coachContract}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن لاعب باسمه أو رقمه..."
          className="w-full bg-[#180a0a] border border-amber-500/30 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
        />
        <Search className="w-4 h-4 text-amber-400 absolute right-3.5 top-3.5" />
      </div>

      {/* Layout Mode Selector (📱 بطاقات (2) | 🃏 بطاقة واسعة) */}
      <div className="bg-[#1a0f0f] p-1.5 rounded-2xl border border-amber-500/30 flex items-center justify-between gap-2 shadow-md">
        <span className="text-xs font-black text-amber-400 pr-2 flex items-center gap-1.5">
          <span>🎨 نمط العرض:</span>
        </span>
        <div className="flex items-center gap-1.5 flex-1 max-w-[270px]">
          <button
            onClick={() => handleLayoutChange('grid')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
              cardLayout === 'grid'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] border border-amber-200'
                : 'bg-[#100808] text-gray-300 hover:text-white border border-white/10'
            }`}
          >
            <span>📱</span>
            <span>بطاقات (2)</span>
          </button>
          <button
            onClick={() => handleLayoutChange('wide')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
              cardLayout === 'wide'
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] border border-amber-200'
                : 'bg-[#100808] text-gray-300 hover:text-white border border-white/10'
            }`}
          >
            <span>🃏</span>
            <span>بطاقة واسعة</span>
          </button>
        </div>
      </div>

      {/* Position Filters Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {positions.map((pos) => (
          <button
            key={pos.value}
            onClick={() => setSelectedPosition(pos.value)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-black transition-all active:scale-95 ${
              selectedPosition === pos.value
                ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] border border-red-400'
                : 'bg-[#180d0d] text-gray-300 hover:bg-[#281414] border border-amber-500/20'
            }`}
          >
            {pos.label}
          </button>
        ))}
      </div>

      {/* Players Section Grouped or Filtered */}
      {selectedPosition === 'الكل' && !searchQuery ? (
        groupedPlayers.length === 0 ? (
          <div className="text-center py-12 bg-[#171212] rounded-2xl border border-white/5 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-xs text-gray-400 font-semibold">لا يوجد لاعبين مسجلين في الفريق حالياً</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedPlayers.map((group) => (
              <div key={group.pos} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                  <h3 className="font-extrabold text-xs text-amber-400 flex items-center gap-1.5">
                    <span>{group.title}</span>
                  </h3>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">
                    {group.items.length} لاعبين
                  </span>
                </div>

                {/* Cards Grid */}
                <div className={`grid gap-3.5 ${cardLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1 w-full'}`}>
                  {group.items.map((player) => (
                    <PlayerCard key={player.id} player={player} layout={cardLayout} onClick={() => setSelectedPlayer(player)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Regular Flat Grid when filtered or searching */
        filteredPlayers.length === 0 ? (
          <div className="text-center py-12 bg-[#171212] rounded-2xl border border-white/5 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-xs text-gray-400 font-semibold">لا يوجد لاعبين يطابقون البحث أو الفلتر المحدد</p>
          </div>
        ) : (
          <div className={`grid gap-3.5 ${cardLayout === 'grid' ? 'grid-cols-2' : 'grid-cols-1 w-full'}`}>
            {filteredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} layout={cardLayout} onClick={() => setSelectedPlayer(player)} />
            ))}
          </div>
        )
      )}

      {/* Player Detailed Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1616] border-2 border-red-700/60 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 dir-rtl">
            {/* Modal Header Image */}
            <div className="relative h-56 w-full">
              <img
                src={selectedPlayer.image}
                alt={selectedPlayer.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1e1616] via-transparent to-black/50" />

              <button
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-3 left-3 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/90"
              >
                <X className="w-5 h-5" />
              </button>

              {selectedPlayer.number && (
                <div className="absolute top-3 right-3 bg-red-600 text-white font-black text-xs px-3 py-1 rounded-lg shadow-md border border-red-400">
                  رقم القميص {selectedPlayer.number}
                </div>
              )}

              <div className="absolute bottom-3 right-4 left-4">
                <span className="bg-amber-500 text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  {selectedPlayer.position}
                </span>
                <h2 className="text-lg font-black text-white mt-1">{selectedPlayer.name}</h2>
              </div>
            </div>

            {/* Modal Player Stats Body */}
            <div className="p-4 space-y-4 text-xs text-gray-300">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#120d0d] p-2.5 rounded-xl border border-red-900/30">
                  <span className="block font-black text-amber-400 text-base">
                    {selectedPlayer.matchesPlayed ?? 0}
                  </span>
                  <span className="text-[10px] text-gray-400">المباريات</span>
                </div>
                <div className="bg-[#120d0d] p-2.5 rounded-xl border border-red-900/30">
                  <span className="block font-black text-red-400 text-base">
                    {selectedPlayer.goals ?? 0}
                  </span>
                  <span className="text-[10px] text-gray-400">الأهداف</span>
                </div>
                <div className="bg-[#120d0d] p-2.5 rounded-xl border border-red-900/30">
                  <span className="block font-black text-blue-400 text-base">
                    {selectedPlayer.assists ?? 0}
                  </span>
                  <span className="text-[10px] text-gray-400">التمريرات</span>
                </div>
              </div>

              <div className="space-y-2 bg-[#120d0d] p-3 rounded-xl border border-red-900/20">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">العمر:</span>
                  <span className="font-bold text-white">{selectedPlayer.age ? `${selectedPlayer.age} سنة` : 'غير محدد'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">الطول:</span>
                  <span className="font-bold text-white">{selectedPlayer.height || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">تاريخ الانضمام:</span>
                  <span className="font-bold text-white">{selectedPlayer.joinedYear || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">المنطقة:</span>
                  <span className="font-bold text-amber-300">{selectedPlayer.location || 'كثيبة'}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlayer(null)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
