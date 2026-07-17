export type PeriodType = "weekly" | "monthly" | "yearly";

export interface PeriodRange {
  start: number;
  end: number;
}

const DAY_MS = 86_400_000;
const EPOCH_MONDAY_DAY = Date.UTC(1970, 0, 5) / DAY_MS;

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function normalizeInterval(interval: number): number {
  return Number.isSafeInteger(interval) && interval > 0 ? interval : 1;
}

/** Midnight at the start of a week (Monday-based), matching budget periods. */
function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysSinceMonday
  );
}

/** Start of the calendar-aligned period containing `anchor`. */
function periodStartDate(
  type: PeriodType,
  anchor: Date,
  interval: number
): Date {
  const normalizedInterval = normalizeInterval(interval);
  switch (type) {
    case "weekly": {
      const weekStart = startOfWeek(anchor);
      const localDay =
        Date.UTC(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate()
        ) / DAY_MS;
      const weekIndex = Math.floor((localDay - EPOCH_MONDAY_DAY) / 7);
      return new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() - positiveModulo(weekIndex, normalizedInterval) * 7
      );
    }
    case "yearly": {
      const startYear =
        anchor.getFullYear() -
        positiveModulo(anchor.getFullYear(), normalizedInterval);
      return new Date(startYear, 0, 1);
    }
    default: {
      const monthIndex = anchor.getFullYear() * 12 + anchor.getMonth();
      const startMonthIndex =
        monthIndex - positiveModulo(monthIndex, normalizedInterval);
      return new Date(
        Math.floor(startMonthIndex / 12),
        positiveModulo(startMonthIndex, 12),
        1
      );
    }
  }
}

/** Half-open [start, end) epoch-ms bounds for the period containing `anchor`. */
export function periodRange(
  type: PeriodType,
  anchor: Date,
  interval = 1
): PeriodRange {
  const normalizedInterval = normalizeInterval(interval);
  const start = periodStartDate(type, anchor, normalizedInterval);
  let end: Date;
  switch (type) {
    case "weekly": {
      end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 7 * normalizedInterval
      );
      break;
    }
    case "yearly": {
      end = new Date(start.getFullYear() + normalizedInterval, 0, 1);
      break;
    }
    default: {
      end = new Date(
        start.getFullYear(),
        start.getMonth() + normalizedInterval,
        1
      );
      break;
    }
  }
  return { end: end.getTime(), start: start.getTime() };
}

/** Anchor moved one period in `dir` (-1 = previous, 1 = next). */
export function shiftPeriod(
  anchor: Date,
  type: PeriodType,
  dir: -1 | 1,
  interval = 1
): Date {
  const normalizedInterval = normalizeInterval(interval);
  const start = periodStartDate(type, anchor, normalizedInterval);
  switch (type) {
    case "weekly": {
      return new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + dir * 7 * normalizedInterval
      );
    }
    case "yearly": {
      return new Date(start.getFullYear() + dir * normalizedInterval, 0, 1);
    }
    default: {
      return new Date(
        start.getFullYear(),
        start.getMonth() + dir * normalizedInterval,
        1
      );
    }
  }
}

/** Whether the period containing `anchor` is the one we're currently in. */
export function isCurrentPeriod(
  type: PeriodType,
  anchor: Date,
  interval = 1
): boolean {
  const { start, end } = periodRange(type, anchor, interval);
  const now = Date.now();
  return now >= start && now < end;
}

/** Human label for the period header, e.g. "This week", "June 2026", "2026". */
export function formatPeriodLabel(
  type: PeriodType,
  anchor: Date,
  interval = 1
): string {
  const normalizedInterval = normalizeInterval(interval);
  const { start, end } = periodRange(type, anchor, normalizedInterval);
  const startDate = new Date(start);
  const lastDate = new Date(end - 1);

  if (type === "yearly") {
    if (normalizedInterval > 1) {
      return `${startDate.getFullYear()} – ${lastDate.getFullYear()}`;
    }
    return String(anchor.getFullYear());
  }
  if (type === "monthly") {
    if (normalizedInterval > 1) {
      const startLabel = startDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const endLabel = lastDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      return `${startLabel} – ${endLabel}`;
    }
    return anchor.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  if (
    normalizedInterval === 1 &&
    isCurrentPeriod("weekly", anchor, normalizedInterval)
  ) {
    return "This week";
  }
  const startLabel = startDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
  const sameMonth = startDate.getMonth() === lastDate.getMonth();
  const endLabel = lastDate.toLocaleDateString("en-US", {
    day: "numeric",
    ...(sameMonth ? {} : { month: "short" }),
  });
  return `${startLabel} – ${endLabel}`;
}
