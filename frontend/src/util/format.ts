/**
 * Shared formatting utilities — centralised from inline copies across pages.
 */

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

/**
 * Human-friendly relative timestamp, e.g. "3h ago".
 * Accepts an ISO-8601 date string.
 */
export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Shorter relative timestamp using a Unix-ms value, for "Last refreshed X ago".
 */
export function timeAgoShort(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 60_000);
  if (diff < 1) return 'just now';
  return `${diff}m ago`;
}

// ---------------------------------------------------------------------------
// Monogram / initials
// ---------------------------------------------------------------------------

/**
 * Two-letter monogram derived from a company or entity name.
 * Falls back to '??' for empty/null values.
 */
export function monogram(name: string | null | undefined): string {
  if (!name) return '??';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Stable colour list used for monogram backgrounds. */
const MONOGRAM_HUES = [
  '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e',
  '#3b82f6', '#ec4899', '#14b8a6', '#a855f7', '#0ea5e9',
];

/**
 * Deterministic accent colour derived from a name.
 * Useful for avatar / monogram backgrounds.
 */
export function monogramColor(name: string | null | undefined): string {
  const s = name ?? '';
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return MONOGRAM_HUES[Math.abs(hash) % MONOGRAM_HUES.length];
}

/**
 * User-initials string (for avatar fallbacks).
 * Tries first+last name, falls back to first letter of email, then '?'.
 */
export function userInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null,
): string {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  if (initials) return initials;
  if (email) return email[0].toUpperCase();
  return '?';
}

// ---------------------------------------------------------------------------
// Status display
// ---------------------------------------------------------------------------

/**
 * Capitalise the first letter of a status string for chip labels.
 */
export function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
