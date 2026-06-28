import type { BudgetPeriod } from './types';

export const BUDGET_PERIODS: readonly BudgetPeriod[] = [
  'weekly',
  'monthly',
  'yearly',
  'one_time',
];

export const BUDGET_PERIOD_LABEL: Record<BudgetPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  one_time: 'One time',
};

/** Display order for grouping budgets by period. */
export const BUDGET_PERIOD_ORDER: Record<BudgetPeriod, number> = {
  weekly: 0,
  monthly: 1,
  yearly: 2,
  one_time: 3,
};

export const DEFAULT_BUDGET_PERIOD: BudgetPeriod = 'monthly';
export const DEFAULT_BUDGET_SYMBOL = 'dollarsign.circle.fill';
export const DEFAULT_BUDGET_COLOR = '#34C759';

/** Amber accent for budgets nearing their limit (no semantic theme token). */
export const BUDGET_WARNING_COLOR = '#FF9F0A';
