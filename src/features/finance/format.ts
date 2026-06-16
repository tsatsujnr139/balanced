export const DEFAULT_CURRENCY = 'GHS';

const SHORT_CURRENCY_SYMBOL: Record<string, string> = {
  GHS: '₵',
};

function formatAmount(
  minorUnits: number,
  options: { maximumFractionDigits?: number; notation?: 'compact' | 'standard' } = {}
): string {
  const { maximumFractionDigits = 2, notation = 'standard' } = options;
  const value = Math.abs(minorUnits / 100);

  return new Intl.NumberFormat('en-GH', {
    notation,
    maximumFractionDigits,
    minimumFractionDigits: notation === 'compact' ? 0 : maximumFractionDigits,
  }).format(value);
}

/** Format a minor-unit (pesewas) amount with the short currency symbol, e.g. ₵4,823.55. */
export function formatCurrency(
  minorUnits: number,
  currency = DEFAULT_CURRENCY,
  options: { signed?: boolean; maximumFractionDigits?: number } = {}
): string {
  const { signed = false, maximumFractionDigits = 2 } = options;
  const value = minorUnits / 100;
  const symbol = SHORT_CURRENCY_SYMBOL[currency] ?? currency;
  const formatted = `${symbol}${formatAmount(minorUnits, { maximumFractionDigits })}`;

  if (signed) {
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
  }
  return value < 0 ? `-${formatted}` : formatted;
}

/** Compact currency for large totals, e.g. ₵57.9K. */
export function formatCompactCurrency(minorUnits: number, currency = DEFAULT_CURRENCY): string {
  const symbol = SHORT_CURRENCY_SYMBOL[currency] ?? currency;
  return `${symbol}${formatAmount(minorUnits, { notation: 'compact', maximumFractionDigits: 1 })}`;
}

/** Human friendly relative day label, e.g. "Today", "Yesterday", "Mon". */
export function formatTransactionDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Percentage (0-100, clamped) a budget has been used. */
export function budgetUsage(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.max(spent / limit, 0), 1) * 100;
}
