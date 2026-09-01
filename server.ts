import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initialClubInfo, initialClubStats, initialMatches, initialNews, initialNotifications, initialPlayers, initialTrainingSessions, initialStoreProducts, initialStoreSettings } from './src/data/initialData';
import { Match, NewsItem, Player, TrainingSession, AttendanceResponse, AppNotification, ClubInfo, ClubStats, StoreProduct, StoreSettings, MatchLiveEvent, GalleryPost, MatchArchiveCard } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // In-memory data store with default pre-populated data
  let clubInfoStore: ClubInfo = { ...initialClubInfo };
  let newsStore: NewsItem[] = [...initialNews];
  let matchesStore: Match[] = [...initialMatches];
  let playersStore: Player[] = [...initialPlayers];
  let trainingStore: TrainingSession[] = [...initialTrainingSessions];
  let attendanceStore: AttendanceResponse[] = [];
  let notificationStore: AppNotification[] = [...initialNotifications];
  let storeProductsStore: StoreProduct[] = [...initialStoreProducts];
  let storeSettingsStore: StoreSettings = { ...initialStoreSettings };
  let galleryPostsStore: GalleryPost[] = [];
  let matchArchiveStore: MatchArchiveCard[] = [];

  let customStatsStore: ClubStats = { ...initialClubStats };

  // API ROUTES
  
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', club: 'فريق السلام الرياضي بكثيبة' });
  });

  // Admin Auth
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === '1991' || password === 'salam1991' || password === 'salam2026' || password === 'admin') {
      res.json({ success: true, token: 'admin-salam-token-1991' });
    } else {
      res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
    }
  });

  // Player Verification PIN Auth
  app.post('/api/player/verify-pin', (req, res) => {
    const { pinCode } = req.body;
    if (!pinCode || typeof pinCode !== 'string' || !pinCode.trim()) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال الرمز السري' });
    }

    const cleanPin = pinCode.trim();
    // Search in players store for genuine matching pinCode
    const matchedPlayer = playersStore.find(p => p.pinCode && String(p.pinCode).trim() === cleanPin);

    if (matchedPlayer) {
      res.json({
        success: true,
        user: {
          id: matchedPlayer.id,
          name: matchedPlayer.name,
          number: matchedPlayer.number,
          position: matchedPlayer.position,
          role: 'player',
          pinCode: cleanPin
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'الرمز السري غير صحيح أو غير مسجل!'
      });
    }
  });

  // Stats & Info
  app.get('/api/stats', (req, res) => {
    res.json({
      playersCount: customStatsStore.playersCount ?? playersStore.length,
      matchesCount: customStatsStore.matchesCount ?? matchesStore.length,
      winsCount: customStatsStore.winsCount ?? matchesStore.filter(m => m.badgeType === 'فوز').length,
      achievementsCount: customStatsStore.achievementsCount ?? 0,
    });
  });

  app.put('/api/stats', (req, res) => {
    customStatsStore = { ...customStatsStore, ...req.body };
    res.json(customStatsStore);
  });

  app.get('/api/club-info', (req, res) => {
    res.json(clubInfoStore);
  });

  app.put('/api/club-info', (req, res) => {
    clubInfoStore = { ...clubInfoStore, ...req.body };
    res.json(clubInfoStore);
  });

  // News CRUD
  app.get('/api/news', (req, res) => {
    res.json(newsStore);
  });

  app.post('/api/news', (req, res) => {
    const id = req.body.id || `n-${Date.now()}`;
    const newItem: NewsItem = {
      id,
      title: req.body.title,
      content: req.body.content,
      category: req.body.category || 'أخبار',
      date: req.body.date || new Date().toISOString().split('T')[0],
      image: req.body.image || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      views: 1,
    };
    const existingIdx = newsStore.findIndex(n => n.id === id);
    if (existingIdx !== -1) {
      newsStore[existingIdx] = newItem;
    } else {
      newsStore.unshift(newItem);
    }
    res.status(201).json(newItem);
  });

  app.put('/api/news/:id', (req, res) => {
    const idx = newsStore.findIndex(n => n.id === req.params.id);
    if (idx !== -1) {
      newsStore[idx] = { ...newsStore[idx], ...req.body };
      res.json(newsStore[idx]);
    } else {
      res.status(404).json({ error: 'News not found' });
    }
  });

  app.delete('/api/news/:id', (req, res) => {
    newsStore = newsStore.filter(n => n.id !== req.params.id);
    res.json({ success: true });
  });

  app.post('/api/news/:id/like', (req, res) => {
    const { userId, likesCount, likedUserIds } = req.body;
    const item = newsStore.find(n => n.id === req.params.id);
    if (item) {
      item.likesCount = likesCount;
      item.likedUserIds = likedUserIds;
      res.json({ success: true, item });
    } else {
      res.status(404).json({ error: 'News item not found' });
    }
  });

  app.post('/api/news/:id/rate', (req, res) => {
    const { userId, rating, ratings, totalRatingsCount, averageRating } = req.body;
    const item = newsStore.find(n => n.id === req.params.id);
    if (item) {
      item.ratings = ratings;
      item.totalRatingsCount = totalRatingsCount;
      item.averageRating = averageRating;
      res.json({ success: true, item });
    } else {
      res.status(404).json({ error: 'News item not found' });
    }
  });

  // Matches CRUD & Live Coverage System
  let sseClients: any[] = [];

  function broadcastMatchUpdate(match: Match) {
    const data = JSON.stringify({ type: 'match_update', match });
    sseClients.forEach((client) => {
      try {
        client.write(`data: ${data}\n\n`);
      } catch {
        // client closed
      }
    });
  }

  // Live Match Server-Sent Events (SSE) Stream
  app.get('/api/matches/live-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter((client) => client !== res);
    });
  });

  app.get('/api/matches', (req, res) => {
    res.json(matchesStore);
  });

  app.post('/api/matches', (req, res) => {
    const id = req.body.id || `m-${Date.now()}`;
    const newMatchItem: Match = {
      id,
      tournament: req.body.tournament,
      homeTeam: req.body.homeTeam || 'فريق السلام بكثيبة',
      homeLogo: req.body.homeLogo || clubInfoStore.logoUrl || '/logo-salam.png',
      awayTeam: req.body.awayTeam,
      awayLogo: req.body.awayLogo || '',
      isUpcoming: req.body.isUpcoming ?? true,
      date: req.body.date,
      time: req.body.time || '8:00 مساءً',
      stadium: req.body.stadium || 'ملعب غيل باوزير',
      badgeType: req.body.badgeType || 'قادمة',
      hasLiveBroadcast: req.body.hasLiveBroadcast ?? true,
      isLive: req.body.isLive ?? false,
      liveEvents: req.body.liveEvents || [],
      goalsSummary: req.body.goalsSummary || [],
      homeScore: req.body.homeScore ?? 0,
      awayScore: req.body.awayScore ?? 0,
    };
    const existingIdx = matchesStore.findIndex(m => m.id === id);
    if (existingIdx !== -1) {
      matchesStore[existingIdx] = newMatchItem;
    } else {
      matchesStore.unshift(newMatchItem);
    }
    broadcastMatchUpdate(newMatchItem);
    res.status(201).json(newMatchItem);
  });

  app.put('/api/matches/:id', (req, res) => {
    const idx = matchesStore.findIndex((m) => m.id === req.params.id);
    if (idx !== -1) {
      matchesStore[idx] = { ...matchesStore[idx], ...req.body };
      broadcastMatchUpdate(matchesStore[idx]);
      res.json(matchesStore[idx]);
    } else {
      res.status(404).json({ error: 'Match not found' });
    }
  });

  app.delete('/api/matches/:id', (req, res) => {
    matchesStore = matchesStore.filter((m) => m.id !== req.params.id);
    res.json({ success: true });
  });

  // Post new live event for a match
  app.post('/api/matches/:id/events', (req, res) => {
    const match = matchesStore.find((m) => m.id === req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const { type, minute, period, team, playerName, playerOut, playerIn, detail, imageUrl, title, sendPushNotification } = req.body;

    let defaultTitle = 'حدث مباشر';
    if (type === 'goal') defaultTitle = `⚽ هدف لصالح ${team === 'home' ? match.homeTeam : match.awayTeam}`;
    else if (type === 'yellow_card') defaultTitle = `🟨 بطاقة صفراء (${playerName || ''})`;
    else if (type === 'red_card') defaultTitle = `🟥 بطاقة حمراء (${playerName || ''})`;
    else if (type === 'sub') defaultTitle = `🔄 تبديل (${playerName || playerIn || ''})`;
    else if (type === 'pause') defaultTitle = `⏸️ توقف المباراة`;
    else if (type === 'resume') defaultTitle = `▶️ استئناف اللعب`;
    else if (type === 'period_start') defaultTitle = `🏁 بداية ${period || match.livePeriod || 'الشوط'}`;
    else if (type === 'period_end') defaultTitle = `🏁 نهاية ${period || match.livePeriod || 'الشوط'}`;
    else if (type === 'comment') defaultTitle = `🔴 نقل مباشر للمباراة`;

    const newEvent: MatchLiveEvent = {
      id: `ev-${Date.now()}`,
      type: type || 'comment',
      minute: minute || "1'",
      period: period || match.livePeriod || 'مباشر',
      title: title || defaultTitle,
      detail: detail || '',
      team: team || 'home',
      playerName: playerName || '',
      playerOut: playerOut || '',
      playerIn: playerIn || '',
      imageUrl: imageUrl || '',
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
    };

    if (!match.liveEvents) match.liveEvents = [];
    match.liveEvents.unshift(newEvent);

    // Auto-update score if goal event
    if (type === 'goal') {
      if (team === 'home') {
        match.homeScore = (match.homeScore || 0) + 1;
      } else if (team === 'away') {
        match.awayScore = (match.awayScore || 0) + 1;
      }

      if (playerName) {
        if (!match.goalEvents) match.goalEvents = [];
        match.goalEvents.push({
          id: `ge-${Date.now()}`,
          playerName,
          goalsCount: 1,
          minute: minute || "1'",
          team: team || 'home',
        });
      }
    }

    // Check Push Notification Option Flag:
    // If sendPushNotification is true, broadcast push notification to subscribed devices/fans
    if (sendPushNotification !== false) {
      const notifTitle = type === 'goal' 
        ? `⚽ جووووول! ${match.homeTeam} (${match.homeScore}) - (${match.awayScore}) ${match.awayTeam}`
        : (type === 'comment'
          ? `🔴 نقل مباشر للمباراة | ${match.homeTeam} VS ${match.awayTeam}`
          : defaultTitle);
      
      const notifBody = detail 
        ? detail 
        : `الدقيقة ${minute || "1'"} — ${playerName ? `اللاعب: ${playerName}` : 'متابعة حية لمجريات المباراة'}`;

      // Save to application notifications store
      notificationStore.unshift({
        id: `notif-${Date.now()}`,
        title: notifTitle,
        message: notifBody,
        type: 'match',
        date: 'الآن',
        read: false,
      });

      console.log(`[FCM / Push Notification Sent to Subscribed Fans] Title: "${notifTitle}", Body: "${notifBody}"`);
      
      // 📲 Trigger OneSignal push notification to mobile app & browsers
      sendOneSignalNotification({
        title: notifTitle,
        message: notifBody,
        data: { type: 'match_event', matchId: match.id, eventType: type },
      }).catch((err) => console.warn('OneSignal match push error:', err));
    }

    if (minute) match.liveMinute = minute;
    if (period) match.livePeriod = period;
    match.isLive = true;

    broadcastMatchUpdate(match);
    res.status(201).json({ match, event: newEvent });
  });

  // Edit match live event
  app.put('/api/matches/:id/events/:eventId', (req, res) => {
    const match = matchesStore.find((m) => m.id === req.params.id);
    if (!match || !match.liveEvents) return res.status(404).json({ error: 'Match or event not found' });

    const idx = match.liveEvents.findIndex((e) => e.id === req.params.eventId);
    if (idx === -1) return res.status(404).json({ error: 'Event not found' });

    match.liveEvents[idx] = { ...match.liveEvents[idx], ...req.body };
    broadcastMatchUpdate(match);
    res.json({ match, event: match.liveEvents[idx] });
  });

  // Delete match live event
  app.delete('/api/matches/:id/events/:eventId', (req, res) => {
    const match = matchesStore.find((m) => m.id === req.params.id);
    if (!match || !match.liveEvents) return res.status(404).json({ error: 'Match or event not found' });

    const targetEvent = match.liveEvents.find((e) => e.id === req.params.eventId);
    if (targetEvent && targetEvent.type === 'goal') {
      if (targetEvent.team === 'home' && (match.homeScore || 0) > 0) {
        match.homeScore = (match.homeScore || 1) - 1;
      } else if (targetEvent.team === 'away' && (match.awayScore || 0) > 0) {
        match.awayScore = (match.awayScore || 1) - 1;
      }
    }

    match.liveEvents = match.liveEvents.filter((e) => e.id !== req.params.eventId);
    broadcastMatchUpdate(match);
    res.json({ match, success: true });
  });

  // Control match live state
  app.post('/api/matches/:id/live-control', (req, res) => {
    const match = matchesStore.find((m) => m.id === req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const { isLive, liveStatus, livePeriod, liveMinute, homeScore, awayScore, action } = req.body;

    const wasNotLive = !match.isLive || match.liveStatus === 'لم تبدأ';

    if (isLive !== undefined) match.isLive = isLive;
    if (liveStatus !== undefined) match.liveStatus = liveStatus;
    if (livePeriod !== undefined) match.livePeriod = livePeriod;
    if (liveMinute !== undefined) match.liveMinute = liveMinute;
    if (homeScore !== undefined) match.homeScore = Number(homeScore);
    if (awayScore !== undefined) match.awayScore = Number(awayScore);

    if (!match.liveEvents) match.liveEvents = [];

    // If explicit action is update_score
    if (action === 'update_score') {
      const scoreEvent: MatchLiveEvent = {
        id: `ev-${Date.now()}`,
        type: 'comment',
        title: '📊 تحديث نتيجة المباراة',
        detail: `تعديل النتيجة المباشرة: ${match.homeTeam} (${match.homeScore || 0}) — (${match.awayScore || 0}) ${match.awayTeam}`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        minute: match.liveMinute || "1'",
        period: match.livePeriod || 'الشوط الأول',
      };
      match.liveEvents.unshift(scoreEvent);

      if (req.body.sendPushNotification !== false) {
        const notifTitle = `📊 تحديث النتيجة المباشرة للمباراة`;
        const notifBody = `⚽ ${match.homeTeam} (${match.homeScore || 0}) — (${match.awayScore || 0}) ${match.awayTeam}\n⏱️ ${match.livePeriod || 'المباراة'} | الدقيقة: ${match.liveMinute || "0'"}`;

        notificationStore.unshift({
          id: `notif-${Date.now()}`,
          title: notifTitle,
          message: notifBody,
          type: 'match',
          date: 'الآن',
          read: false,
        });

        console.log(`[Push Notification Sent] Title: "${notifTitle}", Body: "${notifBody}"`);
        sendOneSignalNotification({
          title: notifTitle,
          message: notifBody,
          data: { type: 'match_score_update', matchId: match.id },
        }).catch((err) => console.warn('OneSignal score update error:', err));
      }
    } else if (action === 'update_time') {
      const timeEvent: MatchLiveEvent = {
        id: `ev-${Date.now()}`,
        type: 'comment',
        title: '⏱️ تحديث وقت والشوط المباشر',
        detail: `تعديل حالة المباراة الزمانية إلى: (${match.livePeriod}) | الدقيقة: (${match.liveMinute})`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        minute: match.liveMinute || "1'",
        period: match.livePeriod || 'الشوط الأول',
      };
      match.liveEvents.unshift(timeEvent);

      if (req.body.sendPushNotification) {
        const notifTitle = `⏱️ تحديث توقيت وشوط المباراة`;
        const notifBody = `⚽ ${match.homeTeam} (${match.homeScore || 0}) — (${match.awayScore || 0}) ${match.awayTeam}\n⏱️ ${match.livePeriod} | الدقيقة: ${match.liveMinute}`;

        notificationStore.unshift({
          id: `notif-${Date.now()}`,
          title: notifTitle,
          message: notifBody,
          type: 'match',
          date: 'الآن',
          read: false,
        });
      }
    }
    // If starting the match for the first time
    else if (action === 'start_first_half' || (wasNotLive && match.isLive && (match.livePeriod === 'الشوط الأول' || !match.livePeriod))) {
      match.liveMinute = "1'";
      match.livePeriod = 'الشوط الأول';
      match.isLive = true;
      match.liveStatus = 'مباشر الآن';

      const startEvent: MatchLiveEvent = {
        id: `ev-${Date.now()}`,
        type: 'comment',
        title: '🏁 انطلاق المباراة',
        detail: `صافرة البداية! انطلاق مباراة ${match.homeTeam} ضد ${match.awayTeam} — النتيجة (${match.homeScore || 0} - ${match.awayScore || 0})`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        minute: "1'",
        period: 'الشوط الأول',
      };
      
      // Avoid duplicate start events
      if (!match.liveEvents.some((e) => e.title === '🏁 انطلاق المباراة')) {
        match.liveEvents.unshift(startEvent);
      }

      // Generate Push Notification for match start
      const notifTitle = `🏁 انطلاق التغطية المباشرة للمباراة الآن!`;
      const notifBody = `⚽ ${match.homeTeam} (${match.homeScore || 0}) — (${match.awayScore || 0}) ${match.awayTeam}\n⏱️ الشوط الأول | الدقيقة: 1'`;

      notificationStore.unshift({
        id: `notif-${Date.now()}`,
        title: notifTitle,
        message: notifBody,
        type: 'match',
        date: 'الآن',
        read: false,
      });

      console.log(`[Push Notification Sent] Title: "${notifTitle}", Body: "${notifBody}"`);
      sendOneSignalNotification({
        title: notifTitle,
        message: notifBody,
        data: { type: 'match_start', matchId: match.id },
      }).catch((err) => console.warn('OneSignal match start error:', err));
    } else if (action === 'start_second_half') {
      match.liveMinute = "46'";
      match.livePeriod = 'الشوط الثاني';
      match.isLive = true;
      match.liveStatus = 'مباشر الآن';

      const startSecondHalfEvent: MatchLiveEvent = {
        id: `ev-${Date.now()}`,
        type: 'comment',
        title: '🏁 انطلاق الشوط الثاني',
        detail: `انطلاق الشوط الثاني بين ${match.homeTeam} و ${match.awayTeam} — النتيجة (${match.homeScore || 0} - ${match.awayScore || 0})`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        minute: "46'",
        period: 'الشوط الثاني',
      };
      match.liveEvents.unshift(startSecondHalfEvent);

      const notifTitle = `🏁 انطلاق الشوط الثاني!`;
      const notifBody = `⚽ ${match.homeTeam} (${match.homeScore || 0}) — (${match.awayScore || 0}) ${match.awayTeam}\n⏱️ الشوط الثاني | الدقيقة: 46'`;

      notificationStore.unshift({
        id: `notif-${Date.now()}`,
        title: notifTitle,
        message: notifBody,
        type: 'match',
        date: 'الآن',
        read: false,
      });
    } else if (action === 'end_match' || liveStatus === 'انتهت' || livePeriod === 'انتهت المباراة') {
      match.isLive = false;
      match.isUpcoming = false;
      match.liveStatus = 'انتهت';
      match.livePeriod = 'انتهت المباراة';
      const hs = match.homeScore || 0;
      const as = match.awayScore || 0;
      if (hs > as) match.badgeType = 'فوز';
      else if (hs === as) match.badgeType = 'تعادل';
      else match.badgeType = 'خسارة';

      const endEvent: MatchLiveEvent = {
        id: `ev-${Date.now()}`,
        type: 'comment',
        title: '🏁 نهاية المباراة',
        detail: `صافرة النهاية: انتهت مباراة ${match.homeTeam} ضد ${match.awayTeam}. النتيجة النهائية: (${hs} - ${as})`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        minute: match.liveMinute || "90'",
        period: 'انتهت المباراة',
      };
      match.liveEvents.unshift(endEvent);

      const notifTitle = `🏁 صافرة النهاية! النتيجة النهائية للمباراة`;
      const notifBody = `⚽ ${match.homeTeam} (${hs}) — (${as}) ${match.awayTeam}\n🏆 انتهت المباراة رسمياً.`;

      notificationStore.unshift({
        id: `notif-${Date.now()}`,
        title: notifTitle,
        message: notifBody,
        type: 'match',
        date: 'الآن',
        read: false,
      });
    }

    broadcastMatchUpdate(match);
    res.json(match);
  });

  // Reorder events
  app.put('/api/matches/:id/reorder-events', (req, res) => {
    const match = matchesStore.find((m) => m.id === req.params.id);
    if (!match || !match.liveEvents) return res.status(404).json({ error: 'Match or event not found' });

    const { eventIds } = req.body;
    if (Array.isArray(eventIds)) {
      const reordered: MatchLiveEvent[] = [];
      eventIds.forEach((id) => {
        const found = match.liveEvents?.find((e) => e.id === id);
        if (found) reordered.push(found);
      });
      match.liveEvents.forEach((e) => {
        if (!reordered.find((r) => r.id === e.id)) reordered.push(e);
      });
      match.liveEvents = reordered;
    }

    broadcastMatchUpdate(match);
    res.json(match);
  });

  // Players CRUD
  app.get('/api/players', (req, res) => {
    res.json(playersStore);
  });

  app.post('/api/players', (req, res) => {
    const id = req.body.id || `p-${Date.now()}`;
    const newPlayerItem: Player = {
      id,
      name: req.body.name,
      number: req.body.number ? parseInt(req.body.number) : undefined,
      position: req.body.position || 'مهاجم',
      location: req.body.location || 'كثيبة',
      image: req.body.image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      matchesPlayed: req.body.matchesPlayed ?? 0,
      goals: req.body.goals ?? 0,
      assists: req.body.assists ?? 0,
      age: req.body.age,
      height: req.body.height,
      joinedYear: req.body.joinedYear,
      pinCode: req.body.pinCode,
      role: req.body.role || 'player',
    };
    const existingIdx = playersStore.findIndex(p => p.id === id);
    if (existingIdx !== -1) {
      playersStore[existingIdx] = newPlayerItem;
    } else {
      playersStore.push(newPlayerItem);
    }
    res.status(201).json(newPlayerItem);
  });

  app.put('/api/players/:id', (req, res) => {
    const idx = playersStore.findIndex(p => p.id === req.params.id);
    if (idx !== -1) {
      playersStore[idx] = { ...playersStore[idx], ...req.body };
      res.json(playersStore[idx]);
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  });

  app.delete('/api/players/:id', (req, res) => {
    playersStore = playersStore.filter(p => p.id !== req.params.id);
    res.json({ success: true });
  });

  // Training Sessions & Attendance System
  app.get('/api/training-sessions', (req, res) => {
    res.json(trainingStore);
  });

  app.post('/api/training-sessions', (req, res) => {
    const id = req.body.id || `train-${Date.now()}`;
    const newSession: TrainingSession = {
      id,
      title: req.body.title || '',
      date: req.body.date || '',
      time: req.body.time || '',
      location: req.body.location || '',
      note: req.body.note || '',
      isActive: req.body.isActive ?? true,
      createdAt: req.body.createdAt || new Date().toISOString(),
    };
    const existingIdx = trainingStore.findIndex(t => t.id === id);
    if (existingIdx !== -1) {
      trainingStore[existingIdx] = newSession;
    } else {
      trainingStore.unshift(newSession);
    }
    res.status(201).json(newSession);
  });

  app.delete('/api/training-sessions/:id', (req, res) => {
    const { id } = req.params;
    const cleanId = String(id || '').trim();
    trainingStore = trainingStore.filter((t) => String(t.id).trim() !== cleanId && String(t.id).trim() !== 'train-1');
    // Also remove associated training notifications
    notificationStore = notificationStore.filter((n) => 
      String(n.trainingSessionId || '').trim() !== cleanId && 
      String(n.id).trim() !== cleanId &&
      String(n.id).trim() !== 'notif-1'
    );
    res.json({ success: true, deletedId: cleanId });
  });

  app.delete('/api/training_sessions/:id', (req, res) => {
    const { id } = req.params;
    const cleanId = String(id || '').trim();
    trainingStore = trainingStore.filter((t) => String(t.id).trim() !== cleanId && String(t.id).trim() !== 'train-1');
    notificationStore = notificationStore.filter((n) => 
      String(n.trainingSessionId || '').trim() !== cleanId && 
      String(n.id).trim() !== cleanId &&
      String(n.id).trim() !== 'notif-1'
    );
    res.json({ success: true, deletedId: cleanId });
  });

  // Player Attendance Response Endpoint
  app.post('/api/training-responses', (req, res) => {
    const cleanSessionId = req.body.sessionId || trainingStore[0]?.id || 'default_session';
    const cleanPlayerName = String(req.body.playerName || '').trim();
    const playerId = req.body.playerId;
    const playerKey = (playerId || cleanPlayerName.replace(/\s+/g, '_')).replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '');
    const deterministicId = req.body.id || `resp_${cleanSessionId}_${playerKey}`;

    const newResponse: AttendanceResponse = {
      id: deterministicId,
      sessionId: cleanSessionId,
      playerId: playerId,
      playerName: cleanPlayerName,
      jerseyNumber: req.body.jerseyNumber,
      attending: Boolean(req.body.attending),
      excuseReason: req.body.excuseReason,
      createdAt: req.body.createdAt || new Date().toISOString(),
    };

    // Deduplicate in attendanceStore: remove any previous entry for the same player & session
    attendanceStore = attendanceStore.filter((r) => {
      if (r.sessionId === newResponse.sessionId) {
        if (newResponse.playerId && r.playerId === newResponse.playerId) return false;
        if (String(r.playerName).trim().toLowerCase() === cleanPlayerName.toLowerCase()) return false;
      }
      return true;
    });

    attendanceStore.unshift(newResponse);
    res.status(201).json(newResponse);
  });

  app.get('/api/training-responses', (req, res) => {
    const { sessionId } = req.query;
    if (sessionId) {
      res.json(attendanceStore.filter(r => r.sessionId === sessionId));
    } else {
      res.json(attendanceStore);
    }
  });

  app.delete('/api/training-responses/:id', (req, res) => {
    const { id } = req.params;
    const { playerName, sessionId } = req.query;
    attendanceStore = attendanceStore.filter((r) => {
      if (String(r.id) === String(id)) return false;
      if (playerName && String(r.playerName).trim() === String(playerName).trim()) {
        if (!sessionId || String(r.sessionId) === String(sessionId)) return false;
      }
      return true;
    });
    res.json({ success: true, deletedId: id });
  });

  app.delete('/api/training_responses/:id', (req, res) => {
    const { id } = req.params;
    const { playerName, sessionId } = req.query;
    attendanceStore = attendanceStore.filter((r) => {
      if (String(r.id) === String(id)) return false;
      if (playerName && String(r.playerName).trim() === String(playerName).trim()) {
        if (!sessionId || String(r.sessionId) === String(sessionId)) return false;
      }
      return true;
    });
    res.json({ success: true, deletedId: id });
  });

  app.delete('/api/training-responses', (req, res) => {
    const { playerName, sessionId } = req.query;
    if (playerName) {
      attendanceStore = attendanceStore.filter((r) => {
        if (String(r.playerName).trim() === String(playerName).trim()) {
          if (!sessionId || String(r.sessionId) === String(sessionId)) return false;
        }
        return true;
      });
    }
    res.json({ success: true });
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    res.json(notificationStore);
  });

  app.delete('/api/notifications/:id', (req, res) => {
    const { id } = req.params;
    const cleanId = String(id || '').trim();
    const targetNotif = notificationStore.find((n) => String(n.id).trim() === cleanId || String(n.trainingSessionId || '').trim() === cleanId);
    const sId = targetNotif?.trainingSessionId || (targetNotif?.type === 'training' ? cleanId : (cleanId.startsWith('ts-') || cleanId.startsWith('train-') ? cleanId : null));

    notificationStore = notificationStore.filter((n) => 
      String(n.id).trim() !== cleanId && 
      String(n.id).trim() !== 'notif-1' &&
      (!sId || String(n.trainingSessionId || '').trim() !== sId)
    );

    if (sId) {
      trainingStore = trainingStore.filter((t) => String(t.id).trim() !== sId && String(t.id).trim() !== 'train-1');
      attendanceStore = attendanceStore.filter((r) => String(r.sessionId).trim() !== sId && String(r.sessionId).trim() !== 'train-1');
    }
    res.json({ success: true, deletedId: cleanId });
  });

  // Comprehensive Cleanup of Mock / Test / Placeholder Data
  app.post('/api/cleanup-mock-data', (req, res) => {
    const fakeKeywords = ['تمرين ياشباب', 'ملعب السلام بكثيبة', 'اختبار', 'notif-1', 'train-1', 'ts-1', 'session-real-test-1', 'test'];
    
    notificationStore = notificationStore.filter(n => {
      const text = `${n.title || ''} ${n.message || ''} ${n.id} ${n.trainingSessionId || ''}`.toLowerCase();
      const isFake = fakeKeywords.some(k => text.includes(k.toLowerCase())) || n.id === 'notif-1' || n.id === 'train-1';
      return !isFake;
    });

    trainingStore = trainingStore.filter(t => {
      const text = `${t.title || ''} ${t.location || ''} ${t.note || ''} ${t.id}`.toLowerCase();
      const isFake = fakeKeywords.some(k => text.includes(k.toLowerCase())) || t.id === 'train-1' || t.id === 'ts-1';
      return !isFake;
    });

    attendanceStore = attendanceStore.filter(r => {
      return r.sessionId !== 'train-1' && r.sessionId !== 'ts-1' && r.sessionId !== 'session-real-test-1';
    });

    res.json({
      success: true,
      remainingNotifications: notificationStore.length,
      remainingTrainings: trainingStore.length,
    });
  });

  // ==========================================
  // 📲 ONESIGNAL PUSH NOTIFICATIONS SYSTEM
  // ==========================================

  const oneSignalDeviceIds = new Set<string>();
  const recentNotificationsCache = new Map<string, number>();
  
  // Dynamic OneSignal credentials (can be set via env or Admin Panel)
  let oneSignalConfig = {
    appId: process.env.ONESIGNAL_APP_ID || process.env.ONESIGNAL_ID || '',
    apiKey: process.env.ONESIGNAL_REST_API_KEY || process.env.REST_API_KEY || process.env.ONESIGNAL_API_KEY || '',
  };

  // Helper to resolve the correct full absolute Application Origin URL
  const DEFAULT_APP_ORIGIN = 'https://ais-dev-xe7fntsxyy6sunhjo7myoo-601184627383.europe-west1.run.app';

  function getAppOrigin(): string {
    if (process.env.APP_URL) {
      return process.env.APP_URL.replace(/\/$/, '');
    }
    return DEFAULT_APP_ORIGIN;
  }

  function resolveAppUrl(relativeOrAbsoluteUrl?: string, baseOrigin?: string): string {
    const origin = (baseOrigin || getAppOrigin()).replace(/\/$/, '');
    if (!relativeOrAbsoluteUrl) return `${origin}/`;
    if (relativeOrAbsoluteUrl.startsWith('http://') || relativeOrAbsoluteUrl.startsWith('https://')) {
      return relativeOrAbsoluteUrl;
    }
    const cleanPath = relativeOrAbsoluteUrl.startsWith('/') ? relativeOrAbsoluteUrl : `/${relativeOrAbsoluteUrl}`;
    return `${origin}${cleanPath}`;
  }

  /**
   * 📲 دالة إرسال طلب POST حقيقي إلى OneSignal API (https://onesignal.com/api/v1/notifications)
   * مع توجيه دقيق لأزرار التفاعل والإشعارات لفتح واجهة التطبيق مباشرة وليس أي صفحة خارجية
   */
  async function sendOneSignalNotification(options: {
    title: string;
    message: string;
    url?: string;
    origin?: string;
    data?: Record<string, any>;
    android_channel_id?: string;
    playerIds?: string[];
    segments?: string[];
    buttons?: Array<{ id: string; text: string; icon?: string }>;
    web_buttons?: Array<{ id: string; text: string; icon?: string; url?: string }>;
  }): Promise<{ success: boolean; data?: any; error?: string; status?: number; reason?: string }> {
    const appId = (oneSignalConfig.appId || process.env.ONESIGNAL_APP_ID || process.env.ONESIGNAL_ID || '').trim();
    const apiKey = (oneSignalConfig.apiKey || process.env.ONESIGNAL_REST_API_KEY || process.env.REST_API_KEY || process.env.ONESIGNAL_API_KEY || '').trim();

    console.log(`\n=================== 📲 ONESIGNAL DISPATCH START ===================`);
    console.log(`📡 [OneSignal] Target Endpoint: https://onesignal.com/api/v1/notifications`);
    console.log(`🔑 [OneSignal Config Check] App ID: ${appId ? `${appId.slice(0, 8)}... (موجود)` : '❌ غير مضبوط'}`);
    console.log(`🔑 [OneSignal Config Check] REST API Key: ${apiKey ? `Basic ${apiKey.slice(0, 6)}... (موجود)` : '❌ غير مضبوط'}`);
    console.log(`📱 [OneSignal Registered Devices in Memory]: ${oneSignalDeviceIds.size} device(s)`);

    if (!appId || !apiKey) {
      const missingReason = `لم يتم ضبط ONESIGNAL_APP_ID أو ONESIGNAL_REST_API_KEY. يرجى إدخالهما من لوحة تحكم المشرف أو متغيرات البيئة.`;
      console.warn(`⚠️ [OneSignal Config Error]: ${missingReason}`);
      console.log(`=================== 📲 ONESIGNAL DISPATCH END ===================\n`);
      return { 
        success: false, 
        reason: missingReason, 
        error: 'ONESIGNAL_CREDENTIALS_MISSING' 
      };
    }

    // منع تكرار إرسال نفس الإشعار حرفياً خلال 5 ثوانٍ
    const notifKey = `${options.title?.trim()}||${options.message?.trim()}`;
    const now = Date.now();
    const lastSent = recentNotificationsCache.get(notifKey);
    if (lastSent && now - lastSent < 5000) {
      console.log(`⚠️ [OneSignal Deduplication] تم تجاهل إرسال إشعار مكرر خلال نافذة 5 ثوانٍ: "${options.title}"`);
      console.log(`=================== 📲 ONESIGNAL DISPATCH END ===================\n`);
      return { 
        success: true, 
        data: { deduplicated: true, message: 'Duplicate notification suppressed within 5s debounce window' } 
      };
    }
    recentNotificationsCache.set(notifKey, now);

    // تنظيف الكاش القديم
    if (recentNotificationsCache.size > 100) {
      recentNotificationsCache.forEach((time, key) => {
        if (now - time > 60000) recentNotificationsCache.delete(key);
      });
    }

    const appOrigin = options.origin ? options.origin.replace(/\/$/, '') : getAppOrigin();
    const isTraining = options.data?.type === 'training' || Boolean(options.data?.trainingSessionId);
    const trainingSessionId = options.data?.trainingSessionId || '';
    const isGallery = options.data?.type === 'gallery' || Boolean(options.data?.galleryPostId);
    const galleryPostId = options.data?.galleryPostId || '';

    // معرف قناة الإشعارات العاجلة الرسمية لنادي السلام بكثيبة المسجلة في OneSignal Dashboard
    const SALAM_ONESIGNAL_CHANNEL_ID = 'd375dad7-cf17-40a3-9cb2-10d3aacffa67';

    // توجيه الإشعار الافتراضي مباشرة إلى واجهة التطبيق داخل تطبيق Median حصرياً
    let defaultTargetUrl = resolveAppUrl(options.url || '/', appOrigin);
    if (isTraining) {
      defaultTargetUrl = resolveAppUrl(`/?screen=home&trainingSessionId=${encodeURIComponent(trainingSessionId)}`, appOrigin);
    } else if (isGallery) {
      defaultTargetUrl = resolveAppUrl(`/?screen=gallery${galleryPostId ? `&galleryPostId=${encodeURIComponent(galleryPostId)}` : ''}`, appOrigin);
    }

    const targetUrl = options.url ? resolveAppUrl(options.url, appOrigin) : defaultTargetUrl;

    // تجهيز الحمولة (Payload) المطابقة للمواصفات الرسمية لـ OneSignal API v1 مع توجيه قطعي لواجهة التطبيق
    const payload: Record<string, any> = {
      app_id: appId,
      headings: { ar: options.title, en: options.title },
      contents: { ar: options.message, en: options.message },
      // 🚀 ربط معرف القناة الرسمي حصرياً لإظهار البنر المنبثق العائم (Heads-Up Pop-up & High Importance)
      android_channel_id: options.android_channel_id || options.data?.android_channel_id || SALAM_ONESIGNAL_CHANNEL_ID,
      url: targetUrl,
      data: {
        ...(options.data || {}),
        android_channel_id: SALAM_ONESIGNAL_CHANNEL_ID,
        targetUrl,
        screen: isTraining ? 'home' : (isGallery ? 'gallery' : (options.data?.screen || undefined)),
        deepLink: isTraining ? 'home' : (isGallery ? 'gallery' : (options.data?.deepLink || undefined)),
        trainingSessionId: trainingSessionId || undefined,
        galleryPostId: galleryPostId || undefined,
      },
      // 🚀 إعدادات أندرويد و iOS و Web الرسمية للأولوية القصوى والبنر العائم (Heads-up / High Importance)
      priority: 10,
      android_sound: 'notification',
      ios_sound: 'default',
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      android_visibility: 1, // إظهار كامل على شاشة القفل (Heads-up)
      android_accent_color: 'FFD70000', // لون النادي الأحمر
      small_icon: 'ic_stat_onesignal_default',
      large_icon: `${appOrigin}/logo-salam.png`,
      chrome_web_icon: `${appOrigin}/logo-salam.png`,
      chrome_web_badge: `${appOrigin}/logo-salam.png`,
      firefox_icon: `${appOrigin}/logo-salam.png`,
      content_available: true,
      mutable_content: true,
      ttl: 259200,
    };

    // أزرار التفاعل المباشرة لإشعارات التمارين (Interactive Action Buttons للاعبين) تفتح واجهة التطبيق مباشرة
    if (isTraining) {
      const confirmAppUrl = resolveAppUrl(`/?screen=home&action=confirm&trainingSessionId=${encodeURIComponent(trainingSessionId)}`, appOrigin);
      const apologizeAppUrl = resolveAppUrl(`/?screen=home&action=apologize&trainingSessionId=${encodeURIComponent(trainingSessionId)}`, appOrigin);

      const defaultButtons = [
        { id: 'confirm_attendance', text: '✅ تأكيد الحضور' },
        { id: 'apologize_attendance', text: '❌ اعتذار' },
      ];
      const defaultWebButtons = [
        {
          id: 'confirm_attendance',
          text: '✅ تأكيد الحضور',
          url: confirmAppUrl,
        },
        {
          id: 'apologize_attendance',
          text: '❌ اعتذار',
          url: apologizeAppUrl,
        },
      ];

      payload.buttons = options.buttons || defaultButtons;
      payload.web_buttons = options.web_buttons 
        ? options.web_buttons.map(b => ({ ...b, url: b.url ? resolveAppUrl(b.url, appOrigin) : targetUrl }))
        : defaultWebButtons;
      payload.url = targetUrl;
    } else {
      if (options.buttons) payload.buttons = options.buttons;
      if (options.web_buttons) {
        payload.web_buttons = options.web_buttons.map(b => ({ ...b, url: b.url ? resolveAppUrl(b.url, appOrigin) : targetUrl }));
      }
      if (options.url) {
        payload.url = resolveAppUrl(options.url, appOrigin);
      }
    }

    // تحديد الجمهور المستهدف (Target Audience)
    if (options.playerIds && options.playerIds.length > 0) {
      payload.include_player_ids = options.playerIds;
      console.log(`🎯 [OneSignal Targeting]: Specific player IDs (${options.playerIds.length})`);
    } else if (options.segments && options.segments.length > 0) {
      payload.included_segments = options.segments;
      console.log(`🎯 [OneSignal Targeting]: Custom segments: ${JSON.stringify(options.segments)}`);
    } else {
      // استهداف جميع المشتركين على مستوى التطبيق والمتصفحات
      payload.included_segments = ['Total Subscriptions', 'Subscribed Users', 'All'];
      console.log(`🎯 [OneSignal Targeting]: All Subscribed Users & Total Subscriptions`);
    }

    console.log(`📦 [OneSignal Request Payload]:\n`, JSON.stringify(payload, null, 2));

    try {
      console.log(`🚀 [OneSignal API] جاري إرسال طلب POST عبر fetch إلى https://onesignal.com/api/v1/notifications...`);
      
      let response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Basic ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      let responseStatus = response.status;
      let responseText = await response.text();
      let responseJson: any = null;

      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { raw: responseText };
      }

      // إذا حدث خطأ بسبب android_channel_id غير مسجل في لوحة OneSignal، نقوم بإعادة الإرسال فوراً بدون هذا الحقل
      const errorStr = JSON.stringify(responseJson?.errors || responseText);
      if (errorStr.includes('android_channel_id') || errorStr.includes('Could not find android_channel_id')) {
        console.warn(`⚠️ [OneSignal Fallback] تم اكتشاف خطأ في android_channel_id، جاري إعادة الإرسال الفوري لجميع الأجهزة دون تحديد القناة...`);
        delete payload.android_channel_id;

        response = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        responseStatus = response.status;
        responseText = await response.text();
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          responseJson = { raw: responseText };
        }
      }

      console.log(`📥 [OneSignal HTTP Status]: ${responseStatus} ${response.statusText}`);
      console.log(`📡 [OneSignal API Raw Response Body]:\n`, JSON.stringify(responseJson, null, 2));

      if (response.ok && (!responseJson?.errors || responseJson.errors.length === 0)) {
        console.log(`✅ [OneSignal Success]: تم تسليم الإشعار بنجاح إلى OneSignal! معرف الإشعار: ${responseJson.id} | المستلمون: ${responseJson.recipients ?? 'قيد المعالجة'}`);
        console.log(`=================== 📲 ONESIGNAL DISPATCH END ===================\n`);
        return { 
          success: true, 
          status: responseStatus, 
          data: responseJson 
        };
      } else {
        console.warn(`❌ [OneSignal Delivery Warning / Error]: OneSignal أعاد خطأ أو تحذيراً:`, responseJson?.errors || responseJson);
        console.log(`=================== 📲 ONESIGNAL DISPATCH END ===================\n`);
        return { 
          success: false, 
          status: responseStatus, 
          error: responseJson?.errors ? JSON.stringify(responseJson.errors) : responseText,
          data: responseJson 
        };
      }
    } catch (error: any) {
      console.error('💥 [OneSignal Network/Fetch Fatal Error]:', error);
      console.log(`=================== 📲 ONESIGNAL DISPATCH END ===================\n`);
      return { 
        success: false, 
        error: String(error?.message || error) 
      };
    }
  }

  // 1. استقبال معرف OneSignal وحفظه
  app.post('/api/save-onesignal-id', (req, res) => {
    const { onesignal_id } = req.body;
    if (onesignal_id) {
      const cleanId = String(onesignal_id).trim();
      oneSignalDeviceIds.add(cleanId);
      console.log(`📲 [OneSignal] تم تسجيل معرف الجهاز: "${cleanId}" | إجمالي الأجهزة المسجلة في السيرفر: ${oneSignalDeviceIds.size}`);
    }
    res.json({ success: true, savedId: onesignal_id, totalDevices: oneSignalDeviceIds.size });
  });

  // استعلام الأجهزة المسجلة
  app.get('/api/save-onesignal-id', (req, res) => {
    res.json({ count: oneSignalDeviceIds.size, devices: Array.from(oneSignalDeviceIds) });
  });

  app.get('/api/onesignal/devices', (req, res) => {
    res.json({ count: oneSignalDeviceIds.size, devices: Array.from(oneSignalDeviceIds) });
  });

  // استرجاع حالة مفاتيح OneSignal (دون إظهار المفتاح السري كاملاً لأسباب أمنية)
  app.get('/api/onesignal/config', (req, res) => {
    const appId = (oneSignalConfig.appId || process.env.ONESIGNAL_APP_ID || process.env.ONESIGNAL_ID || '').trim();
    const apiKey = (oneSignalConfig.apiKey || process.env.ONESIGNAL_REST_API_KEY || process.env.REST_API_KEY || process.env.ONESIGNAL_API_KEY || '').trim();
    
    res.json({
      configured: Boolean(appId && apiKey),
      appId: appId || '',
      hasApiKey: Boolean(apiKey),
      apiKeyPreview: apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : '',
      registeredDevicesCount: oneSignalDeviceIds.size,
    });
  });

  // حفظ مفاتيح OneSignal برمجياً من لوحة التحكم
  app.post('/api/onesignal/config', (req, res) => {
    const { appId, apiKey } = req.body;
    if (appId) oneSignalConfig.appId = String(appId).trim();
    if (apiKey) oneSignalConfig.apiKey = String(apiKey).trim();

    console.log(`⚙️ [OneSignal Config Updated]: App ID=${oneSignalConfig.appId ? 'تم الحفظ' : 'فارغ'}, REST API Key=${oneSignalConfig.apiKey ? 'تم الحفظ' : 'فارغ'}`);
    
    res.json({
      success: true,
      configured: Boolean(oneSignalConfig.appId && oneSignalConfig.apiKey),
      appId: oneSignalConfig.appId,
      hasApiKey: Boolean(oneSignalConfig.apiKey),
    });
  });

  // نقطة نهاية مخصصة لاختبار إرسال إشعار عبر OneSignal API مباشرة مع إرجاع كامل التقرير
  app.post('/api/onesignal/send', async (req, res) => {
    const { title, message, url, data, playerIds, segments } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'title and message are required' });
    }

    const result = await sendOneSignalNotification({
      title,
      message,
      url,
      data,
      playerIds,
      segments,
    });

    res.json(result);
  });

  // بث إشعار عام داخل التطبيق وعبر OneSignal مع إرجاع تقرير التسليم المباشر
  app.post('/api/notifications/broadcast', async (req, res) => {
    const rawTitle = (req.body.title || '').trim();
    const formattedTitle = rawTitle.startsWith('🇧🇹') ? rawTitle : `🇧🇹 ${rawTitle}`;

    let messageText = (req.body.message || '').trim();
    const isTraining = req.body.type === 'training' || Boolean(req.body.trainingSessionId);
    
    // إضافة عبارة التوجيه السريع في نهاية نص إشعار التمرين إذا لم تكن موجودة
    const quickActionPrompt = 'انقر هنا لتأكيد حضورك أو الاعتذار';
    if (isTraining && !messageText.includes(quickActionPrompt)) {
      messageText = `${messageText}\n\n📲 ${quickActionPrompt}`;
    }

    const newNotif: AppNotification = {
      id: req.body.id || `notif-${Date.now()}`,
      title: formattedTitle,
      message: messageText,
      type: req.body.type || 'general',
      trainingSessionId: req.body.trainingSessionId,
      galleryPostId: req.body.galleryPostId,
      deepLink: req.body.deepLink || (isTraining ? 'home' : (req.body.type === 'gallery' ? 'gallery' : undefined)),
      date: req.body.date || 'الآن',
      read: false,
    };

    // If sending a training notification, replace older training notifications to avoid duplicates
    if (newNotif.type === 'training') {
      notificationStore = notificationStore.filter((n) => n.type !== 'training');
    }

    notificationStore.unshift(newNotif);

    // 📲 Trigger Real OneSignal push notification to mobile app & browsers
    const oneSignalResult = await sendOneSignalNotification({
      title: newNotif.title,
      message: newNotif.message,
      data: {
        notificationId: newNotif.id,
        type: newNotif.type,
        trainingSessionId: newNotif.trainingSessionId,
        galleryPostId: newNotif.galleryPostId,
        deepLink: newNotif.deepLink,
        screen: isTraining ? 'home' : (newNotif.type === 'gallery' ? 'gallery' : undefined),
      },
    }).catch((err) => {
      console.warn('OneSignal broadcast push error:', err);
      return { success: false, error: String(err) };
    });

    if (oneSignalResult && 'data' in oneSignalResult && (oneSignalResult as any).data?.id) {
      newNotif.oneSignalId = (oneSignalResult as any).data.id;
      newNotif.deliveredCount = (oneSignalResult as any).data.recipients || oneSignalDeviceIds.size || 0;
      newNotif.status = 'delivered';
    }

    res.status(201).json({
      ...newNotif,
      oneSignalResult,
    });
  });

  // Track Notification Read / Click Receipt Endpoint
  app.post('/api/notifications/:id/track-open', (req, res) => {
    const { id } = req.params;
    const { userId, userName } = req.body;
    const notif = notificationStore.find((n) => n.id === id);

    if (notif) {
      notif.clicksCount = (notif.clicksCount || 0) + 1;
      notif.readReceiptsCount = (notif.readReceiptsCount || 0) + 1;
      notif.status = 'opened';
      notif.openedAt = new Date().toISOString();

      if (!notif.readByUsers) notif.readByUsers = [];
      const identifier = String(userName || userId || 'مستخدم').trim();
      if (identifier && !notif.readByUsers.includes(identifier)) {
        notif.readByUsers.push(identifier);
      }
      return res.json({ success: true, notification: notif });
    }

    res.json({ success: true, message: 'Notification not found in store' });
  });

  // Fetch / Refresh Real-Time OneSignal Stats for a notification
  app.get('/api/notifications/:id/stats', async (req, res) => {
    const { id } = req.params;
    const notif = notificationStore.find((n) => n.id === id);
    const oneSignalId = notif?.oneSignalId || (req.query.oneSignalId as string);
    const appId = (oneSignalConfig.appId || process.env.ONESIGNAL_APP_ID || process.env.ONESIGNAL_ID || '').trim();
    const apiKey = (oneSignalConfig.apiKey || process.env.ONESIGNAL_REST_API_KEY || process.env.REST_API_KEY || process.env.ONESIGNAL_API_KEY || '').trim();

    if (!oneSignalId || !appId || !apiKey) {
      return res.json({
        success: true,
        deliveredCount: notif?.deliveredCount || oneSignalDeviceIds.size || 0,
        clicksCount: notif?.clicksCount || 0,
        readReceiptsCount: notif?.readReceiptsCount || 0,
        readByUsers: notif?.readByUsers || [],
        status: notif?.status || 'delivered',
      });
    }

    try {
      const response = await fetch(`https://onesignal.com/api/v1/notifications/${oneSignalId}?app_id=${appId}`, {
        headers: {
          'Authorization': `Basic ${apiKey}`,
        },
      });

      if (response.ok) {
        const statsData = await response.json();
        const delivered = statsData.successful ?? statsData.recipients ?? notif?.deliveredCount ?? 0;
        const clicks = statsData.converted ?? notif?.clicksCount ?? 0;

        if (notif) {
          notif.deliveredCount = delivered;
          notif.clicksCount = Math.max(notif.clicksCount || 0, clicks);
        }

        return res.json({
          success: true,
          deliveredCount: delivered,
          clicksCount: Math.max(notif?.clicksCount || 0, clicks),
          readReceiptsCount: notif?.readReceiptsCount || 0,
          readByUsers: notif?.readByUsers || [],
          status: notif?.status || 'delivered',
          oneSignalData: statsData,
        });
      }
    } catch (err) {
      console.warn("⚠️ OneSignal stats query error:", err);
    }

    res.json({
      success: true,
      deliveredCount: notif?.deliveredCount || oneSignalDeviceIds.size || 0,
      clicksCount: notif?.clicksCount || 0,
      readReceiptsCount: notif?.readReceiptsCount || 0,
      readByUsers: notif?.readByUsers || [],
      status: notif?.status || 'delivered',
    });
  });

  // ==========================================
  // Cloud Match Archive & Historical Reports Endpoints
  // ==========================================
  app.get('/api/match-archive', (req, res) => {
    res.json(matchArchiveStore);
  });

  app.post('/api/match-archive', (req, res) => {
    const newArchiveCard: MatchArchiveCard = {
      id: req.body.id || `archive-${Date.now()}`,
      matchId: req.body.matchId,
      season: req.body.season || 'موسم 2025/2026',
      tournament: req.body.tournament || 'مباراة ودية',
      date: req.body.date || new Date().toISOString().split('T')[0],
      homeTeam: req.body.homeTeam || 'السلام بكثيبة',
      homeLogo: req.body.homeLogo || '/logo-salam.png',
      awayTeam: req.body.awayTeam || 'الخصم',
      awayLogo: req.body.awayLogo,
      homeScore: Number(req.body.homeScore ?? 0),
      awayScore: Number(req.body.awayScore ?? 0),
      badgeType: req.body.badgeType || (Number(req.body.homeScore) > Number(req.body.awayScore) ? 'فوز' : Number(req.body.homeScore) === Number(req.body.awayScore) ? 'تعادل' : 'خسارة'),
      stadium: req.body.stadium || 'ملعب السلام بكثيبة',
      summaryReport: req.body.summaryReport || '',
      goalsSummary: req.body.goalsSummary || [],
      topPlayer: req.body.topPlayer || '',
      coachNotes: req.body.coachNotes || '',
      referee: req.body.referee || '',
      images: req.body.images || [],
      stats: req.body.stats || {
        possession: '50% - 50%',
        shotsOnTarget: 5,
        corners: 4,
        yellowCards: 1,
        redCards: 0,
      },
      createdAt: req.body.createdAt || new Date().toISOString(),
    };

    const existingIdx = matchArchiveStore.findIndex((a) => a.id === newArchiveCard.id);
    if (existingIdx !== -1) {
      matchArchiveStore[existingIdx] = newArchiveCard;
    } else {
      matchArchiveStore.unshift(newArchiveCard);
    }

    res.status(201).json(newArchiveCard);
  });

  app.put('/api/match-archive/:id', (req, res) => {
    const { id } = req.params;
    const idx = matchArchiveStore.findIndex((a) => a.id === id);
    if (idx !== -1) {
      matchArchiveStore[idx] = { ...matchArchiveStore[idx], ...req.body, id };
      return res.json(matchArchiveStore[idx]);
    }
    const newCard: MatchArchiveCard = { id, ...req.body };
    matchArchiveStore.unshift(newCard);
    res.json(newCard);
  });

  app.delete('/api/match-archive/:id', (req, res) => {
    matchArchiveStore = matchArchiveStore.filter((a) => a.id !== req.params.id);
    res.json({ success: true, deletedId: req.params.id });
  });

  // ==========================================
  // Gallery Management Endpoints
  // ==========================================
  app.get('/api/gallery', (req, res) => {
    res.json(galleryPostsStore);
  });

  app.post('/api/gallery', (req, res) => {
    const newPost: GalleryPost = {
      id: req.body.id || `gallery-${Date.now()}`,
      title: req.body.title || 'تغطية مصورة جديدة',
      description: req.body.description || '',
      imageUrl: req.body.imageUrl || '',
      images: req.body.images || (req.body.imageUrl ? [req.body.imageUrl] : []),
      category: req.body.category || 'تغطية',
      author: req.body.author || 'إعلامي السلام',
      date: req.body.date || 'اليوم',
      timestamp: req.body.timestamp || new Date().toISOString(),
      likesCount: req.body.likesCount || 0,
      likedUserIds: req.body.likedUserIds || [],
      ratings: req.body.ratings || [],
      averageRating: req.body.averageRating || 5,
      totalRatingsCount: req.body.totalRatingsCount || 1,
      matchId: req.body.matchId || '',
    };

    const existingIdx = galleryPostsStore.findIndex((p) => p.id === newPost.id);
    if (existingIdx !== -1) {
      galleryPostsStore[existingIdx] = newPost;
    } else {
      galleryPostsStore.unshift(newPost);
    }

    res.status(201).json(newPost);
  });

  app.delete('/api/gallery/:id', (req, res) => {
    galleryPostsStore = galleryPostsStore.filter((p) => p.id !== req.params.id);
    res.json({ success: true });
  });

  app.post('/api/gallery/:id/like', (req, res) => {
    const post = galleryPostsStore.find((p) => p.id === req.params.id);
    if (post) {
      if (typeof req.body.likesCount === 'number') {
        post.likesCount = req.body.likesCount;
      }
      if (Array.isArray(req.body.likedUserIds)) {
        post.likedUserIds = req.body.likedUserIds;
      }
      res.json({ success: true, likesCount: post.likesCount, likedUserIds: post.likedUserIds });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  });

  app.post('/api/gallery/:id/rate', (req, res) => {
    const post = galleryPostsStore.find((p) => p.id === req.params.id);
    if (post) {
      if (Array.isArray(req.body.ratings)) {
        post.ratings = req.body.ratings;
      }
      if (typeof req.body.averageRating === 'number') {
        post.averageRating = req.body.averageRating;
      }
      if (typeof req.body.totalRatingsCount === 'number') {
        post.totalRatingsCount = req.body.totalRatingsCount;
      }
      res.json({ success: true, averageRating: post.averageRating, totalRatingsCount: post.totalRatingsCount });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  });

  // Store Management Endpoints
  app.get('/api/store', (req, res) => {
    res.json({
      products: storeProductsStore,
      settings: storeSettingsStore,
    });
  });

  app.put('/api/store/settings', (req, res) => {
    storeSettingsStore = { ...storeSettingsStore, ...req.body };
    res.json(storeSettingsStore);
  });

  app.post('/api/store/products', (req, res) => {
    const id = req.body.id || `prod-${Date.now()}`;
    const newProd: StoreProduct = {
      id,
      name: req.body.name,
      price: req.body.price || '5,000 ريال يمني',
      category: req.body.category || 'مستلزمات رياضية',
      image: req.body.image || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500&auto=format&fit=crop&q=80',
    };
    const existingIdx = storeProductsStore.findIndex(p => p.id === id);
    if (existingIdx !== -1) {
      storeProductsStore[existingIdx] = newProd;
    } else {
      storeProductsStore.unshift(newProd);
    }
    res.status(201).json(newProd);
  });

  app.put('/api/store/products/:id', (req, res) => {
    const idx = storeProductsStore.findIndex(p => p.id === req.params.id);
    if (idx !== -1) {
      storeProductsStore[idx] = { ...storeProductsStore[idx], ...req.body };
      res.json(storeProductsStore[idx]);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  });

  app.delete('/api/store/products/:id', (req, res) => {
    storeProductsStore = storeProductsStore.filter(p => p.id !== req.params.id);
    res.json({ success: true });
  });

  // Service Worker headers middleware for PWA, Median & OneSignal
  app.use((req, res, next) => {
    if (
      req.path === '/sw.js' ||
      req.path === '/OneSignalSDKWorker.js' ||
      req.path === '/OneSignalSDKUpdaterWorker.js' ||
      req.path === '/firebase-messaging-sw.js'
    ) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    next();
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
