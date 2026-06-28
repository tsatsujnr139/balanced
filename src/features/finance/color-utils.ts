import { ACCOUNT_COLOR_OPTIONS, DEFAULT_ACCOUNT_COLOR } from '@/features/finance/account-constants';

export const DEFAULT_LABEL_COLOR = DEFAULT_ACCOUNT_COLOR;

export function pickRandomColor(): string {
  const index = Math.floor(Math.random() * ACCOUNT_COLOR_OPTIONS.length);
  return ACCOUNT_COLOR_OPTIONS[index] ?? DEFAULT_LABEL_COLOR;
}

export function normalizeColorParam(color: string | string[] | undefined): string | undefined {
  const value = Array.isArray(color) ? color[0] : color;
  return value ? decodeURIComponent(value) : undefined;
}
