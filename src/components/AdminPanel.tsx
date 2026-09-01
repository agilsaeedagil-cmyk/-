import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Plus, Trash2, Edit, Save, Bell, Users, Shield, CheckCircle2, XCircle, Send, LogOut, FileText, Calendar, Camera, Trophy, MapPin, X, ShoppingBag, MessageSquare, Radio, Play, Pause, Flag, Activity, RefreshCw, Layers, Key, Smartphone, AlertTriangle, Check, ExternalLink, Image as ImageIcon, Sparkles, Heart, Star, Eye } from 'lucide-react';
import { Match, NewsItem, Player, TrainingSession, AttendanceResponse, ClubStats, ClubInfo, GoalEvent, StoreProduct, StoreSettings, MatchLiveEvent, MatchLineup, AppNotification, GalleryPost, MatchArchiveCard } from '../types';
import { apiService } from '../services/api';
import { ImagePicker } from './ImagePicker';
import { LiveMatchAdminConsole } from './LiveMatchAdminConsole';
import { formatArabicFullDate, getArabicDayName, getMatchCountdown } from '../utils/dateUtils';
import { parseStandardNumber, toWesternDigits } from '../utils/numberUtils';

interface AdminPanelProps {
  news: NewsItem[];
  matches: Match[];
  players: Player[];
  trainingSessions: TrainingSession[];
  storeProducts?: StoreProduct[];
  storeSettings?: StoreSettings;
  onRefreshData: () => void;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  news,
  matches,
  players,
  trainingSessions,
  storeProducts = [],
  storeSettings,
  onRefreshData,
  onClose,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'identity' | 'news' | 'matches' | 'live' | 'players' | 'training' | 'broadcast' | 'store' | 'gallery' | 'archive'>('training');

  // Club Identity State
  const [clubIdentity, setClubIdentity] = useState<ClubInfo>({
    name: 'فريق السلام بكثيبة',
    nickname: 'صقور الريف',
    location: 'غيل باوزير - كثيبة - حضرموت',
    colors: 'أحمر وأصفر ذهبي',
    foundedYear: '1991',
    description: 'فريق السلام الرياضي بكثيبة "صقور الريف" فريق كرة قدم يمني متميز في غيل باوزير بمحافظة حضرموت.',
    ambition: 'يطمح فريق السلام بكثيبة إلى اعتلاء منصات التتويج والتميز الكروي دائماً.',
    developerName: 'عقيل سعيد بانصر',
    developerEmail: 'mstarqylmstar@gmail.com',
    developerPhone1: '+967 7761933',
    developerPhone2: '+967 7025358',
    logoUrl: '/logo-salam.png',
    coachName: 'معاذ بامطرف (بكرون)',
    coachTitle: 'مدرب الفريق الأول',
    coachContract: 'عقد دائم',
    coachPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  });

  // Club Stats State
  const [clubStats, setClubStats] = useState<ClubStats>({
    playersCount: 32,
    matchesCount: 18,
    winsCount: 12,
    achievementsCount: 7,
  });

