export type Position = 'حارس مرمى' | 'مدافع' | 'لاعب وسط' | 'مهاجم' | 'جهاز فني';

export interface Player {
  id: string;
  name: string;
  number?: number;
  position: Position;
  image: string;
  location?: string;
  isCoach?: boolean;
  contractType?: string;
  matchesPlayed?: number;
  goals?: number;
  assists?: number;
  age?: number;
  height?: string;
  joinedYear?: string;
  pinCode?: string;
  role?: 'player' | 'admin';
}

export interface GoalEvent {
  id: string;
  playerName: string;
  goalsCount: number; // كم هدف سجل
  minute: string; // وفي الدقيقة كم
  team?: 'home' | 'away';
}

export interface MatchLiveEvent {
  id: string;
  type: 'start' | 'goal' | 'yellow_card' | 'red_card' | 'sub' | 'whistle' | 'comment' | 'pause' | 'resume' | 'period_start' | 'period_end' | 'warmup' | 'photo';
  minute: string; // e.g. "15'", "73'", "45+2'", "إحماء"
  period?: string; // "قبل المباراة", "الشوط الأول", "استراحة الشوطين", "الشوط الثاني", "انتهت المباراة"
  title: string;
  detail: string;
  team?: 'home' | 'away';
  playerName?: string;
  playerOut?: string;
  playerIn?: string;
  imageUrl?: string;
  images?: string[]; // Multiple photos support for warmups and events
  likesCount?: number;
  likedUserIds?: string[];
  ratings?: { userId: string; rating: number }[];
  averageRating?: number;
  totalRatingsCount?: number;
  timestamp?: string;
}

export interface MatchLineup {
  homeStarting: string[];
  homeSubs: string[];
  awayStarting: string[];
  awaySubs: string[];
}

export interface Match {
  id: string;
  tournament: string;
  homeTeam: string;
  homeLogo?: string;
  awayTeam: string;
  awayLogo?: string;
  homeScore?: number;
  awayScore?: number;
  isUpcoming: boolean;
  day?: string; // e.g. "الجمعة", "السبت", "اليوم"
  date: string; // YYYY-MM-DD
  time: string; // e.g. "8:00 م" or "4:00 م"
  stadium: string;
  statusText?: string;
  badgeType?: 'فوز' | 'تعادل' | 'خسارة' | 'قادمة' | 'مباشر';
  penaltyScore?: string;
  hasLiveBroadcast?: boolean;
  isLive?: boolean;
  liveStatus?: 'لم تبدأ' | 'مباشر الآن' | 'الشوط الأول' | 'بين الشوطين' | 'الشوط الثاني' | 'انتهت' | 'ملغاة';
  livePeriod?: string; // e.g. "الشوط الأول", "الشوط الثاني"
  liveMinute?: string; // e.g. "25'"
  liveEvents?: MatchLiveEvent[];
  lineup?: MatchLineup;
  goalsSummary?: string[];
  goalEvents?: GoalEvent[];
  referee?: string;
  createdAt?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: 'أخبار' | 'مفاجآت' | 'انتقالات' | 'مقالات';
  date: string;
  image: string;
  author?: string;
  views?: number;
  likesCount?: number;
  likedUserIds?: string[];
  ratings?: { userId: string; rating: number }[];
  averageRating?: number;
  totalRatingsCount?: number;
}

export interface TrainingSession {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  note?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceResponse {
  id: string;
  sessionId: string;
  playerId?: string;
  playerName: string;
  jerseyNumber?: string;
  attending: boolean; // true = ساحضر, false = لن احضر
  excuseReason?: string; // اذا لم يحضر
  createdAt: string;
}

export interface GalleryPost {
  id: string;
  title?: string;
  description: string;
  imageUrl?: string;
  images: string[];
  category?: 'إحماء' | 'تغطية' | 'حالة' | 'مباراة' | 'تمرين' | 'عام';
  author?: string;
  date: string;
  timestamp?: string;
  likesCount: number;
  likedUserIds: string[];
  ratings?: { userId: string; rating: number }[];
  averageRating?: number;
  totalRatingsCount?: number;
  matchId?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'training' | 'match' | 'news' | 'gallery' | 'general';
  trainingSessionId?: string;
  galleryPostId?: string;
  deepLink?: string;
  date: string;
  read?: boolean;
  oneSignalId?: string;
  deliveredCount?: number; // عدد الأجهزة الفعلية التي استلمت الإشعار
  clicksCount?: number; // عدد النقرات الحقيقية
  readReceiptsCount?: number; // عدد القراءات الفعلية
  readByUsers?: string[]; // أسماء أو معرّفات المستخدمين الذين قرأوا الإشعار
  openedAt?: string;
  status?: 'delivered' | 'opened' | 'pending';
}

export interface MatchArchiveCard {
  id: string;
  matchId?: string;
  season?: string;
  tournament: string;
  date: string;
  homeTeam: string;
  homeLogo?: string;
  awayTeam: string;
  awayLogo?: string;
  homeScore: number;
  awayScore: number;
  badgeType?: 'فوز' | 'تعادل' | 'خسارة';
  stadium?: string;
  summaryReport: string;
  goalsSummary?: string[];
  topPlayer?: string;
  coachNotes?: string;
  referee?: string;
  images?: string[];
  stats?: {
    possession?: string;
    shotsOnTarget?: number;
    corners?: number;
    yellowCards?: number;
    redCards?: number;
  };
  createdAt?: string;
}

export interface ClubStats {
  playersCount: number;
  matchesCount: number;
  winsCount: number;
  achievementsCount: number;
}

export interface ClubInfo {
  name: string;
  nickname: string;
  location: string;
  colors: string;
  foundedYear: string;
  description: string;
  ambition: string;
  developerName: string;
  developerEmail: string;
  developerPhone1: string;
  developerPhone2: string;
  developerPhotoUrl?: string;
  logoUrl?: string;
  coachName?: string;
  coachContract?: string;
  coachTitle?: string;
  coachPhotoUrl?: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  price: string;
  category: string;
  image: string;
  description?: string;
}

export interface StoreSettings {
  announcement: string;
  whatsappNumber: string;
}
