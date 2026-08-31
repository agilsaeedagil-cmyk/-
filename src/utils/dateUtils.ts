// Utilities for Arabic date formatting and Asia/Aden timezone countdowns

export function parseDateParts(dateStr: string) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();

  // Try delimiter-based formats: YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, DD/MM/YYYY
  const delimiter = clean.includes('-') ? '-' : clean.includes('/') ? '/' : clean.includes('.') ? '.' : null;
  if (delimiter) {
    const parts = clean.split(delimiter).map((p) => p.trim());
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        let year = p0;
        let month = p1 - 1;
        let day = p2;

        // If first part is day and third part is year e.g. 12-08-2026 or 12/08/2026
        if (p0 <= 31 && p2 >= 2000) {
          year = p2;
          month = p1 - 1;
          day = p0;
        } else if (p0 >= 2000 && p2 <= 31) {
          // YYYY-MM-DD format
          year = p0;
          month = p1 - 1;
          day = p2;
        }

        if (year >= 2000 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
          return { year, month, day };
        }
      }
    }
  }

  // Handle Arabic full string formats e.g. "الأربعاء 12 أغسطس 2026" or "12 أغسطس 2026"
  const yearMatch = clean.match(/\b(20\d\d)\b/);
  const numberMatches = clean.match(/\b([1-3]?\d)\b/g);

  let monthIndex = -1;
  ARABIC_MONTHS.forEach((m, idx) => {
    if (clean.includes(m)) monthIndex = idx;
  });

  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    let day = 1;

    if (numberMatches) {
      const dayCandidates = numberMatches
        .map((n) => parseInt(n, 10))
        .filter((n) => n >= 1 && n <= 31 && n !== year);
      if (dayCandidates.length > 0) {
        day = dayCandidates[0];
      }
    }

    if (monthIndex !== -1) {
      return { year, month: monthIndex, day };
    }
  }

  return null;
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
];

/**
 * Calculates the Arabic day name automatically from a YYYY-MM-DD date string.
 * Example: "2026-08-12" -> "الأربعاء"
 * Example: "2026-08-14" -> "الجمعة"
 */
export function getArabicDayName(dateStr: string): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return '';
  const date = new Date(parts.year, parts.month, parts.day);
  const dayIndex = date.getDay();
  return ARABIC_DAYS[dayIndex] || '';
}

/**
 * Formats a YYYY-MM-DD date string into full Arabic formatted date.
 * Example: "2026-08-12" -> "الأربعاء 12 أغسطس 2026"
 */
export function formatArabicFullDate(dateStr: string): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return dateStr || '';
  const dayName = getArabicDayName(dateStr);
  const monthName = ARABIC_MONTHS[parts.month] || '';
  return `${dayName} ${parts.day} ${monthName} ${parts.year}`.trim();
}

/**
 * Parses time strings such as "8:00 مساءً", "08:00 م", "20:00", "4:30 مساءً" into hours and minutes.
 */
export function parseMatchTime(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr || typeof timeStr !== 'string') return { hours: 20, minutes: 0 };

  const str = timeStr.trim().toLowerCase();
  const isPM = str.includes('مساء') || str.includes('م') || str.includes('pm');
  const isAM = str.includes('صباح') || str.includes('ص') || str.includes('am');

  // Convert Arabic numerals to ASCII
  const normalized = str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  const matches = normalized.match(/(\d{1,2}):(\d{2})/);

  let hours = 20;
  let minutes = 0;

  if (matches) {
    hours = parseInt(matches[1], 10);
    minutes = parseInt(matches[2], 10);
  } else {
    const singleMatch = normalized.match(/(\d{1,2})/);
    if (singleMatch) {
      hours = parseInt(singleMatch[1], 10);
    }
  }

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

/**
 * Returns UTC epoch timestamp corresponding to Asia/Aden local time (UTC+3 offset).
 */
export function getAdenMatchTimestamp(dateStr: string, timeStr?: string): number {
  const parts = parseDateParts(dateStr);
  if (!parts) return 0;
  const { hours, minutes } = parseMatchTime(timeStr);

  // Asia/Aden is fixed UTC+3
  return Date.UTC(parts.year, parts.month, parts.day, hours - 3, minutes, 0);
}

export interface MatchCountdown {
  isStarted: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Computes exact countdown to match start based on Asia/Aden timezone.
 */
export function getMatchCountdown(dateStr: string, timeStr?: string): MatchCountdown {
  const targetTimestamp = getAdenMatchTimestamp(dateStr, timeStr);
  if (!targetTimestamp) {
    return { isStarted: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const now = Date.now();
  const diff = targetTimestamp - now;

  if (diff <= 0) {
    return { isStarted: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    isStarted: false,
    days,
    hours,
    minutes,
    seconds
  };
}
