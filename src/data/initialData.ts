import { Player, Match, NewsItem, TrainingSession, ClubStats, ClubInfo, AppNotification, StoreProduct, StoreSettings } from '../types';

export const initialClubInfo: ClubInfo = {
  name: 'فريق السلام الرياضي الثقافي الاجتماعي بكثيبة',
  nickname: 'صقور الريف',
  location: 'غيل باوزير، كثيبة، حضرموت، اليمن',
  colors: 'أحمر وأصفر',
  foundedYear: '1991',
  description: 'فريق السلام الرياضي بكثيبة "صقور الريف" فريق كرة قدم يمني من منطقة كثيبة بولاية غيل باوزير في محافظة حضرموت. يسعى الفريق دائماً لتحقيق الريادة والتميز الرياضي وتمثيل المنطقة بأعلى المستويات.',
  ambition: 'يطمح فريق السلام بكثيبة إلى اعتلاء منصات التتويج والتألق في البطولات المحلية والإقليمية، مع العمل الدؤوب على تطوير المواهب الكروية الناشئة في غيل باوزير وتنشئة جيل محترف ومتميز رياضياً وأخلاقياً.',
  developerName: 'عقيل سعيد بانصر',
  developerEmail: 'mstarqylmstar@gmail.com',
  developerPhone1: '+967 7761933',
  developerPhone2: '+967 7025358',
  developerPhotoUrl: '',
  coachName: 'معاذ بامطرف (بكرون)',
  coachTitle: 'مدرب الفريق الأول',
  coachContract: 'عقد دائم',
  coachPhotoUrl: '',
  logoUrl: '/logo-salam.png',
};

export const initialClubStats: ClubStats = {
  playersCount: 0,
  matchesCount: 0,
  winsCount: 0,
  achievementsCount: 0,
};

export const initialPlayers: Player[] = [];

export const initialMatches: Match[] = [];

export const initialNews: NewsItem[] = [];

export const initialTrainingSessions: TrainingSession[] = [];

export const initialNotifications: AppNotification[] = [];

export const initialStoreProducts: StoreProduct[] = [];

export const initialStoreSettings: StoreSettings = {
  announcement: '',
  whatsappNumber: '967780163037',
};

