import type { BudgetPeriod } from "./types";

export const BUDGET_PERIODS: readonly BudgetPeriod[] = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "one_time",
];

export const BUDGET_PERIOD_LABEL: Record<BudgetPeriod, string> = {
  monthly: "Monthly",
  one_time: "One time",
  quarterly: "Quarterly",
  weekly: "Weekly",
  yearly: "Yearly",
};

/** Display order for grouping budgets by period. */
export const BUDGET_PERIOD_ORDER: Record<BudgetPeriod, number> = {
  monthly: 1,
  one_time: 4,
  quarterly: 2,
  weekly: 0,
  yearly: 3,
};

export const DEFAULT_BUDGET_PERIOD: BudgetPeriod = "monthly";
export const DEFAULT_BUDGET_PERIOD_INTERVAL = 1;
export const DEFAULT_BUDGET_SYMBOL = "dollarsign.circle.fill";
export const DEFAULT_BUDGET_COLOR = "#34C759";

export const BUDGET_PERIOD_UNIT_LABEL: Record<
  Exclude<BudgetPeriod, "one_time">,
  { plural: string; singular: string }
> = {
  monthly: { plural: "months", singular: "month" },
  quarterly: { plural: "quarters", singular: "quarter" },
  weekly: { plural: "weeks", singular: "week" },
  yearly: { plural: "years", singular: "year" },
};

export function formatBudgetPeriodLabel(
  period: BudgetPeriod,
  interval: number
): string {
  if (period === "one_time") {
    return BUDGET_PERIOD_LABEL.one_time;
  }
  if (interval === 1) {
    return BUDGET_PERIOD_LABEL[period];
  }
  return `Every ${interval} ${BUDGET_PERIOD_UNIT_LABEL[period].plural}`;
}

/** Amber accent for budgets nearing their limit (no semantic theme token). */
export const BUDGET_WARNING_COLOR = "#FF9F0A";
