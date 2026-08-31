const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");

// Initialize Firebase Admin SDK
initializeApp();

// FCM Topic Constants
const TOPICS = {
  TRAININGS: "topic_trainings",
  NEWS: "topic_news",
  MATCHES: "topic_matches",
};

/**
 * 1. Training Sessions Trigger (مواعيد التمارين)
 * Triggers when a new training session document is added to 'training_sessions'
 */
exports.sendTrainingNotification = onDocumentCreated(
  {
    document: "training_sessions/{docId}",
    region: "us-central1",
  },
  async (event) => {
    const data = event.data ? event.data.data() : null;
    if (!data) return;

    const title = "موعد تمرين جديد ⚽";
    const sessionTitle = data.title || "تمرين فريق نادي السلام الأول";
    const dateStr = data.date ? `التاريخ: ${data.date}` : "";
    const timeStr = data.time ? `الوقت: ${data.time}` : "";
    const locStr = data.location ? `المكان: ${data.location}` : "";

    const body = [sessionTitle, dateStr, timeStr, locStr]
      .filter(Boolean)
      .join(" | ");

    const message = {
      topic: TOPICS.TRAININGS,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
          title,
          body,
          icon: "/logo-salam.png",
          badge: "/logo-salam.png",
          dir: "rtl",
          lang: "ar",
          tag: `training-${event.params.docId}`,
          renotify: true,
          vibrate: [200, 100, 200],
        },
        fcmOptions: {
          link: "/#training",
        },
      },
      data: {
        type: "training",
        docId: String(event.params.docId),
        click_action: "/#training",
      },
    };

    try {
      const response = await getMessaging().send(message);
      console.log(`✅ [FCM] Training notification sent successfully to topic '${TOPICS.TRAININGS}':`, response);
    } catch (error) {
      console.error("❌ [FCM Error] Failed to send training notification:", error);
    }
  }
);

/**
 * 2. News Trigger (الأخبار والأنباء)
 * Triggers when a new news article document is added to 'news'
 */
exports.sendNewsNotification = onDocumentCreated(
  {
    document: "news/{docId}",
    region: "us-central1",
  },
  async (event) => {
    const data = event.data ? event.data.data() : null;
    if (!data) return;

    const title = "خبر جديد من نادي السلام 📰";
    const rawBody = data.title || data.summary || data.content || "تم نشر خبر جديد في التطبيق، انقر للمتابعة.";
    const body = rawBody.length > 120 ? rawBody.substring(0, 117) + "..." : rawBody;

    const message = {
      topic: TOPICS.NEWS,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
          title,
          body,
          icon: data.imageUrl || "/logo-salam.png",
          badge: "/logo-salam.png",
          dir: "rtl",
          lang: "ar",
          tag: `news-${event.params.docId}`,
          renotify: true,
        },
        fcmOptions: {
          link: "/#news",
        },
      },
      data: {
        type: "news",
        docId: String(event.params.docId),
        click_action: "/#news",
      },
    };

    try {
      const response = await getMessaging().send(message);
      console.log(`✅ [FCM] News notification sent successfully to topic '${TOPICS.NEWS}':`, response);
    } catch (error) {
      console.error("❌ [FCM Error] Failed to send news notification:", error);
    }
  }
);

/**
 * 3. Matches Trigger (المباريات)
 * Triggers when a match document is added or updated in 'matches'
 */
exports.sendMatchNotification = onDocumentUpdated(
  {
    document: "matches/{docId}",
    region: "us-central1",
  },
  async (event) => {
    const newData = event.data ? event.data.after.data() : null;
    const oldData = event.data ? event.data.before.data() : null;
    if (!newData) return;

    // Check if score, status, or key details changed
    const scoreChanged = newData.homeScore !== oldData?.homeScore || newData.awayScore !== oldData?.awayScore;
    const statusChanged = newData.status !== oldData?.status;
    
    if (!scoreChanged && !statusChanged) {
      console.log("ℹ️ Match update ignored (no score or status change).");
      return;
    }

    const title = "تحديث مباراة - نادي السلام 🏆";
    const home = newData.homeTeam || "السلام";
    const away = newData.awayTeam || "المنافس";
    const score = `${newData.homeScore ?? 0} - ${newData.awayScore ?? 0}`;
    const status = newData.status === 'live' ? 'جارية الآن 🔥' : newData.status === 'finished' ? 'انتهت المباراة 🏁' : 'تحديث جديد';

    const body = `${home} [${score}] ${away} | ${status}`;

    const message = {
      topic: TOPICS.MATCHES,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
          title,
          body,
          icon: "/logo-salam.png",
          badge: "/logo-salam.png",
          dir: "rtl",
          lang: "ar",
          tag: `match-${event.params.docId}`,
          renotify: true,
        },
        fcmOptions: {
          link: "/#matches",
        },
      },
      data: {
        type: "match",
        docId: String(event.params.docId),
        click_action: "/#matches",
      },
    };

    try {
      const response = await getMessaging().send(message);
      console.log(`✅ [FCM] Match update notification sent successfully to topic '${TOPICS.MATCHES}':`, response);
    } catch (error) {
      console.error("❌ [FCM Error] Failed to send match notification:", error);
    }
  }
);

/**
 * Helper HTTP Endpoint to subscribe device tokens to topics
 */
exports.subscribeToTopics = onRequest({ cors: true }, async (req, res) => {
  const { token, topics } = req.body || {};

  if (!token || !Array.isArray(topics) || topics.length === 0) {
    res.status(400).json({ error: "Missing token or topics array" });
    return;
  }

  try {
    const results = [];
    for (const topic of topics) {
      if (Object.values(TOPICS).includes(topic)) {
        await getMessaging().subscribeToTopic([token], topic);
        results.push(topic);
      }
    }
    res.json({ success: true, subscribedTopics: results });
  } catch (err) {
    console.error("❌ Error subscribing token to FCM topics:", err);
    res.status(500).json({ error: err.message });
  }
});
