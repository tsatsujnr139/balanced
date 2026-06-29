export type PeriodType = "weekly" | "monthly" | "yearly";

export interface PeriodRange {
  start: number;
  end: number;
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

/** Start of the period containing `anchor`, as a Date at local midnight. */
function periodStartDate(type: PeriodType, anchor: Date): Date {
  switch (type) {
    case "weekly": {
      return startOfWeek(anchor);
    }
    case "yearly": {
      return new Date(anchor.getFullYear(), 0, 1);
    }
    default: {
      return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    }
  }
}

/** Half-open [start, end) epoch-ms bounds for the period containing `anchor`. */
export function periodRange(type: PeriodType, anchor: Date): PeriodRange {
  const start = periodStartDate(type, anchor);
  let end: Date;
  switch (type) {
    case "weekly": {
      end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 7
      );
      break;
    }
    case "yearly": {
      end = new Date(start.getFullYear() + 1, 0, 1);
      break;
    }
    default: {
      end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      break;
    }
  }
  return { end: end.getTime(), start: start.getTime() };
}

/** Anchor moved one period in `dir` (-1 = previous, 1 = next). */
export function shiftPeriod(anchor: Date, type: PeriodType, dir: -1 | 1): Date {
  const start = periodStartDate(type, anchor);
  switch (type) {
    case "weekly": {
      return new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + dir * 7
      );
    }
    case "yearly": {
      return new Date(start.getFullYear() + dir, 0, 1);
    }
    default: {
      return new Date(start.getFullYear(), start.getMonth() + dir, 1);
    }
  }
}

/** Whether the period containing `anchor` is the one we're currently in. */
export function isCurrentPeriod(type: PeriodType, anchor: Date): boolean {
  const { start, end } = periodRange(type, anchor);
  const now = Date.now();
  return now >= start && now < end;
}

/** Human label for the period header, e.g. "This week", "June 2026", "2026". */
export function formatPeriodLabel(type: PeriodType, anchor: Date): string {
  if (type === "yearly") {
    return String(anchor.getFullYear());
  }
  if (type === "monthly") {
    return anchor.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  if (isCurrentPeriod("weekly", anchor)) {
    return "This week";
  }
  const { start, end } = periodRange("weekly", anchor);
  const startDate = new Date(start);
  const lastDate = new Date(end - 1);
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
