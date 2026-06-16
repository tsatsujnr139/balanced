import { Platform } from 'react-native';

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Semantic color token names backed by CSS variables in global.css. */
export type ThemeToken =
  | 'background'
  | 'foreground'
  | 'card'
  | 'muted'
  | 'border'
  | 'selected'
  | 'primary'
  | 'positive'
  | 'negative';

export const themeClass: Record<ThemeToken, string> = {
  background: 'bg-background',
  foreground: 'text-foreground',
  card: 'bg-card',
  muted: 'text-muted',
  border: 'border-border',
  selected: 'bg-selected',
  primary: 'text-primary',
  positive: 'text-positive',
  negative: 'text-negative',
};

export const themeTextClass: Record<ThemeToken, string> = {
  background: 'text-background',
  foreground: 'text-foreground',
  card: 'text-card',
  muted: 'text-muted',
  border: 'text-border',
  selected: 'text-selected',
  primary: 'text-primary',
  positive: 'text-positive',
  negative: 'text-negative',
};
