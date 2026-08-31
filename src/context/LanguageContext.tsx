import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

export interface Translations {
  appName: string;
  clubNickname: string;
  home: string;
  team: string;
  matches: string;
  news: string;
  store: string;
  about: string;
  players: string;
  wins: string;
  achievements: string;
  nextMatch: string;
  timeRemaining: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  matchStarted: string;
  playerRole: string;
  fanRole: string;
  readMore: string;
  share: string;
  shareApp: string;
  shareAppCopied: string;
  adminPanel: string;
  notificationsCenter: string;
  toggleTheme: string;
  inquireWhatsapp: string;
  storeTitle: string;
  jerseyNumber: string;
  achievementsNotice: string;
  coachTitle: string;
  searchPlayerPlaceholder: string;
  searchNewsPlaceholder: string;
  close: string;
  respondTraining: string;
  attending: string;
  notAttending: string;
  trainingNotification: string;
}

const arTranslations: Translations = {
  appName: 'فريق السلام بكثيبة',
  clubNickname: '👑 صقور الريف 👑',
  home: 'الرئيسية',
  team: 'الفريق والقائمة',
  matches: 'المباريات والنتائج',
  news: 'الأخبار والبيانات',
  store: 'دليل ومتجر المستلزمات الرياضية',
  about: 'من نحن (تواصل وتفاصيل)',
  players: 'اللاعبون',
  wins: 'الانتصارات',
  achievements: 'الإنجازات',
  nextMatch: 'المباراة القادمة',
  timeRemaining: '⏳ باقي على بداية المباراة',
  days: 'يوم',
  hours: 'ساعة',
  minutes: 'دقيقة',
  seconds: 'ثانية',
  matchStarted: '🔴 المباراة بدأت الآن - متابعة حية',
  playerRole: '⚽ حساب لاعب',
  fanRole: '📣 حساب مشجع',
  readMore: 'اقرأ المزيد',
  share: 'مشاركة',
  shareApp: 'مشاركة التطبيق 📲',
  shareAppCopied: 'تم نسخ رابط التطبيق بنجاح! يمكنك مشاركته مع أي شخص.',
  adminPanel: 'لوحة تحكم المشرف 🔐',
  notificationsCenter: 'مركز الإشعارات',
  toggleTheme: 'تبديل المظهر',
  inquireWhatsapp: 'استفسار عن المنتج عبر واتساب',
  storeTitle: '🛍️ متجر المستلزمات الرياضية',
  jerseyNumber: 'رقم القميص',
  achievementsNotice: '📌 سيتم تدوين كافة إنجازات الفريق منذ بداية التأسيس.',
  coachTitle: 'مدرب الفريق الأول',
  searchPlayerPlaceholder: 'ابحث عن لاعب باسمه أو رقمه...',
  searchNewsPlaceholder: 'بحث في الأخبار...',
  close: 'إغلاق',
  respondTraining: 'تجاوب مع التمرين',
  attending: '✅ سأحضر',
  notAttending: '❌ لن أحضر',
  trainingNotification: 'إشعار موعد تمرين',
};

const enTranslations: Translations = {
  appName: 'Al-Salam Kaseeba Team',
  clubNickname: '👑 Falcons of the Countryside 👑',
  home: 'Home',
  team: 'Team & Squad',
  matches: 'Matches & Results',
  news: 'News & Updates',
  store: 'Sports Equipment Store & Guide',
  about: 'About Us & Contact',
  players: 'Players',
  wins: 'Wins',
  achievements: 'Achievements',
  nextMatch: 'Next Match',
  timeRemaining: '⏳ Time Remaining Until Match Kickoff',
  days: 'Days',
  hours: 'Hours',
  minutes: 'Mins',
  seconds: 'Secs',
  matchStarted: '🔴 Match Live Now - Real-time Coverage',
  playerRole: '⚽ Player Account',
  fanRole: '📣 Fan Account',
  readMore: 'Read More',
  share: 'Share',
  shareApp: 'Share App 📲',
  shareAppCopied: 'App link copied to clipboard successfully!',
  adminPanel: 'Admin Control Panel 🔐',
  notificationsCenter: 'Notification Center',
  toggleTheme: 'Toggle Theme',
  inquireWhatsapp: 'Inquire about product via WhatsApp',
  storeTitle: '🛍️ Sports Equipment Store',
  jerseyNumber: 'Shirt No.',
  achievementsNotice: '📌 All team achievements will be documented since foundation.',
  coachTitle: 'Head Coach',
  searchPlayerPlaceholder: 'Search player by name or number...',
  searchNewsPlaceholder: 'Search news...',
  close: 'Close',
  respondTraining: 'Respond to Training',
  attending: '✅ I Will Attend',
  notAttending: '❌ Cannot Attend',
  trainingNotification: 'Training Session Alert',
};

interface LanguageContextType {
  language: Language;
  t: Translations;
  toggleLanguage: () => void;
  setAppLanguage: (lang: Language) => void;
  dir: 'rtl' | 'ltr';
  shareApp: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('salam_app_language');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch {}
    return 'ar';
  });

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar';
      try {
        localStorage.setItem('salam_app_language', next);
      } catch {}
      return next;
    });
  };

  const setAppLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem('salam_app_language', lang);
    } catch {}
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const t = language === 'ar' ? arTranslations : enTranslations;

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  const shareApp = () => {
    const shareData = {
      title: t.appName,
      text: `${t.appName} - ${t.clubNickname}`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert(t.shareAppCopied);
      }).catch(() => {
        alert(t.shareAppCopied);
      });
    }
  };

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage, setAppLanguage, dir, shareApp }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
