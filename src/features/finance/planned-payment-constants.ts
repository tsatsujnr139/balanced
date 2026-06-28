import type { PlannedPaymentFrequency } from './types';

export const PLANNED_PAYMENT_FREQUENCIES: readonly PlannedPaymentFrequency[] = [
  'once',
  'weekly',
  'monthly',
  'yearly',
];

export const PLANNED_PAYMENT_FREQUENCY_LABEL: Record<PlannedPaymentFrequency, string> = {
  once: 'One time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export const DEFAULT_PLANNED_FREQUENCY: PlannedPaymentFrequency = 'monthly';

/** Accent colors for due-date states (no semantic theme tokens for amber). */
export const PLANNED_OVERDUE_COLOR = '#FF3B30';
export const PLANNED_TODAY_COLOR = '#FF9F0A';