  // Active Edit Modals
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);

  // In-App Delete Confirmation Modal State (Bypasses sandboxed iframe window.confirm limits)
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    itemImage?: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [adminNotification, setAdminNotification] = useState<string | null>(null);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [isSendingTraining, setIsSendingTraining] = useState(false);
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isUpdatingMatch, setIsUpdatingMatch] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isUpdatingPlayer, setIsUpdatingPlayer] = useState(false);
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [isUpdatingNews, setIsUpdatingNews] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  const triggerNotification = (msg: string) => {
    setAdminNotification(msg);
    setTimeout(() => {
      setAdminNotification((prev) => (prev === msg ? null : prev));
    }, 7000);
  };

  // Live Match Broadcast Control State
  const [liveMatchModal, setLiveMatchModal] = useState<Match | null>(null);
  const [liveEventType, setLiveEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'sub' | 'comment'>('goal');
  const [liveEventTeam, setLiveEventTeam] = useState<'home' | 'away'>('home');
  const [liveEventPlayer, setLiveEventPlayer] = useState('');
  const [liveEventPlayerOut, setLiveEventPlayerOut] = useState('');
  const [liveEventPlayerIn, setLiveEventPlayerIn] = useState('');
  const [liveEventMinute, setLiveEventMinute] = useState("25'");
  const [liveEventDetail, setLiveEventDetail] = useState('');

  // Lineup state for liveMatchModal
  const [liveHomeStartingText, setLiveHomeStartingText] = useState('');
  const [liveHomeSubsText, setLiveHomeSubsText] = useState('');
  const [liveAwayStartingText, setLiveAwayStartingText] = useState('');
  const [liveAwaySubsText, setLiveAwaySubsText] = useState('');

  // Live Match Control Handlers
  const handleOpenLiveMatchControl = (match: Match) => {
    setLiveMatchModal(match);
    setLiveEventMinute(match.liveMinute || "1'");

    if (match.lineup) {
      setLiveHomeStartingText(match.lineup.homeStarting?.join('\n') || '');
      setLiveHomeSubsText(match.lineup.homeSubs?.join('\n') || '');
      setLiveAwayStartingText(match.lineup.awayStarting?.join('\n') || '');
      setLiveAwaySubsText(match.lineup.awaySubs?.join('\n') || '');
    } else {
      const salamStarting = players.slice(0, 11).map((p, idx) => `${p.number || idx + 1} - ${p.name} (${p.position})`).join('\n');
      const salamSubs = players.slice(11, 16).map((p, idx) => `${p.number || idx + 12} - ${p.name}`).join('\n');
      setLiveHomeStartingText(salamStarting || '1 - مروان علي (حارس)\n4 - سعيد العوبثاني (دفاع)\n3 - محمد الكسادي (دفاع)\n5 - أحمد بامطرف (دفاع)\n2 - علي يسلم (دفاع)\n6 - مراد بامطرف (وسط)\n8 - صالح بابطاط (وسط)\n10 - حسين بن همام (وسط)\n7 - عبد الله باحشوان (هجوم)\n9 - سعيد مبارك (هجوم)\n11 - خالد العطاس (هجوم)');
      setLiveHomeSubsText(salamSubs || '22 - عبد العزيز باوزير (حارس)\n12 - سعيد بامطرف\n14 - عمر الكسادي');
      setLiveAwayStartingText('1 - حارس المرمى\n2 - مدافع1\n3 - مدافع2\n4 - مدافع3\n5 - مدافع4\n6 - وسط1\n7 - وسط2\n8 - وسط3\n9 - مهاجم1\n10 - مهاجم2\n11 - مهاجم3');
      setLiveAwaySubsText('12 - بديل1\n13 - بديل2\n14 - بديل3');
    }
  };

  const handleUpdateLivePeriod = async (match: Match, period: string, type: 'start' | 'whistle') => {
    let updatedIsLive = true;
    let updatedBadgeType = match.badgeType;
    let periodTitle = '';
    let periodDetail = '';

    if (period === 'الشوط الأول') {
      periodTitle = '🟢 انطلاق المباراة - الشوط الأول';
      periodDetail = `صفارة الحكم تعلن بداية الشوط الأول بين ${match.homeTeam} و ${match.awayTeam}.`;
      updatedBadgeType = 'مباشر';
    } else if (period === 'استراحة الشوطين') {
      periodTitle = '⏸️ استراحة الشوطين';
      periodDetail = `صافرة الحكم تعلن نهاية الشوط الأول واستراحة بين الشوطين. النتيجة الحالية ${match.homeScore ?? 0} - ${match.awayScore ?? 0}`;
    } else if (period === 'الشوط الثاني') {
      periodTitle = '🟢 انطلاق الشوط الثاني';
      periodDetail = `صافرة الحكم تعلن انطلاق الشوط الثاني لمباراة ${match.homeTeam} ضد ${match.awayTeam}.`;
      updatedBadgeType = 'مباشر';
    } else if (period === 'انتهت المباراة') {
      updatedIsLive = false;
      const hScore = match.homeScore ?? 0;
      const aScore = match.awayScore ?? 0;
      updatedBadgeType = hScore > aScore ? 'فوز' : hScore === aScore ? 'تعادل' : 'خسارة';
      periodTitle = '🏁 نهاية المباراة الرسمية';
      periodDetail = `صفارة النهاية! انتهت المباراة بنتيجة ${match.homeTeam} (${hScore}) - (${aScore}) ${match.awayTeam}.`;
    }

    const newEvent: MatchLiveEvent = {
      id: `ev-${Date.now()}`,
      type: type,
      minute: liveEventMinute || "0'",
      period: period,
      title: periodTitle,
      detail: periodDetail,
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMatch: Match = {
      ...match,
      isLive: updatedIsLive,
      isUpcoming: period !== 'انتهت المباراة',
      livePeriod: period,
      liveMinute: liveEventMinute,
      badgeType: updatedBadgeType,
      hasLiveBroadcast: true,
      liveEvents: [newEvent, ...(match.liveEvents || [])],
    };

    await apiService.updateMatch(match.id, updatedMatch);
    setLiveMatchModal(updatedMatch);
    onRefreshData();
  };

  const handleUpdateLiveScore = async (homeDelta: number, awayDelta: number) => {
    if (!liveMatchModal) return;
    const newHome = Math.max(0, (liveMatchModal.homeScore ?? 0) + homeDelta);
    const newAway = Math.max(0, (liveMatchModal.awayScore ?? 0) + awayDelta);

    const updatedMatch: Match = {
      ...liveMatchModal,
      homeScore: newHome,
      awayScore: newAway,
      liveMinute: liveEventMinute,
    };

    await apiService.updateMatch(liveMatchModal.id, updatedMatch);
    setLiveMatchModal(updatedMatch);
    onRefreshData();
  };

  const handleAddLiveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveMatchModal) return;

    const teamName = liveEventTeam === 'home' ? liveMatchModal.homeTeam : liveMatchModal.awayTeam;
    let eventTitle = '';
    let eventDetail = liveEventDetail.trim();

    let newHomeScore = liveMatchModal.homeScore ?? 0;
    let newAwayScore = liveMatchModal.awayScore ?? 0;

    const minStr = liveEventMinute ? `الدقيقة(${liveEventMinute})` : '';

    if (liveEventType === 'goal') {
      const playerStr = liveEventPlayer.trim() ? ` عن طريق ${liveEventPlayer}` : '';
      eventTitle = `⚽ جووووول لصالح ${teamName}${playerStr}! ${minStr}`;
      if (!eventDetail) {
        eventDetail = `تسديدة رائعة سكنت الشباك لصالح ${teamName}.`;
      }
      if (liveEventTeam === 'home') newHomeScore += 1;
      else newAwayScore += 1;
    } else if (liveEventType === 'yellow_card') {
      const playerStr = liveEventPlayer.trim() ? ` على اللاعب ${liveEventPlayer}` : '';
      eventTitle = `🟨 كرت أصفر لصالح ${teamName}${playerStr}! ${minStr}`;
      if (!eventDetail) {
        eventDetail = `بطاقة صفراء إثر تدخل تكتيكي.`;
      }
    } else if (liveEventType === 'red_card') {
      const playerStr = liveEventPlayer.trim() ? ` على اللاعب ${liveEventPlayer}` : '';
      eventTitle = `🟥 كرت أحمر وطرد لـ ${teamName}${playerStr}! ${minStr}`;
      if (!eventDetail) {
        eventDetail = `بطاقة حمراء مباشرة وطرد للاعب من أرضية الملعب.`;
      }
    } else if (liveEventType === 'sub') {
      eventTitle = `🔄 تبديل لـ ${teamName}! ${minStr}`;
      if (!eventDetail) {
        eventDetail = `خروج اللاعب: (${liveEventPlayerOut || 'خارج'}) ⬅️ دخول البديل: (${liveEventPlayerIn || 'داخل'}).`;
      }
    } else {
      eventTitle = `📢 تعليق وتغطية مباشرة! ${minStr}`;
      if (!eventDetail) eventDetail = 'متابعة حية وضغط هجومي في أحداث المباراة.';
    }

    const newLiveEvent: MatchLiveEvent = {
      id: `ev-${Date.now()}`,
      type: liveEventType,
      minute: liveEventMinute || "1'",
      period: liveMatchModal.livePeriod || 'الشوط الأول',
      title: eventTitle,
      detail: eventDetail,
      team: liveEventTeam,
      playerName: liveEventPlayer,
      playerOut: liveEventPlayerOut,
      playerIn: liveEventPlayerIn,
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
    };

    let updatedGoalEvents = liveMatchModal.goalEvents || [];
    if (liveEventType === 'goal' && liveEventPlayer) {
      updatedGoalEvents = [
        ...updatedGoalEvents,
        {
          id: `ge-${Date.now()}`,
          playerName: `${liveEventPlayer} (${teamName})`,
          goalsCount: 1,
          minute: liveEventMinute,
          team: liveEventTeam,
        },
      ];
    }

    const updatedMatch: Match = {
      ...liveMatchModal,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      liveMinute: liveEventMinute,
      goalEvents: updatedGoalEvents,
      liveEvents: [newLiveEvent, ...(liveMatchModal.liveEvents || [])],
    };

    // 1. Update Match live events
    await apiService.updateMatch(liveMatchModal.id, updatedMatch);

    // 2. Broadcast notification to all fans & players
    try {
      await apiService.sendBroadcastNotification({
        title: eventTitle,
        message: eventDetail,
        type: 'match',
        date: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err) {
      console.error('Failed to dispatch broadcast notification for live event:', err);
    }

    setLiveMatchModal(updatedMatch);
    setLiveEventDetail('');
    setLiveEventPlayer('');
    setLiveEventPlayerOut('');
    setLiveEventPlayerIn('');
    triggerNotification('✅ تم نشر وإرسال الحدث المباشر مع إشعار فور للجمهور واللاعبين بنجاح!');
    onRefreshData();
  };

  const handleSaveLineup = async () => {
    if (!liveMatchModal) return;
    const lineupData: MatchLineup = {
      homeStarting: liveHomeStartingText.split('\n').filter((l) => l.trim().length > 0),
      homeSubs: liveHomeSubsText.split('\n').filter((l) => l.trim().length > 0),
      awayStarting: liveAwayStartingText.split('\n').filter((l) => l.trim().length > 0),
      awaySubs: liveAwaySubsText.split('\n').filter((l) => l.trim().length > 0),
    };

    const updatedMatch: Match = {
      ...liveMatchModal,
      lineup: lineupData,
    };

    await apiService.updateMatch(liveMatchModal.id, updatedMatch);
    setLiveMatchModal(updatedMatch);
    triggerNotification('✅ تم حفظ تشكيلة الفريقين الرسمية بنجاح!');
    onRefreshData();
  };

  const handleDeleteLiveEvent = async (eventId: string) => {
    if (!liveMatchModal) return;
    if (confirm('هل أنت تأكد من حذف هذا الحدث من التغطية المباشرة؟')) {
      const updatedEvents = (liveMatchModal.liveEvents || []).filter((e) => e.id !== eventId);
      const updatedMatch: Match = {
        ...liveMatchModal,
        liveEvents: updatedEvents,
      };
      await apiService.updateMatch(liveMatchModal.id, updatedMatch);
      setLiveMatchModal(updatedMatch);
      onRefreshData();
    }
  };

  // Store Management State
  const [storeAnnounceText, setStoreAnnounceText] = useState(
    storeSettings?.announcement || '📢 يمكن للجماهير واللاعبين مشاهدة العروض للمستلزمات الرياضية في المحلات بالاسعار الذي تناسبهم'
  );
  const [storeWaNumber, setStoreWaNumber] = useState(
    storeSettings?.whatsappNumber || '967780163037'
  );
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '15,000 ريال يمني',
    category: 'أطقم رسمية',
    description: '',
    image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500&auto=format&fit=crop&q=80',
  });

  useEffect(() => {
    if (storeSettings) {
      if (storeSettings.announcement) setStoreAnnounceText(storeSettings.announcement);
      if (storeSettings.whatsappNumber) setStoreWaNumber(storeSettings.whatsappNumber);
    }
  }, [storeSettings]);

  // Store Handlers
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiService.updateStoreSettings({
      announcement: storeAnnounceText,
      whatsappNumber: storeWaNumber,
    });
    triggerNotification('✅ تم حفظ إعدادات وإعلان المتجر ورقم التواصل بنجاح!');
    if (onRefreshData) onRefreshData();
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingProduct) return;
    if (!newProduct.name.trim()) {
      triggerNotification('⚠️ يرجى إدخال اسم المنتج أولاً');
      return;
    }
    setIsAddingProduct(true);
    try {
      await apiService.createStoreProduct(newProduct);
      triggerNotification('✅ تم إضافة المنتج للمتجر بنجاح!');
      setNewProduct({
        name: '',
        price: '15,000 ريال يمني',
        category: 'أطقم رسمية',
        description: '',
        image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500&auto=format&fit=crop&q=80',
      });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerNotification('❌ حدث خطأ أثناء إضافة المنتج: ' + (err?.message || ''));
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingProduct || !editingProduct) return;
    setIsUpdatingProduct(true);
    try {
      await apiService.updateStoreProduct(editingProduct.id, editingProduct);
      triggerNotification('✅ تم تحديث بيانات المنتج بنجاح!');
      setEditingProduct(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerNotification('❌ حدث خطأ أثناء تحديث المنتج: ' + (err?.message || ''));
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  const handleDeleteProduct = (product: StoreProduct) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'تأكيد حذف المنتج',
      message: 'هل أنت تأكد من حذف هذا المنتج من متجر النادي؟',
      itemName: product.name,
      itemImage: product.image,
      onConfirm: async () => {
        await apiService.deleteStoreProduct(product.id);
        setAdminNotification(`تم حذف المنتج "${product.name}" بنجاح.`);
      }
    });
  };

  // Match Goal Scorers Inputs State
  const [goalPlayerName, setGoalPlayerName] = useState('');
  const [goalCount, setGoalCount] = useState<number>(1);
  const [goalMinute, setGoalMinute] = useState('');

  // Real-time Attendance Responses
  const [attendanceResponses, setAttendanceResponses] = useState<AttendanceResponse[]>([]);

  // New News State
  const [newNews, setNewNews] = useState({
    title: '',
    content: '',
    category: 'أخبار' as const,
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    date: new Date().toISOString().split('T')[0],
  });

  // New Match State
  const [newMatch, setNewMatch] = useState({
    tournament: 'دوري شرفاء بكثيبة - الفريق الأول',
    homeTeam: 'فريق السلام بكثيبة',
    homeLogo: '',
    awayTeam: '',
    awayLogo: '',
    date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    time: '8:00 مساءً',
    stadium: 'ملعب العمودي بالمكلا',
    isUpcoming: true,
  });

  // New Player State
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    number: '',
    position: 'مهاجم' as const,
    location: 'كثيبة',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    matchesPlayed: 12,
    goals: 0,
    assists: 0,
    age: 22,
    height: '175 سم',
    joinedYear: '2022',
    pinCode: '',
  });

  // New Training Session State (Empty by default - no hardcoded mock)
  const [newTraining, setNewTraining] = useState({
    title: '',
    time: '',
    date: '',
    location: '',
    note: '',
  });

  // Broadcast Notification State
  const [broadcastMessage, setBroadcastMessage] = useState({ title: '', message: '' });

  // OneSignal Push Notification State
  const [oneSignalConfigData, setOneSignalConfigData] = useState<{
    configured: boolean;
    appId: string;
    hasApiKey: boolean;
    apiKeyPreview?: string;
    registeredDevicesCount?: number;
  }>({ configured: false, appId: '', hasApiKey: false });
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  // Real-time Push Notifications List
  const [notificationsList, setNotificationsList] = useState<AppNotification[]>([]);
  const [refreshingNotifId, setRefreshingNotifId] = useState<string | null>(null);
  const [isRefreshingAllNotifs, setIsRefreshingAllNotifs] = useState(false);

  // Attendance Refresh State
  const [isRefreshingAttendance, setIsRefreshingAttendance] = useState(false);

  // Match Archive State
  const [matchArchivesList, setMatchArchivesList] = useState<MatchArchiveCard[]>([]);
  const [editingArchiveCard, setEditingArchiveCard] = useState<MatchArchiveCard | null>(null);
  const [isSavingArchive, setIsSavingArchive] = useState(false);
  const [newArchiveCard, setNewArchiveCard] = useState<Partial<MatchArchiveCard>>({
    tournament: 'دوري شرفاء بكثيبة',
    season: 'موسم 2025/2026',
    date: new Date().toISOString().split('T')[0],
    homeTeam: 'فريق السلام بكثيبة',
    homeLogo: '/logo-salam.png',
    awayTeam: '',
    awayLogo: '',
    homeScore: 0,
    awayScore: 0,
    badgeType: 'فوز',
    stadium: 'ملعب السلام بكثيبة',
    summaryReport: '',
    goalsSummary: [],
    topPlayer: '',
    coachNotes: '',
    referee: '',
    images: [],
  });

  // Gallery, Statuses & Warmup Uploads State
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryDescription, setGalleryDescription] = useState('');
  const [galleryCategory, setGalleryCategory] = useState<'إحماء' | 'تغطية' | 'حالة' | 'مباراة' | 'تمرين' | 'عام'>('إحماء');
  const [gallerySelectedImages, setGallerySelectedImages] = useState<string[]>([]);
  const [galleryBroadcastPush, setGalleryBroadcastPush] = useState<boolean>(true);
  const [isPublishingGallery, setIsPublishingGallery] = useState<boolean>(false);
  const [galleryPostsList, setGalleryPostsList] = useState<GalleryPost[]>([]);
  const [deletingGalleryPostId, setDeletingGalleryPostId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
      loadOneSignalConfig();
      const unsubAttendance = apiService.subscribeToAttendanceResponses((liveResponses) => {
        if (Array.isArray(liveResponses)) {
          setAttendanceResponses(liveResponses);
        }
      });
      const unsubNotifs = apiService.subscribeToNotifications((liveNotifs) => {
        if (Array.isArray(liveNotifs)) {
          setNotificationsList(liveNotifs);
        }
      });
      const unsubGallery = apiService.subscribeToGalleryPosts((livePosts) => {
        if (Array.isArray(livePosts)) {
          setGalleryPostsList(livePosts);
        }
      });
      const unsubDevices = apiService.subscribeToRegisteredDevices((count) => {
        setOneSignalConfigData((prev) => ({ ...prev, registeredDevicesCount: count }));
      });
      const unsubArchive = apiService.subscribeToMatchArchive((cards) => {
        if (Array.isArray(cards)) {
          setMatchArchivesList(cards);
        }
      });
      return () => {
        unsubAttendance();
        unsubNotifs();
        unsubGallery();
        unsubDevices();
        unsubArchive();
      };
    }
  }, [isAuthenticated]);

  const handleRefreshSingleNotifStats = async (notifId: string, oneSignalId?: string) => {
    setRefreshingNotifId(notifId);
    try {
      const res = await apiService.refreshNotificationStats(notifId, oneSignalId);
      if (res) {
        setNotificationsList((prev) =>
          prev.map((n) =>
            n.id === notifId
              ? {
                  ...n,
                  deliveredCount: res.deliveredCount ?? n.deliveredCount,
                  clicksCount: res.clicksCount ?? n.clicksCount,
                  readReceiptsCount: res.readReceiptsCount ?? n.readReceiptsCount,
                  status: res.status || n.status,
                  readByUsers: res.readByUsers || n.readByUsers,
                }
              : n
          )
        );
        triggerNotification(`✅ تم تحديث إحصائيات الإشعار بنجاح (المستلمة: ${res.deliveredCount ?? 0} | النقرات: ${res.clicksCount ?? 0} | القراءات: ${res.readReceiptsCount ?? 0})`);
      } else {
        triggerNotification('✅ تم تحديث بيانات الإشعار محلياً.');
      }
    } catch (err: any) {
      triggerNotification('⚠️ حدث خطأ أثناء التحديث: ' + (err?.message || ''));
    } finally {
      setRefreshingNotifId(null);
    }
  };

  const handleRefreshAllNotificationsStats = async () => {
    setIsRefreshingAllNotifs(true);
    try {
      await handleRefreshDevices();
      for (const notif of notificationsList) {
        await apiService.refreshNotificationStats(notif.id, notif.oneSignalId);
      }
      const updated = await apiService.getNotifications();
      if (Array.isArray(updated)) {
        setNotificationsList(updated);
      }
      triggerNotification('✅ تم التحديث الحي والشامل لكافة إحصائيات البث والنقرات والأجهزة بنجاح!');
    } catch (err: any) {
      triggerNotification('⚠️ تم تحديث البيانات: ' + (err?.message || ''));
    } finally {
      setIsRefreshingAllNotifs(false);
    }
  };

  const handleSaveArchiveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingArchive) return;
    setIsSavingArchive(true);
    try {
      const cardToSave = editingArchiveCard || newArchiveCard;
      await apiService.saveMatchArchive(cardToSave);
      triggerNotification('✅ تم حفظ ونشر بطاقة تقرير المباراة في الأرشيف السحابي بنجاح!');
      setEditingArchiveCard(null);
      setNewArchiveCard({
        tournament: 'دوري شرفاء بكثيبة',
        season: 'موسم 2025/2026',
        date: new Date().toISOString().split('T')[0],
        homeTeam: 'فريق السلام بكثيبة',
        homeLogo: '/logo-salam.png',
        awayTeam: '',
        awayLogo: '',
        homeScore: 0,
        awayScore: 0,
        badgeType: 'فوز',
        stadium: 'ملعب السلام بكثيبة',
        summaryReport: '',
        goalsSummary: [],
        topPlayer: '',
        coachNotes: '',
        referee: '',
        images: [],
      });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerNotification('❌ حدث خطأ أثناء حفظ الأرشيف: ' + (err?.message || ''));
    } finally {
      setIsSavingArchive(false);
    }
  };

  const handleDeleteArchiveCard = (card: MatchArchiveCard) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'تأكيد حذف بطاقة الأرشيف',
      message: 'هل أنت متأكد من حذف هذه البطاقة وتقرير المباراة نهائياً من الأرشيف السحابي وقاعدة بيانات Firestore؟',
      itemName: `${card.homeTeam} ضد ${card.awayTeam} (${card.tournament})`,
      onConfirm: async () => {
        await apiService.deleteMatchArchive(card.id);
        setMatchArchivesList((prev) => prev.filter((c) => c.id !== card.id));
        triggerNotification('✅ تم حذف بطاقة المباراة من الأرشيف بنجاح');
        if (onRefreshData) onRefreshData();
      },
    });
  };

  const handleArchiveFromPastMatch = (match: Match) => {
    const badge = match.badgeType || (Number(match.homeScore) > Number(match.awayScore) ? 'فوز' : Number(match.homeScore) === Number(match.awayScore) ? 'تعادل' : 'خسارة');
    setNewArchiveCard({
      matchId: match.id,
      tournament: match.tournament || 'مباراة رسمية',
      season: 'موسم 2025/2026',
      date: match.date || new Date().toISOString().split('T')[0],
      homeTeam: match.homeTeam || 'فريق السلام بكثيبة',
      homeLogo: match.homeLogo || '/logo-salam.png',
      awayTeam: match.awayTeam,
      awayLogo: match.awayLogo,
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      badgeType: badge as any,
      stadium: match.stadium || 'ملعب السلام بكثيبة',
      summaryReport: `تقرير المباراة الرسمية بين ${match.homeTeam} و${match.awayTeam}، والتي أقيمت على أرضية ${match.stadium || 'ملعب السلام'} وانتهت بنتيجة (${match.homeScore ?? 0} - ${match.awayScore ?? 0}).`,
      goalsSummary: match.goalsSummary || (match.goalEvents?.map((ge) => `${ge.playerName} (${ge.minute || ''})`) || []),
      referee: match.referee || '',
      images: [],
    });
    setActiveTab('archive');
    triggerNotification(`📋 تم نسخ بيانات مباراة (${match.homeTeam} ضد ${match.awayTeam}) لإنشاء بطاقة أرشيف سحابية جديدة!`);
  };

  const loadOneSignalConfig = async () => {
    try {
      const config = await apiService.getOneSignalConfig();
      setOneSignalConfigData(config);
    } catch (err) {
      console.warn("Could not load OneSignal config:", err);
    }
  };

  const handleRefreshDevices = async () => {
    setIsRefreshingDevices(true);
    try {
      const config = await apiService.getOneSignalConfig();
      setOneSignalConfigData(config);
      const devices = await apiService.getOneSignalDevices();
      const count = devices?.length || config.registeredDevicesCount || 0;
      triggerNotification(`✅ تم تحديث سجل الأجهزة المسجلة بالسيرفر بنجاح (${count} جهاز)`);
    } catch (err: any) {
      triggerNotification('⚠️ تم تحديث البيانات: ' + (err?.message || ''));
    } finally {
      setIsRefreshingDevices(false);
    }
  };

  const loadInitialData = async () => {
    const attendance = await apiService.getAttendanceResponses();
    setAttendanceResponses(attendance);

    const info = await apiService.getClubInfo();
    if (info) setClubIdentity(info);

    const stats = await apiService.getStats();
    if (stats) setClubStats(stats);
  };

  const handleRefreshAttendance = async () => {
    setIsRefreshingAttendance(true);
    try {
      const attendance = await apiService.getAttendanceResponses();
      if (Array.isArray(attendance)) {
        setAttendanceResponses(attendance);
      }
      if (onRefreshData) {
        onRefreshData();
      }
      setAdminNotification('✅ تم تحديث سجل الحضور والغياب بنجاح!');
    } catch (err) {
      console.warn('⚠️ Error refreshing attendance:', err);
      setAdminNotification('❌ حدث خطأ أثناء تحديث قائمة الحضور.');
    } finally {
      setIsRefreshingAttendance(false);
    }
  };

  const handleDeleteAttendance = async (resItem: AttendanceResponse) => {
    const id = resItem.id;
    const name = resItem.playerName || 'اللاعب';
    if (!id && !resItem.playerName) {
      console.warn("⚠️ Attendance response item has no valid ID or player name:", resItem);
      return;
    }

    // 1. Immediately remove from local state for instant UI feedback
    setAttendanceResponses((prev) => prev.filter((r) => {
      if (id && String(r.id) === String(id)) return false;
      if (resItem.playerName && String(r.playerName).trim() === String(resItem.playerName).trim()) return false;
      return true;
    }));

    setAdminNotification(`🗑️ جاري حذف (${name}) نهائياً من قاعدة البيانات...`);

    try {
      // 2. Delete permanently from Firestore, Express backend, and cache
      await apiService.deleteAttendanceResponse(resItem);
      if (onRefreshData) {
        await onRefreshData();
      }
      setAdminNotification(`✅ تم حذف تسجيل (${name}) بنجاح وبشكل نهائي.`);
    } catch (err) {
      console.warn("⚠️ Delete attendance error:", err);
      setAdminNotification(`❌ حدث خطأ أثناء مسح تسجيل (${name}).`);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const success = await apiService.adminLogin(password);
    if (success) {
      setIsAuthenticated(true);
    } else {
      setLoginError('خطأ في كلمة المرور! يرجى التأكد من الرمز وإعادة المحاولة.');
    }
  };

  // Save Identity and Stats
  const handleSaveIdentityAndStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingIdentity) return;
    setIsSavingIdentity(true);
    try {
      await apiService.updateClubInfo(clubIdentity);
      await apiService.updateStats(clubStats);
      triggerNotification('✅ تم حفظ البيانات، أرقام الإنجازات والهوية البصرية بنجاح!');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerNotification('❌ حدث خطأ أثناء حفظ البيانات: ' + (err?.message || ''));
    } finally {
      setIsSavingIdentity(false);
    }
  };

  // News Handlers
  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingNews) return;
    if (!newNews.title || !newNews.content) return;
    setIsAddingNews(true);
    try {
      await apiService.createNews(newNews);
      triggerNotification('✅ تم إضافة الخبر بنجاح');
      setNewNews({
        title: '',
        content: '',
        category: 'أخبار',
        image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
        date: new Date().toISOString().split('T')[0],
      });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerNotification('❌ حدث خطأ أثناء إضافة الخبر: ' + (err?.message || ''));
    } finally {
      setIsAddingNews(false);
    }
  };

  const handleUpdateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingNews || !editingNews) return;
    setIsUpdatingNews(true);
    try {
      await apiService.updateNews(editingNews.id, editingNews);
      triggerNotification('✅ تم تحديث بيانات الخبر بنجاح!');
      setEditingNews(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error(err);
      triggerNotification('❌ حدث خطأ أثناء تحديث الخبر: ' + (err?.message || ''));
    } finally {
      setIsUpdatingNews(false);
    }
  };

  const handleDeleteNews = (newsItem: NewsItem) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'تأكيد حذف الخبر',
      message: 'هل أنت تأكد من حذف هذا الخبر نهائياً من سجلات النادي؟',
      itemName: newsItem.title,
      itemImage: newsItem.image,
      onConfirm: async () => {
        await apiService.deleteNews(newsItem.id);
        setAdminNotification(`تم حذف الخبر بنجاح.`);
      }
    });
  };

  // Matches Handlers
  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingMatch) return;
    if (!newMatch.awayTeam || !newMatch.awayTeam.trim()) {
      triggerNotification('⚠️ يرجى كتابة اسم الفريق المنافس أولاً قبل الإضافة');
      return;
    }

    setIsAddingMatch(true);
    try {
      console.log("⏳ [handleAddMatch] Calling apiService.createMatch...", newMatch);
      const created = await apiService.createMatch({
        ...newMatch,
        homeTeam: newMatch.homeTeam || 'فريق السلام بكثيبة',
        homeLogo: newMatch.homeLogo || clubIdentity.logoUrl || '/logo-salam.png',
        awayLogo: newMatch.awayLogo || '',
        badgeType: newMatch.isUpcoming ? 'قادمة' : 'فوز',
      });

      console.log("✅ [handleAddMatch] Match created successfully:", created);
      setAdminNotification(`تم إضافة مباراة (${created.homeTeam} ضد ${created.awayTeam}) بنجاح!`);

      setNewMatch({
        tournament: 'دوري شرفاء بكثيبة - الفريق الأول',
        homeTeam: 'فريق السلام بكثيبة',
        homeLogo: '',
        awayTeam: '',
        awayLogo: '',
        date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        time: '8:00 مساءً',
        stadium: 'ملعب العمودي بالمكلا',
        isUpcoming: true,
      });

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      console.error("❌ Error adding match:", err);
      triggerNotification('❌ حدث خطأ أثناء إضافة المباراة: ' + (err?.message || 'يرجى المحاولة مرة أخرى'));
    } finally {
      setIsAddingMatch(false);
    }
  };

  const handleAddGoalEventToEditingMatch = () => {
    if (!editingMatch || !goalPlayerName.trim()) {
      triggerNotification('⚠️ يرجى كتابة أو اختيار اسم اللاعب المسجل أولاً');
      return;
    }
    const newEvent: GoalEvent = {
      id: Date.now().toString(),
      playerName: goalPlayerName.trim(),
      goalsCount: Number(goalCount) || 1,
      minute: goalMinute.trim() || 'غير محددة',
    };

    const updatedGoalEvents = [...(editingMatch.goalEvents || []), newEvent];
    const updatedGoalsSummary = updatedGoalEvents.map((ge) => {
      const goalsText = ge.goalsCount === 1 ? 'هدف' : ge.goalsCount === 2 ? 'هدفين' : `${ge.goalsCount} أهداف`;
      const minText = ge.minute ? `(د ${ge.minute})` : '';
      return `${ge.playerName} - ${goalsText} ${minText}`.trim();
    });

    setEditingMatch({
      ...editingMatch,
      goalEvents: updatedGoalEvents,
      goalsSummary: updatedGoalsSummary,
    });

    setGoalPlayerName('');
    setGoalCount(1);
    setGoalMinute('');
  };

  const handleRemoveGoalEventFromEditingMatch = (id: string) => {
    if (!editingMatch) return;
    const updatedGoalEvents = (editingMatch.goalEvents || []).filter((e) => e.id !== id);
    const updatedGoalsSummary = updatedGoalEvents.map((ge) => {
      const goalsText = ge.goalsCount === 1 ? 'هدف' : ge.goalsCount === 2 ? 'هدفين' : `${ge.goalsCount} أهداف`;
      const minText = ge.minute ? `(د ${ge.minute})` : '';
      return `${ge.playerName} - ${goalsText} ${minText}`.trim();
    });

    setEditingMatch({
      ...editingMatch,
      goalEvents: updatedGoalEvents,
      goalsSummary: updatedGoalsSummary,
    });
  };

  const handleUpdateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    setIsUpdatingMatch(true);
    try {
      await apiService.updateMatch(editingMatch.id, {
        ...editingMatch,
        homeLogo: editingMatch.homeLogo || clubIdentity.logoUrl || '/logo-salam.png',
        awayLogo: editingMatch.awayLogo || '',
      });
      setAdminNotification('تم تحديث تفاصيل المباراة وسجل الأهداف بنجاح!');
      setEditingMatch(null);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      console.error("❌ Error updating match:", err);
      triggerNotification('❌ حدث خطأ أثناء تحديث البيانات: ' + (err?.message || 'يرجى المحاولة لاحقاً'));
    } finally {
      setIsUpdatingMatch(false);
    }
  };

  const handleDeleteMatch = (match: Match) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'تأكيد حذف المباراة',
      message: 'هل أنت تأكد من حذف هذه المباراة نهائياً من جدول المباريات؟',
      itemName: `${match.homeTeam} ضد ${match.awayTeam}`,
      itemImage: match.homeLogo || match.awayLogo,
      onConfirm: async () => {
        await apiService.deleteMatch(match.id);
        setAdminNotification(`تم حذف المباراة بنجاح.`);
      }
    });
  };

  // Players Handlers
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingPlayer) return;
    if (!newPlayer.name || !newPlayer.name.trim()) {
      triggerNotification('⚠️ يرجى كتابة اسم اللاعب أولاً قبل الإضافة');
      return;
    }

    setIsAddingPlayer(true);
    try {
      console.log("⏳ [handleAddPlayer] Calling apiService.createPlayer...", newPlayer);
      const created = await apiService.createPlayer({
        name: newPlayer.name.trim(),
        number: newPlayer.number ? parseInt(newPlayer.number) : undefined,
        position: newPlayer.position,
        location: newPlayer.location,
        image: newPlayer.image,
        matchesPlayed: newPlayer.matchesPlayed,
        goals: newPlayer.goals,
        assists: newPlayer.assists,
        age: newPlayer.age,
        height: newPlayer.height,
        joinedYear: newPlayer.joinedYear,
        pinCode: newPlayer.pinCode.trim(),
        role: 'player',
      });

      console.log("✅ [handleAddPlayer] Player created successfully:", created);
      setAdminNotification(`تم إضافة اللاعب (${created.name}) والرمز السري بنجاح!`);

      setNewPlayer({
        name: '',
        number: '',
        position: 'مهاجم',
        location: 'كثيبة',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
        matchesPlayed: 12,
        goals: 0,
        assists: 0,
        age: 22,
        height: '175 سم',
        joinedYear: '2022',
        pinCode: '',
      });

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      console.error("❌ Error adding player:", err);
      triggerNotification('❌ حدث خطأ أثناء إضافة اللاعب: ' + (err?.message || 'يرجى المحاولة مرة أخرى'));
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    setIsUpdatingPlayer(true);
    try {
      console.log("⏳ [handleUpdatePlayer] Calling apiService.updatePlayer...", editingPlayer);
      await apiService.updatePlayer(editingPlayer.id, editingPlayer);
      setAdminNotification(`تم تحديث تفاصيل وصورة اللاعب (${editingPlayer.name}) بنجاح!`);
      setEditingPlayer(null);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      console.error("❌ Error updating player:", err);
      triggerNotification('❌ حدث خطأ أثناء تحديث بيانات اللاعب: ' + (err?.message || 'يرجى المحاولة لاحقاً'));
    } finally {
      setIsUpdatingPlayer(false);
    }
  };

  const handleDeletePlayer = (player: Player) => {
    console.log("🔴 [AdminPanel.handleDeletePlayer] Initiating delete modal for player:", player.id, player.name);
    setDeleteConfirmState({
      isOpen: true,
      title: 'تأكيد حذف اللاعب',
      message: 'هل أنت تأكد من حذف هذا اللاعب نهائياً من قاعدة بيانات Firebase وسجلات الفريق؟',
      itemName: `${player.name} ${player.number ? `(#${player.number})` : ''}`,
      itemImage: player.image,
      onConfirm: async () => {
        console.log("🔄 [AdminPanel] Calling apiService.deletePlayer for ID:", player.id);
        const success = await apiService.deletePlayer(player.id);
        console.log("✅ [AdminPanel] apiService.deletePlayer completed with result:", success);
        setAdminNotification(`تم حذف اللاعب "${player.name}" من قاعدة البيانات بنجاح.`);
      }
    });
  };

  const handleExecuteConfirmDelete = async () => {
    if (!deleteConfirmState) return;
    setIsDeletingLoading(true);
    try {
      await deleteConfirmState.onConfirm();
      setDeleteConfirmState(null);
      await onRefreshData();
    } catch (error) {
      console.error("❌ [AdminPanel] Error during deletion:", error);
      setAdminNotification('حدث خطأ أثناء عملية الحذف: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsDeletingLoading(false);
    }
  };

  // Training Sessions
  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTraining.title || isSendingTraining) return;
    setIsSendingTraining(true);
    try {
      const createdSession = await apiService.createTrainingSession(newTraining);

      const messageText = `موعد التمرين: ${newTraining.time} في ${newTraining.location}.${newTraining.note ? `\n📝 ملاحظات المدرب: ${newTraining.note}` : ''}`;
      const notifTitle = newTraining.title.startsWith('🇧🇹')
        ? `إشعار تمرين: ${newTraining.title}`
        : `🇧🇹 إشعار تمرين: ${newTraining.title}`;

      // إرسال إشعار تمرين موحد (يحفظ في قاعدة البيانات ويبث الإشعار عبر OneSignal مرة واحدة فقط)
      const res: any = await apiService.sendBroadcastNotification({
        title: notifTitle,
        message: messageText,
        type: 'training',
        trainingSessionId: createdSession?.id,
        date: 'الآن',
      });

      if (res?.oneSignalResult?.success) {
        triggerNotification(`✅ تم حفظ التمرين وبث الإشعار لـ (${res.oneSignalResult.data?.recipients ?? 'جميع'}) الأجهزة عبر OneSignal بنجاح!`);
      } else if (res?.oneSignalResult?.reason || res?.oneSignalResult?.error) {
        triggerNotification(`⚠️ تم حفظ التمرين بالتطبيق، ولكن OneSignal أبلغ: ${res.oneSignalResult.reason || res.oneSignalResult.error}`);
      } else {
        triggerNotification('✅ تم حفظ وبث إشعار التمرين بنجاح!');
      }
      onRefreshData();
    } catch (err: any) {
      console.error("Error sending training notification:", err);
      triggerNotification('❌ حدث خطأ أثناء حفظ وإرسال إشعار التمرين');
    } finally {
      setIsSendingTraining(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.title.trim() || !broadcastMessage.message.trim() || isSendingBroadcast) return;
    setIsSendingBroadcast(true);

    try {
      const rawTitle = broadcastMessage.title.trim();
      // ضمان ظهور أيقونة فريق السلام 🇧🇹 في بداية جميع الإشعارات الصادرة من لوحة التحكم
      const formattedTitle = rawTitle.startsWith('🇧🇹') ? rawTitle : `🇧🇹 ${rawTitle}`;

      // إرسال إشعار عام موحد لجميع المستخدمين والأجهزة (مرة واحدة فقط دون تكرار)
      const res: any = await apiService.sendBroadcastNotification({
        title: formattedTitle,
        message: broadcastMessage.message.trim(),
        type: 'general',
        date: 'الآن',
      });

      if (res?.oneSignalResult?.success) {
        triggerNotification(`✅ تم بث الإشعار لـ (${res.oneSignalResult.data?.recipients ?? 'جميع'}) الأجهزة عبر OneSignal بنجاح!`);
      } else if (res?.oneSignalResult?.reason || res?.oneSignalResult?.error) {
        triggerNotification(`⚠️ تم حفظ الإشعار بالتطبيق، ولكن OneSignal أبلغ: ${res.oneSignalResult.reason || res.oneSignalResult.error}`);
      } else {
        triggerNotification('✅ تم إرسال الإشعار لجميع المستخدمين بنجاح!');
      }
      setBroadcastMessage({ title: '', message: '' });
      onRefreshData();
    } catch (err: any) {
      console.error("Error sending broadcast notification:", err);
      triggerNotification('❌ حدث خطأ أثناء بث الإشعار: ' + (err?.message || ''));
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleDeleteNotificationFromAdmin = (notif: AppNotification) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'تأكيد حذف الإشعار',
      message: 'هل أنت متأكد من حذف هذا الإشعار نهائياً من سجل وتطبيق الفريق وقاعدة البيانات (Firestore)؟',
      itemName: notif.title,
      onConfirm: async () => {
        await apiService.deleteNotification(notif.id);
        setNotificationsList((prev) => prev.filter((n) => n.id !== notif.id));
        triggerNotification(`✅ تم حذف الإشعار "${notif.title}" نهائياً بنجاح.`);
        if (onRefreshData) onRefreshData();
      }
    });
  };

  const handleDeleteTrainingSessionFromAdmin = (session: TrainingSession) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'تأكيد حذف التمرين وإشعاره',
      message: 'هل أنت متأكد من حذف هذا التمرين وإشعاره وسجل حضوره نهائياً ودائماً من قاعدة البيانات (Firebase Firestore)؟',
      itemName: session.title,
      onConfirm: async () => {
        await apiService.deleteTrainingSession(session.id);
        await apiService.deleteNotification(session.id);
        triggerNotification(`✅ تم حذف التمرين "${session.title}" وإشعاره نهائياً.`);
        if (onRefreshData) onRefreshData();
      }
    });
  };

  // Deduplicate attendance responses by sessionId and player
  const uniqueAttendanceResponses = useMemo(() => {
    const map = new Map<string, AttendanceResponse>();
    attendanceResponses.forEach((r) => {
      if (!r || !r.playerName) return;
      const key = `${r.sessionId || 'cur'}_${(r.playerId || r.playerName).trim().toLowerCase()}`;
      const existing = map.get(key);
      if (!existing || new Date(r.createdAt || 0).getTime() >= new Date(existing.createdAt || 0).getTime()) {
        map.set(key, r);
      }
    });
    return Array.from(map.values());
  }, [attendanceResponses]);

  const attendingList = uniqueAttendanceResponses.filter((r) => r.attending);
  const absentList = uniqueAttendanceResponses.filter((r) => !r.attending);

  // Gallery Upload and Publishing Handlers
  const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setGallerySelectedImages((prev) => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGallerySelectedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePublishGalleryPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gallerySelectedImages.length === 0 && !galleryDescription.trim()) {
      triggerNotification('⚠️ يرجى اختيار صورة واحدة على الأقل أو كتابة نص للحالة');
      return;
    }

    setIsPublishingGallery(true);
    try {
      const defaultTitle = galleryCategory === 'إحماء'
        ? '📸 صور إحماء لاعبي فريق السلام'
        : galleryCategory === 'تغطية'
        ? '📸 تغطية مصورة مباشرة'
        : galleryCategory === 'حالة'
        ? '🔥 حالة جديدة من كواليس النادي'
        : '📸 لقطات وتغطية مصورة';

      // 1. Create and save post permanently in Firestore
      const newPost = await apiService.createGalleryPost({
        title: galleryTitle.trim() || defaultTitle,
        description: galleryDescription.trim(),
        images: gallerySelectedImages,
        imageUrl: gallerySelectedImages[0] || '',
        category: galleryCategory,
        author: 'إعلامي السلام',
        date: 'اليوم',
      });

      // 2. Broadcast push notification via OneSignal & in-app with EXACT title: "إعلامي السلام نقل مباشر"
      if (galleryBroadcastPush) {
        const fixedTitle = 'إعلامي السلام نقل مباشر';
        const messageBody = galleryDescription.trim() || '📸 تم نشر صور وتغطية جديدة في معرض حالات وصور النادي، انقر للمشاهدة والتفاعل!';

        await apiService.sendBroadcastNotification({
          title: fixedTitle,
          message: messageBody,
          type: 'gallery',
          galleryPostId: newPost.id,
          deepLink: 'gallery',
          date: 'الآن',
        });
      }

      triggerNotification('✅ تم نشر الصور والحالة وحفظها في المعرض الدائم وبث الإشعار بنجاح!');
      // Reset form
      setGalleryTitle('');
      setGalleryDescription('');
      setGallerySelectedImages([]);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error publishing gallery post:', err);
      triggerNotification('⚠️ حدث خطأ أثناء النشر: ' + (err?.message || ''));
    } finally {
      setIsPublishingGallery(false);
    }
  };

  const handleDeleteGalleryPost = (post: GalleryPost) => {
    setDeleteConfirmState({
      isOpen: true,
      title: 'تأكيد حذف الصورة/الحالة',
      message: 'هل أنت متأكد من حذف هذه الصورة والحالة نهائياً من معرض الفريق وقاعدة بيانات Firestore؟',
      itemName: post.title || post.description || 'تغطية مصورة',
      onConfirm: async () => {
        setDeletingGalleryPostId(post.id);
        try {
          await apiService.deleteGalleryPost(post.id);
          setGalleryPostsList((prev) => prev.filter((p) => p.id !== post.id));
          triggerNotification('✅ تم حذف التغطية نهائياً من المعرض بنجاح');
          if (onRefreshData) onRefreshData();
        } catch (err: any) {
          triggerNotification('⚠️ حدث خطأ أثناء الحذف: ' + (err?.message || ''));
        } finally {
          setDeletingGalleryPostId(null);
        }
      },
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#1c1212] border-2 border-red-700/80 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-white dir-rtl space-y-4">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-red-600/30 border border-red-500 rounded-full flex items-center justify-center mx-auto text-red-400">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-white mt-2">لوحة تحكم مشرف الفريق</h2>
            <p className="text-xs text-gray-400">أدخل كلمة مرور المشرف للوصول إلى لوحة التحكم الشاملة</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">كلمة المرور:</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                placeholder="أدخل كلمة المرور..."
                className="w-full bg-[#120b0b] border border-red-900/50 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {loginError && (
              <div className="p-2.5 bg-red-950/90 border border-red-600/80 rounded-xl text-red-300 text-xs text-center font-bold shadow-lg animate-pulse">
                ⚠️ {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-colors text-xs"
            >
              تسجيل الدخول
            </button>
          </form>

          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2 rounded-xl"
          >
            إلغاء والعودة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-3 overflow-hidden">
      <div className="bg-[#181111] border-0 sm:border-2 sm:border-red-800/80 sm:rounded-3xl rounded-none w-full max-w-3xl h-[100dvh] sm:h-[94vh] flex flex-col shadow-2xl text-white dir-rtl overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-red-900 via-amber-950 to-red-950 px-3 py-3 sm:px-4 sm:py-3.5 border-b border-red-800/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <h2 className="font-extrabold text-xs sm:text-sm text-white line-clamp-1">لوحة تحكم المشرف الشاملة - فريق السلام بكثيبة</h2>
          </div>
          <button
            onClick={onClose}
            className="bg-black/50 hover:bg-black/80 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-transform active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            إغلاق
          </button>
        </div>

        {/* Tab Navigation Area - Mobile Responsive Dropdown & Scrollable Bar */}
        <div className="bg-[#100a0a] p-2.5 border-b border-red-900/40 flex-shrink-0 space-y-2">
          {/* Mobile Direct Dropdown Selection Menu */}
          <div className="block md:hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-extrabold text-amber-400 flex items-center gap-1">
                <span>⚙️</span> أقسام لوحة التحكم (اختر للتنقل):
              </span>
              <span className="text-[10px] bg-red-900/60 text-amber-200 px-2 py-0.5 rounded-md font-bold">
                {activeTab === 'identity' && '🛡️ الهوية والإعدادات'}
                {activeTab === 'live' && '🔴 النقل المباشر للمباراة'}
                {activeTab === 'gallery' && `🖼️ معرض وصور الفريق (${galleryPostsList.length})`}
                {activeTab === 'training' && '⚽ التمارين والحضور'}
                {activeTab === 'players' && `👥 اللاعبين (${players.length})`}
                {activeTab === 'matches' && `🏟️ المباريات (${matches.length})`}
                {activeTab === 'archive' && `🏆 أرشيف المباريات (${matchArchivesList.length})`}
                {activeTab === 'news' && `📰 الأخبار (${news.length})`}
                {activeTab === 'broadcast' && '🔔 بث إشعار'}
                {activeTab === 'store' && `🛍️ متجر النادي (${storeProducts.length})`}
              </span>
            </div>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full bg-[#221212] text-amber-300 font-extrabold text-xs p-2.5 rounded-xl border-2 border-amber-500/60 focus:outline-none focus:border-amber-400 shadow-lg cursor-pointer"
            >
              <option value="gallery">🖼️ قسم نشر الصور والحالات ومعرض الفريق</option>
              <option value="live">🔴 «النقل المباشر للمباراة» (لوحة المشرف المباشرة)</option>
              <option value="archive">🏆 أرشيف وتقارير المباريات السحابي ({matchArchivesList.length})</option>
              <option value="identity">🛡️ الهوية والإعدادات الشاملة والمطور</option>
              <option value="training">⚽ التمارين وسجل الحضور والغياب</option>
              <option value="players">👥 إدارة قائمة اللاعبين ({players.length})</option>
              <option value="matches">🏟️ نتائج وجدول المباريات ({matches.length})</option>
              <option value="news">📰 الأخبار والبيانات الرسمية ({news.length})</option>
              <option value="broadcast">🔔 بث إشعار جديد للجماهير</option>
              <option value="store">🛍️ إعدادات ومتجر النادي ({storeProducts.length})</option>
            </select>
          </div>

          {/* Quick Tab Buttons Row - Mobile Touch Scroll & Desktop Responsive */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-pan-x border-t border-white/5 pt-1.5 md:border-t-0 md:pt-0">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'gallery'
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-lg scale-105 font-black border border-amber-200 animate-pulse'
                  : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>🖼️</span> نشر الصور والحالات ({galleryPostsList.length})
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'live' ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg scale-105 font-black border border-amber-400 animate-pulse' : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>🔴</span> «النقل المباشر للمباراة»
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'archive' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg scale-105 font-black border border-yellow-300' : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>🏆</span> أرشيف المباريات ({matchArchivesList.length})
            </button>
            <button
              onClick={() => setActiveTab('identity')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'identity' ? 'bg-amber-500 text-black shadow-lg scale-105 font-black' : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>🛡️</span> الهوية والإعدادات
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'training' ? 'bg-red-600 text-white shadow-lg scale-105 font-black' : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>⚽</span> التمارين والحضور
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'players' ? 'bg-red-600 text-white shadow-lg scale-105 font-black' : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>👥</span> اللاعبين ({players.length})
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'matches' ? 'bg-red-600 text-white shadow-lg scale-105 font-black' : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>🏟️</span> المباريات ({matches.length})
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'news' ? 'bg-red-600 text-white shadow-lg scale-105 font-black' : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>📰</span> الأخبار ({news.length})
            </button>
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'broadcast' ? 'bg-amber-600 text-white shadow-lg scale-105 font-black' : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>🔔</span> بث إشعار
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === 'store' ? 'bg-amber-500 text-black shadow-lg scale-105 font-black' : 'text-gray-300 hover:text-white bg-white/10 border border-white/5'
              }`}
            >
              <span>🛍️</span> متجر النادي ({storeProducts.length})
            </button>
          </div>
        </div>

        {/* Content Body with Touch Scrolling */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 text-xs pb-10">
          {/* Global Admin Alert Notification Banner */}
          {adminNotification && (
            <div className="bg-emerald-950/95 border-2 border-emerald-500 rounded-2xl p-3.5 text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 shadow-2xl animate-pulse sticky top-0 z-30 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>{adminNotification}</span>
              </div>
              <button
                onClick={() => setAdminNotification(null)}
                className="p-1 hover:bg-emerald-900/60 rounded-lg text-emerald-300 transition-colors"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* TAB LIVE: Live Match Coverage Console */}
          {activeTab === 'live' && (
            <LiveMatchAdminConsole
              matches={matches}
              players={players}
              onMatchUpdated={onRefreshData}
            />
          )}

          {/* TAB 0: Identity, Full Club Settings & Developer Controls */}
          {activeTab === 'identity' && (
            <form onSubmit={handleSaveIdentityAndStats} className="bg-[#201515] p-3.5 sm:p-4 rounded-2xl border border-red-800/40 space-y-4">
              <h3 className="font-extrabold text-amber-400 text-sm flex items-center gap-2 border-b border-white/10 pb-2">
                <span>🛡️</span> إعدادات الهوية البصرية والمعلومات الشاملة
              </h3>

              {/* Club Identity Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-amber-300 text-xs">بيانات هويات النادي الأساسية:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">اسم الفريق الرسمـي:</label>
                    <input
                      type="text"
                      required
                      value={clubIdentity.name}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, name: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">اللقب الشائع:</label>
                    <input
                      type="text"
                      required
                      value={clubIdentity.nickname}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, nickname: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">سنة التأسيس:</label>
                    <input
                      type="text"
                      required
                      value={clubIdentity.foundedYear}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, foundedYear: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">ألوان الفريق الرسمية:</label>
                    <input
                      type="text"
                      required
                      value={clubIdentity.colors}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, colors: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">الموقع والجغرافيا:</label>
                    <input
                      type="text"
                      required
                      value={clubIdentity.location}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, location: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">طموح الفريق:</label>
                  <input
                    type="text"
                    required
                    value={clubIdentity.ambition}
                    onChange={(e) => setClubIdentity({ ...clubIdentity, ambition: e.target.value })}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">نبذة ورؤية الفريق:</label>
                  <textarea
                    rows={2}
                    value={clubIdentity.description}
                    onChange={(e) => setClubIdentity({ ...clubIdentity, description: e.target.value })}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Logo Picker */}
              <ImagePicker
                label="تعديل شعار الفريق الرئيسي (اختيار صورة جديدة من المعرض أو الكاميرا):"
                value={clubIdentity.logoUrl || ''}
                onChange={(dataUrl) => setClubIdentity((prev) => ({ ...prev, logoUrl: dataUrl }))}
              />

              {/* Stats & Numbers Control Section */}
              <div className="bg-[#140b0b] p-3.5 rounded-2xl border border-amber-500/30 space-y-3">
                <h4 className="font-extrabold text-amber-300 text-xs flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" /> التحكم بأرقام وإحصائيات الإنجازات بالنادي:
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1 font-bold">عدد الكؤوس والإنجازات:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      dir="ltr"
                      value={clubStats.achievementsCount}
                      onChange={(e) => setClubStats({ ...clubStats, achievementsCount: parseStandardNumber(e.target.value, 0) })}
                      className="w-full bg-[#0a0505] border border-amber-500/40 rounded-xl p-2 text-amber-300 font-extrabold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1 font-bold">عدد المباريات الملعوبة:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      dir="ltr"
                      value={clubStats.matchesCount}
                      onChange={(e) => setClubStats({ ...clubStats, matchesCount: parseStandardNumber(e.target.value, 0) })}
                      className="w-full bg-[#0a0505] border border-amber-500/40 rounded-xl p-2 text-amber-300 font-extrabold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1 font-bold">عدد الانتصارات:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      dir="ltr"
                      value={clubStats.winsCount}
                      onChange={(e) => setClubStats({ ...clubStats, winsCount: parseStandardNumber(e.target.value, 0) })}
                      className="w-full bg-[#0a0505] border border-amber-500/40 rounded-xl p-2 text-amber-300 font-extrabold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1 font-bold">إجمالي عدد اللاعبين:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      dir="ltr"
                      value={clubStats.playersCount}
                      onChange={(e) => setClubStats({ ...clubStats, playersCount: parseStandardNumber(e.target.value, 0) })}
                      className="w-full bg-[#0a0505] border border-amber-500/40 rounded-xl p-2 text-amber-300 font-extrabold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Head Coach Control Section */}
              <div className="bg-[#241111] p-3.5 rounded-2xl border-2 border-amber-500/50 space-y-3 shadow-lg">
                <h4 className="font-extrabold text-amber-300 text-xs flex items-center gap-1.5">
                  👑 التحكم الكامل ببيانات مدرب الفريق الأول والتعاقد:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-gray-300 text-[11px] mb-1 font-bold">اسم المدرب (الكابتن):</label>
                    <input
                      type="text"
                      value={clubIdentity.coachName || ''}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, coachName: e.target.value })}
                      placeholder="مثال: معاذ بامطرف (بكرون)"
                      className="w-full bg-[#120a0a] border border-amber-500/40 rounded-xl p-2 text-white text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-[11px] mb-1 font-bold">الصفة / المسمى الوظيفي:</label>
                    <input
                      type="text"
                      value={clubIdentity.coachTitle || ''}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, coachTitle: e.target.value })}
                      placeholder="مثال: مدرب الفريق الأول"
                      className="w-full bg-[#120a0a] border border-amber-500/40 rounded-xl p-2 text-amber-300 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-[11px] mb-1 font-bold">نوع العقد والصفة:</label>
                    <input
                      type="text"
                      value={clubIdentity.coachContract || ''}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, coachContract: e.target.value })}
                      placeholder="مثال: عقد دائم"
                      className="w-full bg-[#120a0a] border border-amber-500/40 rounded-xl p-2 text-white text-xs font-bold"
                    />
                  </div>
                </div>

                <ImagePicker
                  label="تغيير صورة مدرب الفريق الأول (اختيار صورة جديدة من المعرض أو الكاميرا):"
                  value={clubIdentity.coachPhotoUrl || ''}
                  onChange={(dataUrl) => setClubIdentity((prev) => ({ ...prev, coachPhotoUrl: dataUrl }))}
                />
              </div>

              {/* Developer Info Settings Section */}
              <div className="bg-[#0e1824] p-3.5 rounded-2xl border border-blue-500/30 space-y-3">
                <h4 className="font-extrabold text-blue-300 text-xs flex items-center gap-1.5">
                  👨‍💻 بيانات مطور التطبيق والمعلومات التقنية:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-gray-300 text-[11px] mb-1 font-bold">اسم المطور:</label>
                    <input
                      type="text"
                      value={clubIdentity.developerName}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, developerName: e.target.value })}
                      className="w-full bg-[#080d14] border border-blue-900 rounded-xl p-2 text-blue-200"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-[11px] mb-1 font-bold">البريد الإلكتروني:</label>
                    <input
                      type="email"
                      value={clubIdentity.developerEmail}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, developerEmail: e.target.value })}
                      className="w-full bg-[#080d14] border border-blue-900 rounded-xl p-2 text-blue-200 dir-ltr text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-[11px] mb-1 font-bold">رقم التواصل الأول:</label>
                    <input
                      type="text"
                      value={clubIdentity.developerPhone1}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, developerPhone1: e.target.value })}
                      className="w-full bg-[#080d14] border border-blue-900 rounded-xl p-2 text-blue-200 dir-ltr text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-[11px] mb-1 font-bold">رقم التواصل الثاني:</label>
                    <input
                      type="text"
                      value={clubIdentity.developerPhone2}
                      onChange={(e) => setClubIdentity({ ...clubIdentity, developerPhone2: e.target.value })}
                      className="w-full bg-[#080d14] border border-blue-900 rounded-xl p-2 text-blue-200 dir-ltr text-left"
                    />
                  </div>
                </div>

                {/* Developer Image Picker */}
                <ImagePicker
                  label="تغيير صورة المطور الشخصية (اختيار صورة جديدة من المعرض أو الكاميرا):"
                  value={clubIdentity.developerPhotoUrl || ''}
                  onChange={(dataUrl) => setClubIdentity((prev) => ({ ...prev, developerPhotoUrl: dataUrl }))}
                />
              </div>

              <button
                type="submit"
                disabled={isSavingIdentity}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold py-3 rounded-xl shadow-lg transition-transform active:scale-95 text-xs flex items-center justify-center gap-2"
              >
                {isSavingIdentity ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>جاري حفظ التعديلات والإعدادات في السيرفر...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>حفظ جميع التعديلات والإعدادات والمعلومات فوراً</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 1: Training Notifications & Attendance Monitor */}
          {activeTab === 'training' && (
            <div className="space-y-5">
              <form onSubmit={handleCreateTraining} className="bg-[#201515] p-4 rounded-2xl border border-red-800/40 space-y-3">
                <h3 className="font-extrabold text-amber-400 text-sm flex items-center gap-1.5">
                  <Send className="w-4 h-4" /> إرسال إشعار تمرين جديد للاعبين
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">عنوان التمرين:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تمرين الفريق الأول"
                      value={newTraining.title}
                      onChange={(e) => setNewTraining({ ...newTraining, title: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">التوقيت (الساعة):</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 4:30 مساءً"
                      value={newTraining.time}
                      onChange={(e) => setNewTraining({ ...newTraining, time: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">الملعب / المكان:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: ملعب السلام"
                      value={newTraining.location}
                      onChange={(e) => setNewTraining({ ...newTraining, location: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">ملاحظات المدرب:</label>
                    <input
                      type="text"
                      placeholder="أي تعليمات أو ملاحظات إضافية..."
                      value={newTraining.note}
                      onChange={(e) => setNewTraining({ ...newTraining, note: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingTraining}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-extrabold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  {isSendingTraining ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>جاري حفظ التمرين وبث الإشعار...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>📢 إرسال وحفظ إشعار التمرين فوراً لهواتف اللاعبين</span>
                    </>
                  )}
                </button>
              </form>

              {/* Current Active Training Sessions with Direct Delete */}
              {trainingSessions && trainingSessions.length > 0 && (
                <div className="bg-[#180e0e] border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="font-extrabold text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                      <span>🏃‍♂️</span> التمارين المسجلة الحالية ({trainingSessions.length}):
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {trainingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-[#120808] border border-amber-500/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-white text-xs sm:text-sm">{session.title}</span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                              ⏰ {session.time}
                            </span>
                            <span className="text-[10px] bg-black/60 text-gray-300 border border-white/10 px-2 py-0.5 rounded-md">
                              📍 {session.location}
                            </span>
                          </div>
                          {session.note && (
                            <p className="text-xs text-gray-300 line-clamp-1">{session.note}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTrainingSessionFromAdmin(session)}
                          className="self-end sm:self-center px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/40 hover:border-red-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow cursor-pointer"
                          title="حذف هذا التمرين وإشعاره نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف نهائي</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendance Dashboard */}
              <div className="bg-[#140e0e] border border-red-900/50 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <span>📋</span> سجل تجاوب وتحضير اللاعبين
                  </h3>
                  <button
                    type="button"
                    disabled={isRefreshingAttendance}
                    onClick={handleRefreshAttendance}
                    className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAttendance ? 'animate-spin text-amber-400' : ''}`} />
                    <span>{isRefreshingAttendance ? 'جاري التحديث...' : 'تحديث القائمة'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-3 text-center">
                    <span className="block text-xl font-black text-emerald-400">{attendingList.length}</span>
                    <span className="text-gray-300 font-bold text-xs">سيعودون / حاضرون ✅</span>
                  </div>

                  <div className="bg-red-950/60 border border-red-500/50 rounded-xl p-3 text-center">
                    <span className="block text-xl font-black text-red-400">{absentList.length}</span>
                    <span className="text-gray-300 font-bold text-xs">معتذرون عن التمرين ❌</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-400 text-xs">قائمة الحاضرين:</h4>
                  {attendingList.length === 0 ? (
                    <p className="text-gray-500 italic p-2 bg-[#0c0808] rounded-xl text-center">لا يوجد استجابات بعد.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {attendingList.map((res) => (
                        <div key={res.id} className="bg-emerald-950/30 border border-emerald-800/40 p-2 rounded-xl flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{res.playerName} {res.jerseyNumber ? `(#${res.jerseyNumber})` : ''}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">حاضر ✅</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAttendance(res);
                              }}
                              className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/60 transition-colors cursor-pointer active:scale-90"
                              title="مسح من القائمة"
                            >
                              <Trash2 className="w-4 h-4 text-red-400/80 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <h4 className="font-bold text-red-400 text-xs">قائمة المعتذرين والأسباب:</h4>
                  {absentList.length === 0 ? (
                    <p className="text-gray-500 italic p-2 bg-[#0c0808] rounded-xl text-center">لا يوجد اعتذارات.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {absentList.map((res) => (
                        <div key={res.id} className="bg-red-950/30 border border-red-800/40 p-2 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-white block">{res.playerName}</span>
                            <span className="text-red-300 text-[10px]">السبب: {res.excuseReason || 'غير محدد'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-bold">معتذر ❌</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAttendance(res);
                              }}
                              className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/60 transition-colors cursor-pointer active:scale-90"
                              title="مسح من القائمة"
                            >
                              <Trash2 className="w-4 h-4 text-red-400/80 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Full Players Management */}
          {activeTab === 'players' && (
            <div className="space-y-4">
              <form onSubmit={handleAddPlayer} className="bg-[#201515] p-4 rounded-2xl border border-red-800/40 space-y-3">
                <h3 className="font-extrabold text-amber-400 text-sm">إضافة لاعب جديد لسجلات الفريق</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">اسم اللاعب الكامل:</label>
                    <input
                      type="text"
                      required
                      placeholder="اسم اللاعب"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">رقم القميص:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      dir="ltr"
                      placeholder="مثال: 10"
                      value={newPlayer.number || ''}
                      onChange={(e) => setNewPlayer({ ...newPlayer, number: parseStandardNumber(e.target.value, 0) || (e.target.value === '' ? undefined : (newPlayer.number as any)) })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">المركز الكروي:</label>
                    <select
                      value={newPlayer.position}
                      onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value as any })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    >
                      <option value="حارس مرمى">حارس مرمى</option>
                      <option value="مدافع">مدافع</option>
                      <option value="لاعب وسط">لاعب وسط</option>
                      <option value="مهاجم">مهاجم</option>
                      <option value="جهاز فني">جهاز فني</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">المنطقة / السكن:</label>
                    <input
                      type="text"
                      placeholder="مثال: كثيبة - غيل باوزير"
                      value={newPlayer.location}
                      onChange={(e) => setNewPlayer({ ...newPlayer, location: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">العمر:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      dir="ltr"
                      placeholder="مثال: 22"
                      value={newPlayer.age || ''}
                      onChange={(e) => setNewPlayer({ ...newPlayer, age: parseStandardNumber(e.target.value, 0) || (e.target.value === '' ? undefined : (newPlayer.age as any)) })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">الطول:</label>
                    <input
                      type="text"
                      placeholder="مثال: 175 سم"
                      value={newPlayer.height}
                      onChange={(e) => setNewPlayer({ ...newPlayer, height: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">تاريخ الانضمام:</label>
                    <input
                      type="text"
                      placeholder="مثال: 2022"
                      value={newPlayer.joinedYear}
                      onChange={(e) => setNewPlayer({ ...newPlayer, joinedYear: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-amber-300 font-bold mb-1 text-xs">🔑 الرمز السري للاعب (PIN Code):</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="رمز الدخول الخاص باللاعب"
                    value={newPlayer.pinCode}
                    onChange={(e) => setNewPlayer({ ...newPlayer, pinCode: e.target.value })}
                    className="w-full bg-[#120a0a] border-2 border-amber-500/60 rounded-xl p-2.5 text-amber-300 font-black text-center tracking-widest text-sm focus:border-amber-400 focus:outline-none dir-ltr"
                  />
                  <span className="text-[10px] text-gray-400 block mt-1">الرمز الذي يدخله اللاعب عند اختيار "دخول خاص للاعبين" في شاشة البداية.</span>
                </div>

                <ImagePicker
                  label="الصورة الشخصية للاعب (اختيار صورة من الهاتف/المعرض):"
                  value={newPlayer.image}
                  onChange={(dataUrl) => setNewPlayer({ ...newPlayer, image: dataUrl })}
                />

                <button
                  type="submit"
                  disabled={isAddingPlayer}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                >
                  {isAddingPlayer ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>جاري حفظ صورة وبيانات اللاعب في Firebase...</span>
                    </>
                  ) : (
                    '➕ إضافة اللاعب والرمز السري فوراً'
                  )}
                </button>
              </form>

              {/* Player List with Full Editing */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">قائمة اللاعبين وتحديث الصور والبيانات ({players.length}):</h4>
                {players.map((p) => (
                  <div key={p.id} className="bg-[#120d0d] p-3 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <img src={p.image} className="w-11 h-11 rounded-xl object-cover border border-amber-500/40 shadow-md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-white text-xs">{p.name} {p.number ? `(#${p.number})` : ''}</h5>
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                            🔑 {p.pinCode || 'غير محدد'}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-400 block mt-0.5">{p.position} • {p.location || 'كثيبة'}</span>
                        <span className="text-[9px] text-gray-400">مباريات: {p.matchesPlayed || 0} | أهداف: {p.goals || 0} | صناعة: {p.assists || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => setEditingPlayer(p)}
                        className="px-2.5 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-xl text-[10px] font-bold border border-amber-500/40 flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" /> تعديل شامـل
                      </button>

                      <button
                        onClick={() => handleDeletePlayer(p)}
                        className="px-2.5 py-1.5 bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-bold border border-red-500/40 flex items-center gap-1 transition-colors"
                        title="حذف اللاعب نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Full Matches Management */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              <form onSubmit={handleAddMatch} className="bg-[#201515] p-4 rounded-2xl border border-red-800/40 space-y-3">
                <h3 className="font-extrabold text-amber-400 text-sm">إضافة مباراة جديدة للجدول</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">اسم البطولة:</label>
                    <input
                      type="text"
                      required
                      value={newMatch.tournament}
                      onChange={(e) => setNewMatch({ ...newMatch, tournament: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">الفريق المنافس:</label>
                    <input
                      type="text"
                      required
                      placeholder="اسم الفريق المنافس"
                      value={newMatch.awayTeam}
                      onChange={(e) => setNewMatch({ ...newMatch, awayTeam: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ImagePicker
                    label="🖼️ شعار فريق السلام / المستضيف (اختيار من المعرض):"
                    value={newMatch.homeLogo || ''}
                    onChange={(dataUrl) => setNewMatch({ ...newMatch, homeLogo: dataUrl })}
                  />

                  <ImagePicker
                    label="🖼️ شعار الفريق المنافس (اختيار من المعرض):"
                    value={newMatch.awayLogo}
                    onChange={(dataUrl) => setNewMatch({ ...newMatch, awayLogo: dataUrl })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">📅 تاريخ المباراة:</label>
                    <input
                      type="date"
                      required
                      value={newMatch.date}
                      onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">🕐 الوقت (توقيت المكلا):</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 8:00 مساءً"
                      value={newMatch.time}
                      onChange={(e) => setNewMatch({ ...newMatch, time: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">📌 نوع وقسم المباراة:</label>
                    <select
                      value={newMatch.isUpcoming ? 'upcoming' : 'finished'}
                      onChange={(e) => setNewMatch({ ...newMatch, isUpcoming: e.target.value === 'upcoming' })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white font-bold"
                    >
                      <option value="upcoming">⏳ مباراة قادمة (تفعيل العداد التنازلي على الصفحة الرئيسية)</option>
                      <option value="finished">🏁 مباراة انتهت (سجل الأهداف والنتيجة السابقة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">📍 الملعب:</label>
                    <input
                      type="text"
                      required
                      value={newMatch.stadium}
                      onChange={(e) => setNewMatch({ ...newMatch, stadium: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                {/* Auto Generated Day & Date Preview Badge + Countdown Status */}
                <div className="space-y-2">
                  <div className="bg-[#120a0a] border border-amber-500/40 rounded-xl p-2.5 text-xs flex items-center justify-between text-amber-300 font-bold">
                    <span className="flex items-center gap-1 text-gray-400 font-semibold">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      اليوم والتاريخ الظاهر للجمهور تلقائياً:
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg border border-amber-500/50 font-black">
                      {formatArabicFullDate(newMatch.date)}
                    </span>
                  </div>

                  {newMatch.isUpcoming && (() => {
                    const cd = getMatchCountdown(newMatch.date, newMatch.time);
                    if (cd.isStarted) {
                      return (
                        <div className="bg-yellow-950/80 border border-yellow-500/60 rounded-xl p-2.5 text-xs text-amber-200 flex items-center gap-2">
                          <span className="text-base">⚠️</span>
                          <span>
                            <strong>تنبيه:</strong> وقت وتاريخ هذه المباراة قد مضى. لظهور العداد التنازلي، اختر تاريخاً مستقبلياً (مثل غداً أو بعد أيام).
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-2.5 text-xs text-emerald-200 flex items-center gap-2">
                        <span className="text-base">✅</span>
                        <span>
                          <strong>العداد التنازلي نشط!</strong> متبقي على انطلاق المباراة: <strong>{cd.days} يوم و {cd.hours} ساعة و {cd.minutes} دقيقة</strong>.
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <button
                  type="submit"
                  disabled={isAddingMatch}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                >
                  {isAddingMatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>جاري حفظ ورسوم المباراة والصور...</span>
                    </>
                  ) : (
                    '➕ إضافة المباراة'
                  )}
                </button>
              </form>

              {/* Matches List */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">جدول وقائمة المباريات ({matches.length}):</h4>
                {matches.map((m) => (
                  <div key={m.id} className="bg-[#120d0d] p-3 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-white text-sm flex items-center gap-1.5">
                          {m.homeTeam} VS {m.awayTeam}
                          {m.isLive && (
                            <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                              ● مباشر الان ({m.livePeriod})
                            </span>
                          )}
                        </h5>
                        <span className="text-[10px] text-amber-400 block">{m.tournament} • {m.date} ({m.isUpcoming ? 'قادمة' : 'انتهت'})</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!m.isUpcoming && (
                          <button
                            type="button"
                            onClick={() => handleArchiveFromPastMatch(m)}
                            className="px-2.5 py-1.5 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 rounded-xl text-[10px] font-bold border border-yellow-500/40 flex items-center gap-1 shadow-sm transition active:scale-95"
                            title="أرشفة هذه المباراة وتقريرها في الأرشيف السحابي"
                          >
                            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                            <span>📋 أرشفة التقرير</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenLiveMatchControl(m)}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black shadow-md flex items-center gap-1 border border-amber-400/50"
                        >
                          <Radio className="w-3.5 h-3.5 animate-ping" />
                          🔴 إدارة وتغطية أحداث المباراة مباشر
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingMatch(m)}
                          className="px-2 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-xl text-[10px] font-bold border border-amber-500/30 flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> تعديل الشعار والنتيجة
                        </button>

                        <button type="button" onClick={() => handleDeleteMatch(m)} className="p-1.5 text-red-400 hover:bg-red-950/60 rounded-xl border border-red-500/20">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: News & Media Management */}
          {activeTab === 'news' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNews} className="bg-[#201515] p-4 rounded-2xl border border-red-800/40 space-y-3">
                <h3 className="font-extrabold text-amber-400 text-sm">نشر خبر جديد في التطبيق</h3>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">عنوان الخبر الرئيسي:</label>
                  <input
                    type="text"
                    required
                    placeholder="عنوان الخبر..."
                    value={newNews.title}
                    onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">تصنيف الخبر:</label>
                    <select
                      value={newNews.category}
                      onChange={(e) => setNewNews({ ...newNews, category: e.target.value as any })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    >
                      <option value="أخبار">أخبار الفريق</option>
                      <option value="مفاجآت">مفاجآت وفعاليات</option>
                      <option value="انتقالات">صفقات وانتقالات</option>
                      <option value="مقالات">مقالات وتغطيات</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">التاريخ:</label>
                    <input
                      type="date"
                      value={newNews.date}
                      onChange={(e) => setNewNews({ ...newNews, date: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                <ImagePicker
                  label="صورة الخبر التوضيحية (اختيار من المعرض/الكاميرا):"
                  value={newNews.image}
                  onChange={(dataUrl) => setNewNews({ ...newNews, image: dataUrl })}
                />

                <div>
                  <label className="block text-gray-300 font-bold mb-1">تفاصيل الخبر:</label>
                  <textarea
                    rows={3}
                    required
                    value={newNews.content}
                    onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAddingNews}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                >
                  {isAddingNews ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>جاري حفظ ونشر الخبر...</span>
                    </>
                  ) : (
                    '📰 نشر الخبر فوراً'
                  )}
                </button>
              </form>

              {/* News Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">الأخبار المنشورة ({news.length}):</h4>
                {news.map((item) => (
                  <div key={item.id} className="bg-[#120d0d] p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={item.image} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                      <div>
                        <h5 className="font-bold text-white line-clamp-1 text-xs">{item.title}</h5>
                        <span className="text-[10px] text-amber-400">{item.category} • {item.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingNews(item)}
                        className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-bold border border-amber-500/30"
                      >
                        <Edit className="w-3 h-3" /> تعديل
                      </button>

                      <button onClick={() => handleDeleteNews(item)} className="p-1.5 text-red-400 hover:bg-red-950/60 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Push Notifications Broadcast */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4">
              {/* Notification Header */}
              <div className="bg-[#1f1212] border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="font-black text-amber-400 text-sm">إرسال إشعار فوري لجميع المستخدمين</h3>
                      <p className="text-xs text-gray-400">بث إشعار عام يظهر على أجهزة اللاعبين وجماهير الفريق عبر OneSignal وداخل التطبيق</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Broadcast Form */}
              <form onSubmit={handleSendBroadcast} className="bg-[#201515] p-5 rounded-2xl border border-red-800/60 shadow-xl space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-400 block">⚡ قوالب جاهزة سريعة:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastMessage({
                          title: '🇧🇹 موعد تمرين جديد - فريق السلام',
                          message: 'تنبيه لجميع اللاعبين: يرجى الاطلاع على موعد ومكان التمرين القادم وتأكيد الحضور.',
                        });
                      }}
                      className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      🏃‍♂️ موعد تمرين
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastMessage({
                          title: '🇧🇹 ⚽ انطلاق تغطية المباراة!',
                          message: 'بدأت الآن مجريات مباراة فريق السلام بكثيبة. تابع البث المباشر ولحظات الأهداف والتشكيلة من داخل التطبيق.',
                        });
                      }}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      ⚽ مباراة وبث مباشر
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastMessage({
                          title: '🇧🇹 📢 بيان إداري من إدارة النادي',
                          message: 'تعلن إدارة فريق السلام بكثيبة لكافة اللاعبين والجمهور عن الاجتماع الدوري وجدول الأنشطة القادمة.',
                        });
                      }}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      📢 إعلان إداري
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastMessage({
                          title: '🇧🇹 🏆 ألف مبروك لصقور الريف!',
                          message: 'نبارك لجميع جماهير ولاعبي فريق السلام بكثيبة الفوز الرائع والمستوى المشرف اليوم.',
                        });
                      }}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      🏆 تهنئة بالفوز
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-gray-200 font-bold mb-1 text-xs">
                    عنوان الإشعار: <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="اكتب عنوان الإشعار بحرية (مثال: موعد تمرين اليوم، مباراة هامة، إعلان عاجل...)"
                    value={broadcastMessage.title}
                    onChange={(e) => setBroadcastMessage({ ...broadcastMessage, title: e.target.value })}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none placeholder-gray-500 font-bold"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-gray-200 font-bold mb-1 text-xs">
                    نص الإشعار والتفاصيل: <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="اكتب نص الإشعار وتفاصيل المكان والتوقيت بحرية..."
                    value={broadcastMessage.message}
                    onChange={(e) => setBroadcastMessage({ ...broadcastMessage, message: e.target.value })}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none placeholder-gray-500 leading-relaxed"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSendingBroadcast}
                  className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 text-black font-black py-3.5 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-98 text-xs cursor-pointer"
                >
                  {isSendingBroadcast ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>جاري إرسال الإشعار...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال الإشعار الآن</span>
                    </>
                  )}
                </button>
              </form>

              {/* Registered Devices and Push Subscribers Section (Middle Card) */}
              <div className="bg-[#1a0f0f] border border-red-800/60 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-900/40 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                        حالة ونظام خادم الإشعارات السحابية (OneSignal)
                      </h4>
                      <p className="text-xs text-gray-400">
                        متابعة وتحديث سجل أجهزة هواتف اللاعبين والمشجعين المسجلة لاستقبال البث والإشعارات
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRefreshDevices}
                    disabled={isRefreshingDevices}
                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs sm:text-sm font-black px-4 py-2 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                  >
                    {isRefreshingDevices ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري تحديث الأجهزة...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>تحديث الأجهزة المسجلة بالسيرفر</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Info Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="bg-[#120808] border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-gray-300 font-bold">الأجهزة المسجلة بالسيرفر:</span>
                    <span className="font-extrabold text-emerald-400 flex items-center gap-1.5 text-sm sm:text-base">
                      <Smartphone className="w-4 h-4" />
                      {oneSignalConfigData.registeredDevicesCount ?? 0} جهاز نشط
                    </span>
                  </div>

                  <div className="bg-[#120808] border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-gray-300 font-bold">حالة نظام البث:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      يعمل ومتزامن بالسيرفر
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card: Live Stats & Monitoring Card (Real-Time Firestore onSnapshot) */}
              <div className="bg-[#160b0b] border-2 border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
                        📊 المراقبة والإحصائيات المباشرة للبث والتفاعل (OneSignal + Firestore)
                      </h4>
                      <p className="text-xs text-gray-400">
                        متابعة الأجهزة الفعلية المستلمة، النقرات الحقيقية (Clicks)، وتأكيدات القراءة الفورية
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRefreshAllNotificationsStats}
                      disabled={isRefreshingAllNotifs}
                      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-black px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      title="تحديث شامل للأجهزة والنقرات وجميع الإشعارات"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAllNotifs ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingAllNotifs ? 'جاري التحديث الحي...' : '🔄 تحديث الإحصائيات'}</span>
                    </button>

                    <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      تزامن حي (onSnapshot)
                    </span>
                  </div>
                </div>

                {/* 4 Real-time Metric Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[#100606] border border-amber-500/30 rounded-xl p-3 text-center space-y-1">
                    <span className="text-gray-400 font-bold block text-[11px]">📢 إجمالي الإشعارات</span>
                    <span className="text-lg font-black text-amber-400 block">{notificationsList.length}</span>
                  </div>

                  <div className="bg-[#100606] border border-emerald-500/30 rounded-xl p-3 text-center space-y-1">
                    <span className="text-gray-400 font-bold block text-[11px]">📲 الأجهزة المسجلة</span>
                    <span className="text-lg font-black text-emerald-400 block">{oneSignalConfigData.registeredDevicesCount ?? 0}</span>
                  </div>

                  <div className="bg-[#100606] border border-blue-500/30 rounded-xl p-3 text-center space-y-1">
                    <span className="text-gray-400 font-bold block text-[11px]">👆 إجمالي النقرات والتفاعل</span>
                    <span className="text-lg font-black text-blue-400 block">
                      {notificationsList.reduce((acc, n) => acc + (n.clicksCount || 0), 0)}
                    </span>
                  </div>

                  <div className="bg-[#100606] border border-purple-500/30 rounded-xl p-3 text-center space-y-1">
                    <span className="text-gray-400 font-bold block text-[11px]">👁️ تأكيدات القراءة</span>
                    <span className="text-lg font-black text-purple-400 block">
                      {notificationsList.reduce((acc, n) => acc + (n.readReceiptsCount || (n.readByUsers?.length || 0)), 0)}
                    </span>
                  </div>
                </div>

                {/* Real-time Broadcast Notifications History Feed with Detailed Live Analytics */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>سجل الإشعارات وتقارير التسليم والنقرات الحية ({notificationsList.length}):</span>
                    </h5>
                  </div>

                  {notificationsList.length === 0 ? (
                    <div className="bg-[#100606] border border-white/5 rounded-xl p-6 text-center text-gray-500 text-xs">
                      لا توجد إشعارات مبثوثة حالياً. يمكنك استخدام النموذج بالأعلى لبث أول إشعار للجماهير واللاعبين.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {notificationsList.map((notif) => (
                        <div
                          key={notif.id}
                          className="bg-[#120808] border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-3.5 space-y-2.5 transition-colors shadow-md"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-amber-300 text-xs break-words">
                                  {notif.title}
                                </span>
                                <span className="text-[10px] bg-black/60 text-gray-400 border border-white/10 px-2 py-0.5 rounded-md font-bold">
                                  {notif.date || 'الآن'}
                                </span>
                                {notif.type && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    notif.type === 'training'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : notif.type === 'match'
                                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                      : notif.type === 'gallery'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  }`}>
                                    {notif.type === 'training' ? '🏃‍♂️ تمرين' : notif.type === 'match' ? '⚽ مباراة' : notif.type === 'gallery' ? '📸 معرض/نقل' : '📢 عام'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-300 leading-relaxed break-words">
                                {notif.message}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRefreshSingleNotifStats(notif.id, notif.oneSignalId)}
                                disabled={refreshingNotifId === notif.id}
                                className="p-1.5 text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/30 rounded-xl border border-amber-500/30 transition-transform active:scale-95"
                                title="تحديث إحصائيات ونقرات هذا الإشعار"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshingNotifId === notif.id ? 'animate-spin text-amber-400' : ''}`} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteNotificationFromAdmin(notif)}
                                className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/80 rounded-xl border border-red-500/30 transition-transform active:scale-95"
                                title="حذف هذا الإشعار نهائياً"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Live Delivery & Click Metrics Bar */}
                          <div className="bg-[#0b0505] border border-white/5 rounded-xl p-2 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Smartphone className="w-3 h-3" />
                                المستلمة: <strong>{notif.deliveredCount ?? oneSignalConfigData.registeredDevicesCount ?? 1}</strong>
                              </span>
                              <span className="text-blue-400 font-bold flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                النقرات (Clicks): <strong>{notif.clicksCount ?? 0}</strong>
                              </span>
                              <span className="text-purple-400 font-bold flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                القراءات الفعلية: <strong>{notif.readReceiptsCount ?? (notif.readByUsers?.length || 0)}</strong>
                              </span>
                            </div>

                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              (notif.clicksCount || 0) > 0 || (notif.readReceiptsCount || 0) > 0
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : 'bg-gray-800 text-gray-300 border border-gray-700'
                            }`}>
                              {(notif.clicksCount || 0) > 0 || (notif.readReceiptsCount || 0) > 0 ? '🟢 متفاعل ومقروء' : '⚪ تم البث'}
                            </span>
                          </div>

                          {/* Read Receipts Users Names Preview if available */}
                          {notif.readByUsers && notif.readByUsers.length > 0 && (
                            <div className="text-[10px] bg-purple-950/30 border border-purple-800/30 rounded-lg p-2 text-purple-200 flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-purple-300">👥 تفاعل وقرأ الإشعار:</span>
                              {notif.readByUsers.map((user, idx) => (
                                <span key={idx} className="bg-purple-900/60 px-1.5 py-0.5 rounded border border-purple-500/30">
                                  {user}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Match Archive Management */}
          {activeTab === 'archive' && (
            <div className="space-y-4">
              {/* CREATE / EDIT ARCHIVE MATCH CARD FORM */}
              <form onSubmit={handleSaveArchiveCard} className="bg-[#201515] p-4 rounded-2xl border border-yellow-500/50 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between border-b border-yellow-500/20 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-extrabold text-yellow-400 text-sm">
                      {editingArchiveCard ? 'تعديل بطاقة وتقرير المباراة في الأرشيف' : 'إضافة وتوثيق بطاقة مباراة جديدة في الأرشيف السحابي'}
                    </h3>
                  </div>
                  {editingArchiveCard && (
                    <button
                      type="button"
                      onClick={() => setEditingArchiveCard(null)}
                      className="text-gray-400 hover:text-white text-xs bg-black/40 px-2 py-1 rounded-lg border border-white/10"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">🏆 البطولة / المناسبة:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: دوري شرفاء بكثيبة"
                      value={editingArchiveCard ? editingArchiveCard.tournament : newArchiveCard.tournament || ''}
                      onChange={(e) => {
                        if (editingArchiveCard) {
                          setEditingArchiveCard({ ...editingArchiveCard, tournament: e.target.value });
                        } else {
                          setNewArchiveCard({ ...newArchiveCard, tournament: e.target.value });
                        }
                      }}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">📅 الموسم / التاريخ:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="موسم 2025/2026"
                        value={editingArchiveCard ? editingArchiveCard.season || '' : newArchiveCard.season || ''}
                        onChange={(e) => {
                          if (editingArchiveCard) {
                            setEditingArchiveCard({ ...editingArchiveCard, season: e.target.value });
                          } else {
                            setNewArchiveCard({ ...newArchiveCard, season: e.target.value });
                          }
                        }}
                        className="bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                      />
                      <input
                        type="date"
                        required
                        value={editingArchiveCard ? editingArchiveCard.date : newArchiveCard.date || ''}
                        onChange={(e) => {
                          if (editingArchiveCard) {
                            setEditingArchiveCard({ ...editingArchiveCard, date: e.target.value });
                          } else {
                            setNewArchiveCard({ ...newArchiveCard, date: e.target.value });
                          }
                        }}
                        className="bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Teams & Score */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#120808] p-3 rounded-xl border border-white/5">
                  <div className="space-y-2">
                    <label className="block text-amber-300 font-bold">الفريق الأول (السلام):</label>
                    <input
                      type="text"
                      required
                      value={editingArchiveCard ? editingArchiveCard.homeTeam : newArchiveCard.homeTeam || ''}
                      onChange={(e) => {
                        if (editingArchiveCard) {
                          setEditingArchiveCard({ ...editingArchiveCard, homeTeam: e.target.value });
                        } else {
                          setNewArchiveCard({ ...newArchiveCard, homeTeam: e.target.value });
                        }
                      }}
                      className="w-full bg-[#1b0e0e] border border-amber-900/40 rounded-xl p-2 text-white font-bold"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-bold">الأهداف:</span>
                      <input
                        type="number"
                        min="0"
                        value={editingArchiveCard ? editingArchiveCard.homeScore : newArchiveCard.homeScore ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          if (editingArchiveCard) {
                            setEditingArchiveCard({ ...editingArchiveCard, homeScore: val });
                          } else {
                            setNewArchiveCard({ ...newArchiveCard, homeScore: val });
                          }
                        }}
                        className="w-20 bg-[#1b0e0e] border border-amber-900/40 rounded-xl p-2 text-white font-black text-center text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-amber-300 font-bold">الفريق المنافس:</label>
                    <input
                      type="text"
                      required
                      placeholder="اسم الفريق المنافس..."
                      value={editingArchiveCard ? editingArchiveCard.awayTeam : newArchiveCard.awayTeam || ''}
                      onChange={(e) => {
                        if (editingArchiveCard) {
                          setEditingArchiveCard({ ...editingArchiveCard, awayTeam: e.target.value });
                        } else {
                          setNewArchiveCard({ ...newArchiveCard, awayTeam: e.target.value });
                        }
                      }}
                      className="w-full bg-[#1b0e0e] border border-amber-900/40 rounded-xl p-2 text-white font-bold"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-bold">الأهداف:</span>
                      <input
                        type="number"
                        min="0"
                        value={editingArchiveCard ? editingArchiveCard.awayScore : newArchiveCard.awayScore ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          if (editingArchiveCard) {
                            setEditingArchiveCard({ ...editingArchiveCard, awayScore: val });
                          } else {
                            setNewArchiveCard({ ...newArchiveCard, awayScore: val });
                          }
                        }}
                        className="w-20 bg-[#1b0e0e] border border-amber-900/40 rounded-xl p-2 text-white font-black text-center text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Match Details: Stadium, Badge, Referee, Best Player */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">شارة النتيجة:</label>
                    <select
                      value={editingArchiveCard ? editingArchiveCard.badgeType : newArchiveCard.badgeType || 'فوز'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        if (editingArchiveCard) {
                          setEditingArchiveCard({ ...editingArchiveCard, badgeType: val });
                        } else {
                          setNewArchiveCard({ ...newArchiveCard, badgeType: val });
                        }
                      }}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white font-bold"
                    >
                      <option value="فوز">🟢 فوز</option>
                      <option value="تعادل">🟡 تعادل</option>
                      <option value="خسارة">🔴 خسارة</option>
                      <option value="تأهل">🏆 تأهل</option>
                      <option value="تتويج">👑 تتويج بالبطولة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">📍 الملعب:</label>
                    <input
                      type="text"
                      placeholder="ملعب السلام بكثيبة"
                      value={editingArchiveCard ? editingArchiveCard.stadium || '' : newArchiveCard.stadium || ''}
                      onChange={(e) => {
                        if (editingArchiveCard) {
                          setEditingArchiveCard({ ...editingArchiveCard, stadium: e.target.value });
                        } else {
                          setNewArchiveCard({ ...newArchiveCard, stadium: e.target.value });
                        }
                      }}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">⭐ أفضل لاعب:</label>
                    <input
                      type="text"
                      placeholder="مثال: صالح بانصر"
                      value={editingArchiveCard ? editingArchiveCard.topPlayer || '' : newArchiveCard.topPlayer || ''}
                      onChange={(e) => {
                        if (editingArchiveCard) {
                          setEditingArchiveCard({ ...editingArchiveCard, topPlayer: e.target.value });
                        } else {
                          setNewArchiveCard({ ...newArchiveCard, topPlayer: e.target.value });
                        }
                      }}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">🚩 حكم المباراة:</label>
                    <input
                      type="text"
                      placeholder="اسم الحكم..."
                      value={editingArchiveCard ? editingArchiveCard.referee || '' : newArchiveCard.referee || ''}
                      onChange={(e) => {
                        if (editingArchiveCard) {
                          setEditingArchiveCard({ ...editingArchiveCard, referee: e.target.value });
                        } else {
                          setNewArchiveCard({ ...newArchiveCard, referee: e.target.value });
                        }
                      }}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                {/* Summary Report & Coach Notes */}
                <div>
                  <label className="block text-gray-300 font-bold mb-1 text-xs">📝 التقرير الشامل والموجز الفني للمباراة:</label>
                  <textarea
                    rows={4}
                    placeholder="اكتب التقرير الصحفي والفني لمجريات المباراة، التبديلات الحاسمة، ورأي الجهاز الفني..."
                    value={editingArchiveCard ? editingArchiveCard.summaryReport || '' : newArchiveCard.summaryReport || ''}
                    onChange={(e) => {
                      if (editingArchiveCard) {
                        setEditingArchiveCard({ ...editingArchiveCard, summaryReport: e.target.value });
                      } else {
                        setNewArchiveCard({ ...newArchiveCard, summaryReport: e.target.value });
                      }
                    }}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2.5 text-white leading-relaxed text-xs focus:border-yellow-500 focus:outline-none"
                  />
                </div>

                {/* Goals Summary (comma-separated or lines) */}
                <div>
                  <label className="block text-gray-300 font-bold mb-1 text-xs">⚽ مسجلو الأهداف (افصل بين كل هدف بفاصلة):</label>
                  <input
                    type="text"
                    placeholder="مثال: أحمد بانصر (24'), سعيد باطرفي (78')"
                    value={
                      editingArchiveCard
                        ? (editingArchiveCard.goalsSummary || []).join('، ')
                        : (newArchiveCard.goalsSummary || []).join('، ')
                    }
                    onChange={(e) => {
                      const list = e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean);
                      if (editingArchiveCard) {
                        setEditingArchiveCard({ ...editingArchiveCard, goalsSummary: list });
                      } else {
                        setNewArchiveCard({ ...newArchiveCard, goalsSummary: list });
                      }
                    }}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white text-xs"
                  />
                </div>

                {/* Image Picker for Archive Photos */}
                <ImagePicker
                  label="📸 صورة أو غلاف توثيق المباراة في الأرشيف:"
                  value={
                    editingArchiveCard
                      ? (editingArchiveCard.images?.[0] || '')
                      : (newArchiveCard.images?.[0] || '')
                  }
                  onChange={(dataUrl) => {
                    if (editingArchiveCard) {
                      setEditingArchiveCard({ ...editingArchiveCard, images: dataUrl ? [dataUrl] : [] });
                    } else {
                      setNewArchiveCard({ ...newArchiveCard, images: dataUrl ? [dataUrl] : [] });
                    }
                  }}
                />

                <button
                  type="submit"
                  disabled={isSavingArchive}
                  className="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 text-black font-black py-3 rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  {isSavingArchive ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>جاري حفظ بطاقة الأرشيف في Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingArchiveCard ? 'حفظ تعديلات بطاقة الأرشيف' : 'حفظ ونشر بطاقة المباراة في الأرشيف الدائم'}</span>
                    </>
                  )}
                </button>
              </form>

              {/* LIST OF SAVED ARCHIVE CARDS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span>بطاقات وتقارير المباريات المحفوظة في الأرشيف السحابي ({matchArchivesList.length}):</span>
                  </h4>
                </div>

                {matchArchivesList.length === 0 ? (
                  <div className="bg-[#120808] border border-white/5 rounded-2xl p-8 text-center text-gray-500 text-xs">
                    لا توجد بطاقات مؤرشفة حالياً. يمكنك استخدام النموذج بالأعلى أو الضغط على "📋 أرشفة التقرير" من قسم المباريات لإضافة أول بطاقة.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchArchivesList.map((card) => (
                      <div
                        key={card.id}
                        className="bg-[#160c0c] border border-yellow-500/30 hover:border-yellow-500/60 rounded-2xl p-3.5 space-y-2.5 transition shadow-lg flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-yellow-400 font-bold">{card.tournament}</span>
                            <span className="text-gray-400">{card.date}</span>
                          </div>

                          <div className="bg-[#0e0606] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                            <span className="font-extrabold text-white text-xs">{card.homeTeam}</span>
                            <span className="bg-yellow-500/20 text-yellow-300 font-mono font-black text-sm px-2.5 py-0.5 rounded-lg border border-yellow-500/40">
                              {card.homeScore} - {card.awayScore}
                            </span>
                            <span className="font-extrabold text-white text-xs">{card.awayTeam}</span>
                          </div>

                          {card.summaryReport && (
                            <p className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">
                              {card.summaryReport}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            card.badgeType === 'فوز' || card.badgeType === 'تتويج' || card.badgeType === 'تأهل'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : card.badgeType === 'تعادل'
                              ? 'bg-yellow-950 text-yellow-300 border border-yellow-500/40'
                              : 'bg-red-950 text-red-300 border border-red-500/40'
                          }`}>
                            {card.badgeType || 'مباراة منتهية'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingArchiveCard(card);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 rounded-xl text-[10px] font-bold border border-yellow-500/40 flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteArchiveCard(card)}
                              className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/80 rounded-xl border border-red-500/30"
                              title="حذف من الأرشيف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Store Management */}
          {activeTab === 'store' && (
            <div className="space-y-4">
              {/* STORE SETTINGS FORM */}
              <form onSubmit={handleSaveStoreSettings} className="bg-[#201515] p-4 rounded-2xl border border-amber-500/40 space-y-3">
                <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <h3 className="font-extrabold text-amber-400 text-sm">إعدادات المتجر والشريط الإعلاني ورقم التواصل</h3>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">الشريط الإعلاني لمتجر المستلزمات الرياضية:</label>
                  <textarea
                    rows={2}
                    required
                    value={storeAnnounceText}
                    onChange={(e) => setStoreAnnounceText(e.target.value)}
                    placeholder="مثال: 📢 يمكن للجماهير واللاعبين مشاهدة العروض للمستلزمات الرياضية في المحلات بالاسعار الذي تناسبهم"
                    className="w-full bg-[#120a0a] border border-amber-900/50 rounded-xl p-2.5 text-xs text-amber-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">رقم الواتساب لاستقبال طلبات المنتجات والاستفسارات:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={storeWaNumber}
                      onChange={(e) => setStoreWaNumber(e.target.value)}
                      placeholder="967780163037"
                      className="w-full bg-[#120a0a] border border-amber-900/50 rounded-xl p-2 text-xs text-white dir-ltr focus:border-amber-500 focus:outline-none"
                    />
                    <MessageSquare className="w-5 h-5 text-green-400 flex-shrink-0" />
                  </div>
                  <span className="text-[10px] text-gray-400">مثال: 967780163037 (بدون رموز أو زوائد)</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-2.5 rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  حفظ إعدادات المتجر ورقم التواصل
                </button>
              </form>

              {/* ADD NEW PRODUCT FORM */}
              <form onSubmit={handleAddProduct} className="bg-[#201515] p-4 rounded-2xl border border-red-800/40 space-y-3">
                <h3 className="font-extrabold text-amber-400 text-sm flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> إضافة منتج جديد لمتجر المستلزمات الرياضية
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">اسم المنتج:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: قميص السلام بكثيبة الأساسي"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">السعر (ريال يمني):</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 15,000 ريال يمني"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">تصنيف المنتج:</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                  >
                    <option value="أطقم رسمية">أطقم رسمية</option>
                    <option value="إكسسوارات">إكسسوارات</option>
                    <option value="أحذية ومستلزمات">أحذية ومستلزمات</option>
                    <option value="مستلزمات رياضية">مستلزمات رياضية أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">وصف وتفاصيل المنتج:</label>
                  <textarea
                    rows={3}
                    placeholder="اكتب وصف وتفاصيل المنتج هنا..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full bg-[#120a0a] border border-gray-700 rounded-xl p-2 text-white"
                  />
                </div>

                <ImagePicker
                  label="صورة المنتج (اختر صورة من معروضات المحل أو معرض الصور):"
                  value={newProduct.image}
                  onChange={(dataUrl) => setNewProduct({ ...newProduct, image: dataUrl })}
                />

                <button
                  type="submit"
                  disabled={isAddingProduct}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  {isAddingProduct ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>جاري حفظ المنتج بالمتجر...</span>
                    </>
                  ) : (
                    '➕ نشر إضافة المنتج بالمتجر'
                  )}
                </button>
              </form>

              {/* PRODUCTS LIST WITH EDIT AND DELETE */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">قائمة المنتجات المتاحة في المتجر ({storeProducts.length}):</h4>
                {storeProducts.map((p) => (
                  <div key={p.id} className="bg-[#120d0d] p-3 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-amber-500/40 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] bg-red-900/60 text-red-300 font-bold px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>
                        <h5 className="font-extrabold text-white text-xs truncate mt-0.5">{p.name}</h5>
                        <p className="text-amber-400 font-bold text-[11px]">{p.price}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setEditingProduct(p)}
                        className="px-2.5 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-xl text-[10px] font-bold border border-amber-500/40 flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" /> تعديل
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(p)}
                        className="p-1.5 text-red-400 hover:bg-red-950/60 rounded-xl border border-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Gallery, Stories & Warmup Uploads */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="bg-gradient-to-r from-[#2a0e0e] via-[#1a0808] to-[#120505] p-4 rounded-2xl border-2 border-amber-500/40 shadow-xl space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
                    <ImageIcon className="w-5 h-5" />
                  </span>
                  <h3 className="font-black text-amber-400 text-sm sm:text-base">
                    🖼️ قسم نشر الصور والحالات ومعرض الفريق
                  </h3>
                </div>
                <p className="text-xs text-gray-300 pr-8">
                  ارفع صور الإحماء والتغطيات المباشرة وحالات النادي لحفظها بشكل دائم في قاعدة البيانات Firestore وإرسال إشعار فوري لجميع الأجهزة بعنوان: <strong className="text-amber-300 font-bold">إعلامي السلام نقل مباشر</strong>.
                </p>
              </div>

              {/* Upload & Publish Form */}
              <form onSubmit={handlePublishGalleryPost} className="bg-[#201313] p-4 rounded-2xl border-2 border-red-800/60 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <h4 className="font-extrabold text-amber-400 text-xs sm:text-sm flex items-center gap-1.5">
                    <Camera className="w-4 h-4" /> نشر تغطية / حالة / صور إحماء جديدة
                  </h4>
                  <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full">
                    حفظ دائم + إشعار فوري
                  </span>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-gray-300 font-bold text-xs mb-1.5">
                    نوع التغطية أو القسم:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'تغطية', label: '📸 التغطية المباشرة' },
                      { id: 'عام', label: '🌟 كل المعرض (عام)' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setGalleryCategory(cat.id as any)}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center text-center ${
                          galleryCategory === cat.id
                            ? 'bg-amber-500 text-black font-black shadow-md border border-amber-300 scale-102'
                            : 'bg-[#120909] text-gray-300 border border-white/5 hover:bg-[#1a0f0f]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title (Optional / Custom) */}
                <div>
                  <label className="block text-gray-300 font-bold text-xs mb-1">
                    عنوان التغطية (اختياري):
                  </label>
                  <input
                    type="text"
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    placeholder="مثال: صور إحماء الفريق قبل انطلاق شوط المباراة الأول"
                    className="w-full bg-[#120909] border border-amber-900/50 rounded-xl p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none placeholder-gray-500"
                  />
                </div>

                {/* Status / Description */}
                <div>
                  <label className="block text-gray-300 font-bold text-xs mb-1">
                    حقل إدخال نص الحالة أو الوصف (سيصل في الإشعار ويعرض بالمعرض):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={galleryDescription}
                    onChange={(e) => setGalleryDescription(e.target.value)}
                    placeholder="اكتب هنا نص الحالة أو وصف صور الإحماء والتغطية الحصرية للفريق..."
                    className="w-full bg-[#120909] border border-amber-900/50 rounded-xl p-2.5 text-xs text-amber-100 focus:border-amber-500 focus:outline-none placeholder-gray-500 leading-relaxed"
                  />
                </div>

                {/* Image Selection & Upload from Device */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-gray-300 font-bold text-xs">
                      زر اختيار ورفع صور الإحماء والتغطية من الجهاز:
                    </label>
                    <span className="text-[11px] text-amber-400 font-bold">
                      {gallerySelectedImages.length > 0
                        ? `(تم اختيار ${gallerySelectedImages.length} صور)`
                        : '(يمكنك اختيار أكثر من صورة)'}
                    </span>
                  </div>

                  {/* File Upload Zone */}
                  <label className="border-2 border-dashed border-amber-500/50 hover:border-amber-400 bg-[#140a0a] hover:bg-[#1c0e0e] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleGalleryImageUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-black text-amber-400 block">
                        انقر لاختيار ورفع صور الإحماء والتغطية من الأستوديو أو الكاميرا
                      </span>
                      <span className="text-[10px] text-gray-400">
                        يدعم رفع عدة صور معاً بأعلى دقة وضغط ذكي
                      </span>
                    </div>
                  </label>

                  {/* Preview of Selected Images */}
                  {gallerySelectedImages.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-gray-300 px-1 font-bold">
                        <span>معاينة الصور المختارة قبل النشر:</span>
                        <button
                          type="button"
                          onClick={() => setGallerySelectedImages([])}
                          className="text-red-400 hover:text-red-300"
                        >
                          مسح جميع الصور
                        </button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {gallerySelectedImages.map((img, idx) => (
                          <div
                            key={`preview-img-${idx}`}
                            className="relative rounded-xl overflow-hidden aspect-square border-2 border-amber-500/40 bg-black group"
                          >
                            <img
                              src={img}
                              alt={`معاينة ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(idx)}
                              className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition-colors"
                              title="حذف الصورة"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <span className="absolute bottom-1 right-1 bg-black/80 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Instant Push Notification Broadcast Toggle */}
                <div className="bg-[#120808] p-3 rounded-xl border border-amber-500/30 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="galleryPushCheckbox"
                    checked={galleryBroadcastPush}
                    onChange={(e) => setGalleryBroadcastPush(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
                  />
                  <label htmlFor="galleryPushCheckbox" className="cursor-pointer text-xs space-y-0.5">
                    <span className="font-extrabold text-white block">
                      📢 إرسال إشعار فوري لجميع الأجهزة والهواتف عبر OneSignal
                    </span>
                    <span className="text-[11px] text-amber-300/90 block">
                      عنوان الإشعار: <strong>إعلامي السلام نقل مباشر</strong> (يفتح مباشرة على الصورة ومعرض الفريق)
                    </span>
                  </label>
                </div>

                {/* Publish Button */}
                <button
                  type="submit"
                  disabled={isPublishingGallery}
                  className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                >
                  {isPublishingGallery ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      جاري الحفظ في Firestore وبث الإشعار...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      زر النشر والإرسال الفوري وحفظ التغطية
                    </>
                  )}
                </button>
              </form>

              {/* List of Published Gallery Items */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h4 className="font-extrabold text-amber-400 text-xs sm:text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> التغطيات والصور المحفوظة في المعرض الدائم ({galleryPostsList.length}):
                  </h4>
                  <span className="text-[10px] text-gray-400 font-bold">تحديث حي ومباشر</span>
                </div>

                {galleryPostsList.length === 0 ? (
                  <div className="bg-[#150a0a] border border-white/5 rounded-2xl p-6 text-center text-gray-400 text-xs">
                    لا توجد صور منشورة في المعرض حتى الآن. استخدم النموذج أعلاه لنشر أول تغطية مصورة!
                  </div>
                ) : (
                  galleryPostsList.map((post) => {
                    const postImg = post.images?.[0] || post.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400';
                    return (
                      <div
                        key={post.id}
                        className="bg-[#140b0b] p-3 rounded-2xl border border-amber-500/20 hover:border-amber-500/50 transition-all flex items-start justify-between gap-3 shadow-md"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <img
                            src={postImg}
                            alt={post.title || 'صورة المعرض'}
                            className="w-16 h-16 rounded-xl object-cover border border-amber-500/40 flex-shrink-0 bg-black"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] bg-red-900/80 text-amber-200 font-bold px-2 py-0.5 rounded">
                                {post.category || 'تغطية'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold">
                                {post.date || 'اليوم'}
                              </span>
                            </div>
                            <h5 className="font-black text-white text-xs truncate">
                              {post.title || 'تغطية مصورة'}
                            </h5>
                            {post.description && (
                              <p className="text-gray-300 text-[11px] line-clamp-2 leading-relaxed">
                                {post.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-400">
                              <span className="flex items-center gap-1 text-red-400 font-bold">
                                <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                                {post.likesCount || 0} إعجاب
                              </span>
                              <span className="flex items-center gap-1 text-amber-300 font-bold">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                ⭐ {post.averageRating ? post.averageRating.toFixed(1) : '5.0'} ({post.totalRatingsCount || 1})
                              </span>
                              <span>📸 {post.images?.length || 1} صور</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryPost(post)}
                          disabled={deletingGalleryPostId === post.id}
                          className="p-2 text-red-400 hover:bg-red-950/80 rounded-xl border border-red-500/20 transition-all flex-shrink-0"
                          title="حذف نهائي من المعرض وقاعدة البيانات"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT PLAYER MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleUpdatePlayer} className="bg-[#1e1313] border-2 border-amber-500/60 rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-3 text-white dir-rtl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-black text-amber-400 text-sm flex items-center gap-1.5">
                <Edit className="w-4 h-4" /> تعديل بيانات وصورة اللاعب بالكامل
              </h3>
              <button type="button" onClick={() => setEditingPlayer(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-300">اسم اللاعب:</label>
                <input
                  type="text"
                  required
                  value={editingPlayer.name}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">رقم القميص:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  dir="ltr"
                  value={editingPlayer.number ?? ''}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, number: parseStandardNumber(e.target.value, 0) || (e.target.value === '' ? undefined : (editingPlayer.number as any)) })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">المركز:</label>
                <select
                  value={editingPlayer.position}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, position: e.target.value as any })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                >
                  <option value="حارس مرمى">حارس مرمى</option>
                  <option value="مدافع">مدافع</option>
                  <option value="لاعب وسط">لاعب وسط</option>
                  <option value="مهاجم">مهاجم</option>
                  <option value="جهاز فني">جهاز فني</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">المنطقة / العنوان:</label>
                <input
                  type="text"
                  placeholder="مثال: كثيبة - غيل باوزير"
                  value={editingPlayer.location || ''}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, location: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-amber-300">🔑 الرمز السري (PIN Code):</label>
                <input
                  type="text"
                  maxLength={6}
                  value={editingPlayer.pinCode || ''}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, pinCode: e.target.value })}
                  className="w-full bg-[#100a0a] border border-amber-500/60 rounded-xl p-2 text-amber-300 font-bold text-center tracking-widest dir-ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-300">العمر:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  dir="ltr"
                  placeholder="مثال: 22"
                  value={editingPlayer.age ?? ''}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, age: parseStandardNumber(e.target.value, 0) || (e.target.value === '' ? undefined : (editingPlayer.age as any)) })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">الطول:</label>
                <input
                  type="text"
                  placeholder="مثال: 175 سم"
                  value={editingPlayer.height || ''}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, height: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">تاريخ الانضمام:</label>
                <input
                  type="text"
                  placeholder="مثال: 2022"
                  value={editingPlayer.joinedYear || ''}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, joinedYear: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-300">المباريات:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  dir="ltr"
                  value={editingPlayer.matchesPlayed || 0}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, matchesPlayed: parseStandardNumber(e.target.value, 0) })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">الأهداف:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  dir="ltr"
                  value={editingPlayer.goals || 0}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, goals: parseStandardNumber(e.target.value, 0) })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">الصناعة:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  dir="ltr"
                  value={editingPlayer.assists || 0}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, assists: parseStandardNumber(e.target.value, 0) })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-center font-bold"
                />
              </div>
            </div>

            <ImagePicker
              label="صورة اللاعب الشخصية (تغيير من المعرض أو الكاميرا):"
              value={editingPlayer.image}
              onChange={(dataUrl) => setEditingPlayer({ ...editingPlayer, image: dataUrl })}
            />

            <button
              type="submit"
              disabled={isUpdatingPlayer}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-extrabold py-2.5 rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 transition-colors"
            >
              {isUpdatingPlayer ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>جاري حفظ التعديلات في Firebase...</span>
                </>
              ) : (
                '💾 حفظ التعديلات والتعيين فوراً'
              )}
            </button>
          </form>
        </div>
      )}

      {/* EDIT MATCH MODAL */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleUpdateMatch} className="bg-[#1e1313] border-2 border-amber-500/60 rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-3 text-white dir-rtl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-black text-amber-400 text-sm flex items-center gap-1.5">
                <Edit className="w-4 h-4" /> تعديل تفاصيل وشعار وتصنيف المباراة
              </h3>
              <button type="button" onClick={() => setEditingMatch(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-300">اسم بطولتك/فريقك:</label>
                <input
                  type="text"
                  required
                  value={editingMatch.homeTeam}
                  onChange={(e) => setEditingMatch({ ...editingMatch, homeTeam: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">الفريق المنافس:</label>
                <input
                  type="text"
                  required
                  value={editingMatch.awayTeam}
                  onChange={(e) => setEditingMatch({ ...editingMatch, awayTeam: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ImagePicker
                label="🖼️ تغيير شعار فريقك (اختيار من المعرض):"
                value={editingMatch.homeLogo || ''}
                onChange={(dataUrl) => setEditingMatch({ ...editingMatch, homeLogo: dataUrl })}
              />

              <ImagePicker
                label="🖼️ تغيير شعار المنافس (اختيار من المعرض):"
                value={editingMatch.awayLogo || ''}
                onChange={(dataUrl) => setEditingMatch({ ...editingMatch, awayLogo: dataUrl })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-300">أهداف فريقك:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  dir="ltr"
                  value={editingMatch.homeScore ?? 0}
                  onChange={(e) => setEditingMatch({ ...editingMatch, homeScore: parseStandardNumber(e.target.value, 0), isUpcoming: false })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white font-bold text-center"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">أهداف المنافس:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  dir="ltr"
                  value={editingMatch.awayScore ?? 0}
                  onChange={(e) => setEditingMatch({ ...editingMatch, awayScore: parseStandardNumber(e.target.value, 0), isUpcoming: false })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white font-bold text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-300">📅 تاريخ المباراة:</label>
                <input
                  type="date"
                  value={editingMatch.date || ''}
                  onChange={(e) => setEditingMatch({ ...editingMatch, date: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">🕐 الوقت (توقيت المكلا):</label>
                <input
                  type="text"
                  placeholder="مثال: 8:00 مساءً"
                  value={editingMatch.time || ''}
                  onChange={(e) => setEditingMatch({ ...editingMatch, time: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            {/* Auto Calculated Day & Date Preview Badge */}
            <div className="bg-[#100a0a] border border-amber-500/40 rounded-xl p-2.5 text-xs flex items-center justify-between text-amber-300 font-bold">
              <span className="flex items-center gap-1 text-gray-400 font-semibold">
                <Calendar className="w-4 h-4 text-amber-400" />
                اليوم والتاريخ الظاهر تلقائياً:
              </span>
              <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-lg border border-amber-500/50 font-black">
                {formatArabicFullDate(editingMatch.date || '')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-300">حالة المباراة:</label>
                <select
                  value={editingMatch.badgeType || (editingMatch.isUpcoming ? 'قادمة' : 'فوز')}
                  onChange={(e) => setEditingMatch({ ...editingMatch, badgeType: e.target.value as any, isUpcoming: e.target.value === 'قادمة' })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                >
                  <option value="قادمة">قادمة</option>
                  <option value="فوز">فوز السلام ✅</option>
                  <option value="تعادل">تعادل 🤝</option>
                  <option value="خسارة">خسارة ❌</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">الملعب:</label>
                <input
                  type="text"
                  value={editingMatch.stadium}
                  onChange={(e) => setEditingMatch({ ...editingMatch, stadium: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <ImagePicker
              label="تغيير شعار المنافس (اختيار صورة من المعرض):"
              value={editingMatch.awayLogo || ''}
              onChange={(dataUrl) => setEditingMatch({ ...editingMatch, awayLogo: dataUrl })}
            />

            {/* Goal Scorers Section (سجل الأهداف والتوقيت) */}
            <div className="bg-[#120a0a] p-3 rounded-2xl border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5">
                  <span>⚽</span> سجل الأهداف (اسم اللاعب - كم هدف - الدقيقة):
                </h4>
                <span className="text-[10px] text-gray-400">
                  عدد المسجلين: {editingMatch.goalEvents?.length || 0}
                </span>
              </div>

              {/* New Goal Input Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#1a0f0f] p-2.5 rounded-xl border border-white/5">
                {/* Goal Scorer Selection or Text */}
                <div>
                  <label className="block text-gray-300 text-[10px] font-bold mb-1">اسم اللاعب المسجل:</label>
                  <input
                    type="text"
                    list="players-list-options"
                    placeholder="اختر أو اكتب الاسم..."
                    value={goalPlayerName}
                    onChange={(e) => setGoalPlayerName(e.target.value)}
                    className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-xs"
                  />
                  <datalist id="players-list-options">
                    {players.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>

                {/* Goals Count */}
                <div>
                  <label className="block text-gray-300 text-[10px] font-bold mb-1">كم هدف سجل:</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    dir="ltr"
                    value={goalCount}
                    onChange={(e) => setGoalCount(parseStandardNumber(e.target.value, 1))}
                    className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-xs font-bold text-center"
                  />
                </div>

                {/* Minute */}
                <div>
                  <label className="block text-gray-300 text-[10px] font-bold mb-1">في الدقيقة كم:</label>
                  <input
                    type="text"
                    placeholder="مثال: 23 أو 15, 78"
                    value={goalMinute}
                    onChange={(e) => setGoalMinute(e.target.value)}
                    className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white text-xs"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddGoalEventToEditingMatch}
                className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <span>➕</span> إضافة اللاعب والهدف لسجل المباراة
              </button>

              {/* Existing Goals List in match */}
              {editingMatch.goalEvents && editingMatch.goalEvents.length > 0 ? (
                <div className="space-y-1.5 mt-2">
                  <span className="text-[10px] text-gray-400 font-bold block">الأهداف المسجلة حالياً بهذه المباراة:</span>
                  {editingMatch.goalEvents.map((ge) => (
                    <div key={ge.id} className="flex items-center justify-between bg-[#1f1313] p-2 rounded-xl border border-amber-500/30 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-extrabold">⚽ {ge.playerName}</span>
                        <span className="text-[10px] text-gray-300 bg-black/40 px-2 py-0.5 rounded-md border border-white/5 font-bold">
                          {ge.goalsCount > 1 ? `${ge.goalsCount} أهداف` : 'هدف واحد'} {ge.minute ? `• دقيقة: ${ge.minute}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGoalEventFromEditingMatch(ge.id)}
                        className="text-red-400 hover:text-red-300 p-1 bg-red-950/50 hover:bg-red-900 rounded-lg border border-red-500/30"
                        title="حذف الهدف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-500 text-center py-1">لم يتم إدخال أهداف لهذه المباراة بعد</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isUpdatingMatch}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-extrabold py-2.5 rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              {isUpdatingMatch ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>جاري حفظ التغييرات...</span>
                </>
              ) : (
                <>
                  <span>💾 حفظ تغييرات المباراة وسجل الأهداف</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* EDIT NEWS MODAL */}
      {editingNews && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleUpdateNews} className="bg-[#1e1313] border-2 border-amber-500/60 rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-3 text-white dir-rtl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-black text-amber-400 text-sm flex items-center gap-1.5">
                <Edit className="w-4 h-4" /> تعديل الخبر والصورة
              </h3>
              <button type="button" onClick={() => setEditingNews(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div>
                <label className="block font-bold mb-1 text-gray-300">عنوان الخبر:</label>
                <input
                  type="text"
                  required
                  value={editingNews.title}
                  onChange={(e) => setEditingNews({ ...editingNews, title: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">التفاصيل:</label>
                <textarea
                  rows={3}
                  required
                  value={editingNews.content}
                  onChange={(e) => setEditingNews({ ...editingNews, content: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <ImagePicker
              label="تغيير صورة الخبر من المعرض:"
              value={editingNews.image}
              onChange={(dataUrl) => setEditingNews({ ...editingNews, image: dataUrl })}
            />

            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-2.5 rounded-xl text-xs shadow-lg">
              💾 حفظ التغييرات والخبر
            </button>
          </form>
        </div>
      )}

      {/* EDIT STORE PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleUpdateProduct} className="bg-[#1e1313] border-2 border-amber-500/60 rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-3 text-white dir-rtl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-black text-amber-400 text-sm flex items-center gap-1.5">
                <Edit className="w-4 h-4" /> تعديل بيانات وصورة المنتج بالمتجر
              </h3>
              <button type="button" onClick={() => setEditingProduct(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-300">اسم المنتج:</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1 text-gray-300">السعر:</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-gray-300">التصنيف:</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                  >
                    <option value="أطقم رسمية">أطقم رسمية</option>
                    <option value="إكسسوارات">إكسسوارات</option>
                    <option value="أحذية ومستلزمات">أحذية ومستلزمات</option>
                    <option value="مستلزمات رياضية">مستلزمات رياضية أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-300">وصف وتفاصيل المنتج:</label>
                <textarea
                  rows={3}
                  placeholder="اكتب وصف وتفاصيل المنتج هنا..."
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-[#100a0a] border border-gray-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <ImagePicker
              label="تغيير صورة المنتج (اختر من المعرض أو الكاميرا):"
              value={editingProduct.image}
              onChange={(dataUrl) => setEditingProduct({ ...editingProduct, image: dataUrl })}
            />

            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-2.5 rounded-xl text-xs shadow-lg">
              💾 حفظ تغييرات المنتج
            </button>
          </form>
        </div>
      )}

      {/* LIVE MATCH BROADCAST CONTROL ROOM MODAL */}
      {liveMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#180a0a] border-2 border-red-600 rounded-3xl w-full max-w-3xl p-4 sm:p-6 shadow-2xl space-y-4 text-white dir-rtl max-h-[92vh] overflow-y-auto relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-red-900/50 pb-3">
              <div>
                <span className="text-[10px] font-black bg-red-600 text-white px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-ping" /> غرفة إدارة وتغطية أحداث المباراة المباشرة
                </span>
                <h3 className="font-black text-amber-400 text-base mt-1">
                  {liveMatchModal.homeTeam} VS {liveMatchModal.awayTeam}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setLiveMatchModal(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-2xl text-gray-300 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QUICK MATCH STATUS & PERIOD SWITCHER */}
            <div className="bg-[#241010] p-3 rounded-2xl border border-red-800/40 space-y-2">
              <span className="text-xs font-black text-amber-300 block">
                ⚡ التحكم في حالة الشوط وبدء/إنهاء المباراة فوراً:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateLivePeriod(liveMatchModal, 'الشوط الأول', 'start')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 px-2 rounded-xl shadow flex items-center justify-center gap-1"
                >
                  <span>🟢</span> بدء الشوط 1
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateLivePeriod(liveMatchModal, 'استراحة الشوطين', 'whistle')}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs py-2 px-2 rounded-xl shadow flex items-center justify-center gap-1"
                >
                  <span>⏸️</span> استراحة الشوطين
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateLivePeriod(liveMatchModal, 'الشوط الثاني', 'start')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 px-2 rounded-xl shadow flex items-center justify-center gap-1"
                >
                  <span>🟢</span> بدء الشوط 2
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateLivePeriod(liveMatchModal, 'انتهت المباراة', 'whistle')}
                  className="bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs py-2 px-2 rounded-xl shadow flex items-center justify-center gap-1"
                >
                  <span>🏁</span> إنهاء المباراة
                </button>
              </div>
            </div>

            {/* LIVE SCORE & MINUTE CONTROL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#120606] p-3 rounded-2xl border border-amber-500/30">
              {/* Home Score Adjustment */}
              <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5">
                <span className="text-xs font-bold text-gray-300">{liveMatchModal.homeTeam}:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateLiveScore(-1, 0)}
                    className="w-7 h-7 bg-red-900/80 hover:bg-red-800 rounded-lg text-white font-black text-sm"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-amber-400 w-6 text-center">{liveMatchModal.homeScore ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateLiveScore(1, 0)}
                    className="w-7 h-7 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-black text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Live Minute Input */}
              <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5">
                <span className="text-xs font-bold text-amber-400">الدقيقة الحالية:</span>
                <input
                  type="text"
                  value={liveEventMinute}
                  onChange={(e) => setLiveEventMinute(e.target.value)}
                  placeholder="مثلاً 25'"
                  className="w-20 bg-[#221212] border border-amber-500/50 rounded-lg p-1 text-center font-bold text-amber-300 text-xs"
                />
              </div>

              {/* Away Score Adjustment */}
              <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/5">
                <span className="text-xs font-bold text-gray-300">{liveMatchModal.awayTeam}:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateLiveScore(0, -1)}
                    className="w-7 h-7 bg-red-900/80 hover:bg-red-800 rounded-lg text-white font-black text-sm"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-amber-400 w-6 text-center">{liveMatchModal.awayScore ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateLiveScore(0, 1)}
                    className="w-7 h-7 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-black text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* DISPATCH NEW LIVE EVENT FORM */}
            <form onSubmit={handleAddLiveEvent} className="bg-[#221010] p-4 rounded-2xl border border-red-800/60 space-y-3">
              <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5">
                <span>📣</span> إرسال ونشر حدث مباشر للجماهير:
              </h4>

              {/* Event Type Selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLiveEventType('goal')}
                  className={`py-2 rounded-xl border transition-all ${
                    liveEventType === 'goal'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-black'
                      : 'bg-black/40 text-gray-300 border-white/10'
                  }`}
                >
                  ⚽ هدف
                </button>

                <button
                  type="button"
                  onClick={() => setLiveEventType('yellow_card')}
                  className={`py-2 rounded-xl border transition-all ${
                    liveEventType === 'yellow_card'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-md font-black'
                      : 'bg-black/40 text-gray-300 border-white/10'
                  }`}
                >
                  🟨 كرت أصفر
                </button>

                <button
                  type="button"
                  onClick={() => setLiveEventType('red_card')}
                  className={`py-2 rounded-xl border transition-all ${
                    liveEventType === 'red_card'
                      ? 'bg-red-700 text-white border-red-500 shadow-md font-black'
                      : 'bg-black/40 text-gray-300 border-white/10'
                  }`}
                >
                  🟥 كرت أحمر
                </button>

                <button
                  type="button"
                  onClick={() => setLiveEventType('sub')}
                  className={`py-2 rounded-xl border transition-all ${
                    liveEventType === 'sub'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md font-black'
                      : 'bg-black/40 text-gray-300 border-white/10'
                  }`}
                >
                  🔄 تبديل
                </button>

                <button
                  type="button"
                  onClick={() => setLiveEventType('comment')}
                  className={`py-2 rounded-xl border transition-all ${
                    liveEventType === 'comment'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md font-black'
                      : 'bg-black/40 text-gray-300 border-white/10'
                  }`}
                >
                  📢 تعليق مباشر
                </button>
              </div>

              {/* Team Selector & Player Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">الفريق المعني بالحدث:</label>
                  <select
                    value={liveEventTeam}
                    onChange={(e) => setLiveEventTeam(e.target.value as any)}
                    className="w-full bg-[#120707] border border-gray-700 rounded-xl p-2 text-white font-bold"
                  >
                    <option value="home">{liveMatchModal.homeTeam} (صقور الريف)</option>
                    <option value="away">{liveMatchModal.awayTeam}</option>
                  </select>
                </div>

                {liveEventType !== 'sub' ? (
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">اسم اللاعب:</label>
                    <input
                      type="text"
                      placeholder="أدخل اسم اللاعب هنا"
                      value={liveEventPlayer}
                      onChange={(e) => setLiveEventPlayer(e.target.value)}
                      className="w-full bg-[#120707] border border-gray-700 rounded-xl p-2 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="block text-gray-300 font-bold mb-1 text-[10px]">خروج اللاعب:</label>
                      <input
                        type="text"
                        placeholder="اللاعب المغادر"
                        value={liveEventPlayerOut}
                        onChange={(e) => setLiveEventPlayerOut(e.target.value)}
                        className="w-full bg-[#120707] border border-gray-700 rounded-xl p-1.5 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-amber-300 font-bold mb-1 text-[10px]">دخول البديل:</label>
                      <input
                        type="text"
                        placeholder="اللاعب البديل"
                        value={liveEventPlayerIn}
                        onChange={(e) => setLiveEventPlayerIn(e.target.value)}
                        className="w-full bg-[#120707] border border-gray-700 rounded-xl p-1.5 text-white font-bold text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Event Description Text */}
              <div>
                <label className="block text-gray-300 font-bold mb-1 text-xs">تفاصيل الحدث / التعليق المباشر:</label>
                <input
                  type="text"
                  placeholder="وصف تفصيلي للحدث..."
                  value={liveEventDetail}
                  onChange={(e) => setLiveEventDetail(e.target.value)}
                  className="w-full bg-[#120707] border border-gray-700 rounded-xl p-2 text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black py-2.5 rounded-xl shadow-lg text-xs flex items-center justify-center gap-1"
              >
                <span>🚀</span> نشر وإرسال الحدث المباشر فوراً
              </button>
            </form>

            {/* EDITABLE LINEUP SECTION */}
            <div className="bg-[#1a0c0c] p-4 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <h4 className="font-extrabold text-amber-400 text-xs flex items-center gap-1">
                  <span>📋</span> تشكيلة الفريقين والبدلاء الرسمية
                </h4>
                <button
                  type="button"
                  onClick={handleSaveLineup}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow"
                >
                  💾 حفظ التشكيلة
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Home Lineup Editor */}
                <div className="space-y-2">
                  <span className="font-bold text-amber-300 block">تشكيلة {liveMatchModal.homeTeam} (كل لاعب في سطر):</span>
                  <label className="text-[10px] text-gray-400 block">الأساسيون (11 لاعب):</label>
                  <textarea
                    rows={4}
                    value={liveHomeStartingText}
                    onChange={(e) => setLiveHomeStartingText(e.target.value)}
                    className="w-full bg-[#100606] border border-gray-700 rounded-xl p-2 text-white font-mono text-[11px]"
                  />
                  <label className="text-[10px] text-gray-400 block">البدلاء:</label>
                  <textarea
                    rows={2}
                    value={liveHomeSubsText}
                    onChange={(e) => setLiveHomeSubsText(e.target.value)}
                    className="w-full bg-[#100606] border border-gray-700 rounded-xl p-2 text-white font-mono text-[11px]"
                  />
                </div>

                {/* Away Lineup Editor */}
                <div className="space-y-2">
                  <span className="font-bold text-amber-300 block">تشكيلة {liveMatchModal.awayTeam} (كل لاعب في سطر):</span>
                  <label className="text-[10px] text-gray-400 block">الأساسيون (11 لاعب):</label>
                  <textarea
                    rows={4}
                    value={liveAwayStartingText}
                    onChange={(e) => setLiveAwayStartingText(e.target.value)}
                    className="w-full bg-[#100606] border border-gray-700 rounded-xl p-2 text-white font-mono text-[11px]"
                  />
                  <label className="text-[10px] text-gray-400 block">البدلاء:</label>
                  <textarea
                    rows={2}
                    value={liveAwaySubsText}
                    onChange={(e) => setLiveAwaySubsText(e.target.value)}
                    className="w-full bg-[#100606] border border-gray-700 rounded-xl p-2 text-white font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* LIVE EVENTS RECORDED LIST */}
            <div className="bg-[#120707] p-3.5 rounded-2xl border border-white/10 space-y-2">
              <h4 className="font-extrabold text-amber-400 text-xs">
                سجل الأحداث المنشورة للمباراة ({liveMatchModal.liveEvents?.length || 0}):
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(liveMatchModal.liveEvents || []).map((ev) => (
                  <div key={ev.id} className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-amber-300">{ev.title} ({ev.minute})</span>
                      <p className="text-[10px] text-gray-300">{ev.detail}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteLiveEvent(ev.id)}
                      className="p-1.5 text-red-400 hover:bg-red-950/60 rounded-lg flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification */}
      {adminNotification && (
        <div className="fixed bottom-6 right-6 bg-emerald-900/90 text-emerald-100 border border-emerald-500/50 px-5 py-3 rounded-2xl shadow-2xl z-[110] flex items-center gap-3 text-xs font-bold animate-bounce">
          <span>✨</span>
          <span>{adminNotification}</span>
          <button onClick={() => setAdminNotification(null)} className="text-emerald-300 hover:text-white mr-2">
            ✕
          </button>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Bypasses sandboxed iframe window.confirm limits) */}
      {deleteConfirmState?.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#181111] border border-red-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl text-right animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-red-400 font-extrabold text-base flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" /> {deleteConfirmState.title}
              </h3>
              <button
                onClick={() => setDeleteConfirmState(null)}
                disabled={isDeletingLoading}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteConfirmState.itemName && (
              <div className="flex items-center gap-3 bg-red-950/40 p-3.5 rounded-2xl border border-red-500/30">
                {deleteConfirmState.itemImage && (
                  <img
                    src={deleteConfirmState.itemImage}
                    className="w-12 h-12 rounded-xl object-cover border border-amber-500/40 shadow-md"
                    alt=""
                  />
                )}
                <div>
                  <h4 className="text-white font-bold text-sm">{deleteConfirmState.itemName}</h4>
                </div>
              </div>
            )}

            <p className="text-gray-300 text-xs leading-relaxed">
              {deleteConfirmState.message}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={isDeletingLoading}
                onClick={handleExecuteConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {isDeletingLoading ? (
                  <span className="animate-spin text-white">⌛</span>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isDeletingLoading ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
              </button>

              <button
                disabled={isDeletingLoading}
                onClick={() => setDeleteConfirmState(null)}
                className="px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-2.5 rounded-xl transition-colors text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
