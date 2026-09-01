import React from 'react';
import { Logo } from './Logo';
import { ClubInfo } from '../types';
import { Info, Trophy, MapPin, Palette, Shield, Calendar, Phone, Mail, UserCheck } from 'lucide-react';

interface AboutViewProps {
  info: ClubInfo;
}

export const AboutView: React.FC<AboutViewProps> = ({ info }) => {
  return (
    <div className="space-y-4 pb-8 px-4 text-white dir-rtl">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <span>ℹ️</span> من نحن
        </h2>
      </div>

      {/* Main Club Hero Card */}
      <div className="bg-gradient-to-b from-[#3b0808] via-[#200707] to-[#140808] border-2 border-red-800/60 rounded-2xl p-5 text-center shadow-xl space-y-2">
        <Logo size={80} customLogoUrl={info.logoUrl} />
        <h1 className="text-lg font-black text-white mt-2">فريق السلام الرياضي بكثيبة</h1>
        <div className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full">
          <span className="text-amber-400 text-xs font-bold">⭐ {info.nickname || 'صقور الريف'} ⭐</span>
        </div>
        <p className="text-xs text-gray-300 font-semibold">{info.location}</p>
      </div>

      {/* About Team Section */}
      <div className="bg-[#181212] border border-red-900/30 rounded-2xl p-4 space-y-2 shadow-md">
        <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
          <Info className="w-4 h-4 text-amber-400" />
          <h3>عن الفريق</h3>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{info.description}</p>
      </div>

      {/* Ambition Section */}
      <div className="bg-[#181212] border border-red-900/30 rounded-2xl p-4 space-y-2 shadow-md">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3>طموح وهدف الفريق</h3>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{info.ambition}</p>
      </div>

      {/* Club Spec Details */}
      <div className="bg-[#181212] border border-red-900/30 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-white/5 pb-2">
          <Shield className="w-4 h-4 text-red-500" />
          <h3>معلومات الفريق</h3>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-white/5">
            <span className="text-gray-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              الموقع:
            </span>
            <span className="font-bold text-white">{info.location}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-white/5">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              ألوان الفريق:
            </span>
            <span className="font-bold text-amber-300">{info.colors}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-white/5">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              اللقب:
            </span>
            <span className="font-bold text-white">{info.nickname}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              سنة التأسيس:
            </span>
            <span className="font-bold text-white">{info.foundedYear}م</span>
          </div>
        </div>
      </div>

      {/* Developer Credits Card */}
      <div className="bg-gradient-to-br from-[#0e1d2c] via-[#091522] to-[#050b12] border-2 border-blue-800/60 rounded-2xl p-4 shadow-xl space-y-3 text-center">
        <div className="flex items-center justify-center gap-2 text-blue-400 font-extrabold text-xs uppercase tracking-wider">
          <span>👨‍💻</span> بيانات مطور التطبيق
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 mb-2 shadow-lg bg-black/40">
            <img
              src={info.developerPhotoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
              alt={info.developerName}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="font-black text-white text-base">{info.developerName}</h3>
          <span className="text-xs text-blue-300 dir-ltr font-mono">{info.developerEmail}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-900/40">
          <a
            href={`tel:${info.developerPhone1}`}
            className="bg-blue-950/80 hover:bg-blue-900 border border-blue-700/50 py-2 px-3 rounded-xl text-xs font-bold text-blue-200 flex items-center justify-center gap-1.5 transition-transform active:scale-95"
          >
            <Phone className="w-3.5 h-3.5 text-blue-400" />
            <span className="dir-ltr font-mono">{info.developerPhone1}</span>
          </a>

          <a
            href={`tel:${info.developerPhone2}`}
            className="bg-blue-950/80 hover:bg-blue-900 border border-blue-700/50 py-2 px-3 rounded-xl text-xs font-bold text-blue-200 flex items-center justify-center gap-1.5 transition-transform active:scale-95"
          >
            <Phone className="w-3.5 h-3.5 text-blue-400" />
            <span className="dir-ltr font-mono">{info.developerPhone2}</span>
          </a>
        </div>

        {/* Mail Contact Button */}
        <a
          href={`mailto:${info.developerEmail || 'mstarqylmstar@gmail.com'}`}
          onClick={() => {
            window.location.href = `mailto:${info.developerEmail || 'mstarqylmstar@gmail.com'}`;
          }}
          className="block w-full bg-blue-900/80 hover:bg-blue-800 border-2 border-blue-400/80 py-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(59,130,246,0.3)] transition-transform active:scale-95"
        >
          <Mail className="w-4 h-4 text-amber-300" />
          <span>تواصل مع المطور عبر البريد ({info.developerEmail || 'mstarqylmstar@gmail.com'})</span>
        </a>

        {/* WhatsApp Contact Button */}
        <a
          href="https://wa.me/967780163037?text=مرحبًا،%20أريد%20الاستفسار"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-600 border border-emerald-400/50 py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-transform active:scale-95"
        >
          <span className="text-base">💬</span>
          <span>تواصل عبر واتساب (780163037)</span>
        </a>

        <p className="text-[11px] text-amber-200/80 font-bold pt-2 border-t border-blue-950">
          © 2026 جميع الحقوق محفوظة لفريق السلام الرياضي بكثيبة
        </p>
      </div>
    </div>
  );
};
