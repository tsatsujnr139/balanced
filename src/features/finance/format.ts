export const DEFAULT_CURRENCY = "GHS";

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  GHS: "GH₵",
  USD: "$",
};

/** Display symbol for a currency code, e.g. GH₵ for Ghanaian cedi. */
export function getCurrencySymbol(currency = DEFAULT_CURRENCY): string {
  return CURRENCY_SYMBOL[currency] ?? currency;
}

function formatAmount(
  minorUnits: number,
  options: {
    maximumFractionDigits?: number;
    notation?: "compact" | "standard";
  } = {}
): string {
  const { maximumFractionDigits = 2, notation = "standard" } = options;
  const value = Math.abs(minorUnits / 100);

  return new Intl.NumberFormat("en-GH", {
    maximumFractionDigits,
    minimumFractionDigits: notation === "compact" ? 0 : maximumFractionDigits,
    notation,
  }).format(value);
}

/** Format a minor-unit (pesewas) amount with the currency symbol, e.g. GH₵4,823.55. */
export function formatCurrency(
  minorUnits: number,
  currency = DEFAULT_CURRENCY,
  options: { signed?: boolean; maximumFractionDigits?: number } = {}
): string {
  const { signed = false, maximumFractionDigits = 2 } = options;
  const value = minorUnits / 100;
  const symbol = getCurrencySymbol(currency);
  const formatted = `${symbol}${formatAmount(minorUnits, { maximumFractionDigits })}`;

  if (signed) {
    if (value > 0) {
      return `+${formatted}`;
    }
    if (value < 0) {
      return `-${formatted}`;
    }
  }
  return value < 0 ? `-${formatted}` : formatted;
}

/** Compact currency for large totals, e.g. GH₵57.9K. */
export function formatCompactCurrency(
  minorUnits: number,
  currency = DEFAULT_CURRENCY
): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${formatAmount(minorUnits, { maximumFractionDigits: 1, notation: "compact" })}`;
}

/** Human friendly relative day label, e.g. "Today", "Yesterday", "Mon". */
export function formatTransactionDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / 86_400_000
  );

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** Local calendar day key for grouping transactions, e.g. 2025-06-22. */
export function getTransactionDayKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Section header label for a group of same-day transactions. */
export function formatTransactionSectionDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / 86_400_000
  );

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Percentage (0-100, clamped) a budget has been used, for bar widths. */
export function budgetUsage(spent: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  return Math.min(Math.max(spent / limit, 0), 1) * 100;
}

/** Unclamped percentage of a budget spent, e.g. 142 when overspent. */
export function budgetUsagePercent(spent: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  return Math.round((spent / limit) * 100);
}

/** Human label for a planned-payment recurrence, e.g. "Every 3 months". */
export function plannedPaymentScheduleLabel(
  frequency: "once" | "weekly" | "monthly" | "yearly",
  interval: number
): string {
  if (frequency === "once") {
    return "One time";
  }
  if (interval <= 1) {
    if (frequency === "weekly") {
      return "Weekly";
    }
    if (frequency === "monthly") {
      return "Monthly";
    }
    return "Yearly";
  }
  const unit =
    frequency === "weekly"
      ? "week"
      : frequency === "monthly"
        ? "month"
        : "year";
  return `Every ${interval} ${unit}s`;
}

/** Short due label for a planned-payment list row. */
export function plannedPaymentDueLabel(daysUntilDue: number | null): string {
  if (daysUntilDue === null) {
    return "Completed";
  }
  if (daysUntilDue === 0) {
    return "Today";
  }
  if (daysUntilDue < 0) {
    const days = Math.abs(daysUntilDue);
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }
  return `in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
}

/** Due label for a planned-payment occurrence row in the detail view. */
export function plannedOccurrenceDueLabel(daysUntilDue: number): string {
  if (daysUntilDue === 0) {
    return "Due date today";
  }
  if (daysUntilDue < 0) {
    const days = Math.abs(daysUntilDue);
    return `Due date ${days} day${days === 1 ? "" : "s"} ago`;
  }
  return `Due date in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`;
}

/** Short date label, e.g. "29 Jun". */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** Full date label, e.g. "July 25, 2026". */
export function formatPlannedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type BudgetStatus = "on_track" | "warning" | "over";

/** Spend health used to colour budget progress indicators. */
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) {
    return "on_track";
  }
  if (spent > limit) {
    return "over";
  }
  if (spent / limit >= 0.75) {
    return "warning";
  }
  return "on_track";
}
