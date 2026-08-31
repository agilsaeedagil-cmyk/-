/**
 * Helper utility to parse and sanitize numbers entered from mobile devices,
 * supporting standard Western digits (0-9), Arabic-Indic digits (٠-٩), and Persian digits (۰-۹).
 */
export function parseStandardNumber(value: string | number | undefined | null, defaultValue: number = 0): number {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'number') return isNaN(value) ? defaultValue : value;

  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabic = '۰۱۲۳۴۵۶۷۸۹';
  let cleanStr = String(value).trim();

  for (let i = 0; i < 10; i++) {
    cleanStr = cleanStr.split(arabicIndic[i]).join(String(i));
    cleanStr = cleanStr.split(easternArabic[i]).join(String(i));
  }

  // Remove non-numeric characters except minus
  cleanStr = cleanStr.replace(/[^0-9\-]/g, '');
  if (cleanStr === '' || cleanStr === '-') return defaultValue;

  const parsed = parseInt(cleanStr, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Normalizes a number/string to Western English digits string (0-9)
 */
export function toWesternDigits(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabic = '۰۱۲۳۴۵۶۷۸۹';
  let cleanStr = String(value);

  for (let i = 0; i < 10; i++) {
    cleanStr = cleanStr.split(arabicIndic[i]).join(String(i));
    cleanStr = cleanStr.split(easternArabic[i]).join(String(i));
  }

  return cleanStr;
}
