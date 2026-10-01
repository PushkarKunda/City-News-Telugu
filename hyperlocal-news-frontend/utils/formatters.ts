/**
 * Format a number to compact form (1200 -> 1.2k)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

/**
 * Safely parse date inputs (ISO 8601, Unix timestamps in seconds/ms, strings without timezone)
 * If no timezone is provided, treats as UTC so it converts cleanly to local time (IST).
 * Returns null for missing or invalid dates.
 */
export function parseSafeDate(raw: any): Date | null {
  if (raw === null || raw === undefined || raw === '' || raw === 0 || raw === '0') {
    return null;
  }
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === 'number') {
    if (isNaN(raw) || raw <= 0) return null;
    // Seconds vs Milliseconds (epoch timestamp in seconds is < 1e11)
    return new Date(raw < 1e11 ? raw * 1000 : raw);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'Invalid Date') {
      return null;
    }
    // Numeric timestamp string
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      return parseSafeDate(num);
    }
    // Check if timezone indicator is already present (Z or +HH:MM or -HH:MM)
    const hasTz = /[zZ]$|[+-]\d{2}(?::?\d{2})?$/.test(trimmed);
    const normalized = trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
    // If no timezone is present, treat as UTC by appending 'Z'
    const finalStr = hasTz ? normalized : `${normalized}Z`;
    const parsed = new Date(finalStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Safely extract published or creation timestamp from an article / post object
 * Priority: published_at, publishedAt, pubDate, pub_date, created_at, createdAt, approved_at, timestamp, date
 */
export function getArticleTimestamp(item: any): string | number | null | undefined {
  if (!item) return null;
  return (
    item.published_at ??
    item.publishedAt ??
    item.pubDate ??
    item.pub_date ??
    item.created_at ??
    item.createdAt ??
    item.approved_at ??
    item.timestamp ??
    item.published_date ??
    item.date ??
    null
  );
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_TE = ['జన', 'ఫిబ్ర', 'మార్చి', 'ఏప్రి', 'మే', 'జూన్', 'జూలై', 'ఆగ', 'సెప్టెం', 'అక్టో', 'నవం', 'డిసెం'];

export interface TimeAgoOptions {
  language?: 'en' | 'te';
}

/**
 * Format timestamp to relative time based on article's published time
 * Thresholds:
 * - under 1 minute: Just now (ఇప్పుడే)
 * - under 60 minutes: 5m ago (5 నిమిషాల క్రితం)
 * - under 24 hours: 3h ago (3 గంటల క్రితం)
 * - under 7 days: 2d ago (2 రోజుల క్రితం)
 * - older than 7 days: 24 Sep (24 Sep 2025 if different year)
 * Returns empty string if timestamp is missing or invalid.
 */
export function formatTimeAgo(
  rawDate: string | number | Date | null | undefined,
  options?: TimeAgoOptions
): string {
  const date = parseSafeDate(rawDate);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  // Handle slight future drift due to clock skew
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const isTelugu = options?.language === 'te';

  // under 1 minute
  if (diffSec < 60) {
    return isTelugu ? 'ఇప్పుడే' : 'Just now';
  }
  // under 60 minutes
  if (diffMin < 60) {
    return isTelugu ? `${diffMin} నిమిషాల క్రితం` : `${diffMin}m ago`;
  }
  // under 24 hours
  if (diffHour < 24) {
    return isTelugu ? `${diffHour} గంటల క్రితం` : `${diffHour}h ago`;
  }
  // under 7 days
  if (diffDay < 7) {
    return isTelugu ? `${diffDay} రోజుల క్రితం` : `${diffDay}d ago`;
  }

  // older than 7 days: short date (e.g. 24 Sep, or 24 Sep 2025)
  const day = date.getDate();
  const sameYear = date.getFullYear() === now.getFullYear();

  if (isTelugu) {
    const month = MONTHS_TE[date.getMonth()];
    return sameYear ? `${day} ${month}` : `${day} ${month} ${date.getFullYear()}`;
  }

  const month = MONTHS_EN[date.getMonth()];
  return sameYear ? `${day} ${month}` : `${day} ${month} ${date.getFullYear()}`;
}

/**
 * Format date to readable format (Mar 15, 2024)
 */
export function formatDate(rawDate: any): string {
  const date = parseSafeDate(rawDate);
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format phone number (+919876543210 -> +91 98765 43210)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Calculate read time based on word count
 */
export function calculateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

/**
 * Calculate estimated read time for Telugu / multilingual news content
 * Telugu reading speed is ~150 words per minute with a minimum of 1 min.
 */
export function calculateTeluguReadTime(content?: string | null): string {
  if (!content || !content.trim()) return '1 min read';
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 150));
  return `${minutes} min read`;
}