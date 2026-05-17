/**
 * Tiny formatting helpers — no dep on Intl-heavy libraries.
 *
 * formatRelativeTime is a coarse "5 minutes ago" / "3 days ago"
 * formatter that's good enough for activity feeds. It's NOT
 * locale-aware; the demo targets English only. Swap to Intl
 * .RelativeTimeFormat if you ever need localization.
 *
 * formatCents takes a USD-cents amount and returns "$24.00".
 * Used for billing display.
 */

const UNITS: Array<[string, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

export function formatRelativeTime(date: Date | string): string {
  const t = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - t.getTime();
  if (diff < 60_000) return 'just now';
  for (const [unit, ms] of UNITS) {
    const n = Math.floor(diff / ms);
    if (n >= 1) {
      return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDate(date: Date | string): string {
  const t = typeof date === 'string' ? new Date(date) : date;
  return t.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
