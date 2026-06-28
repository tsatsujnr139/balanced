import { Platform } from "react-native";

export const Fonts = Platform.select({
  default: {
    mono: "monospace",
    rounded: "normal",
    sans: "normal",
    serif: "serif",
  },
  ios: {
    mono: "ui-monospace",
    rounded: "ui-rounded",
    sans: "system-ui",
    serif: "ui-serif",
  },
  web: {
    mono: "var(--font-mono)",
    rounded: "var(--font-rounded)",
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
  },
});

export const BottomTabInset = Platform.select({ android: 80, ios: 50 }) ?? 0;
export const MaxContentWidth = 800;

/** Semantic color token names backed by CSS variables in global.css. */
export type ThemeToken =
  | "background"
  | "foreground"
  | "card"
  | "muted"
  | "border"
  | "selected"
  | "primary"
  | "positive"
  | "negative";

export const themeClass: Record<ThemeToken, string> = {
  background: "bg-background",
  border: "border-border",
  card: "bg-card",
  foreground: "text-foreground",
  muted: "text-muted",
  negative: "text-negative",
  positive: "text-positive",
  primary: "text-primary",
  selected: "bg-selected",
};

export const themeTextClass: Record<ThemeToken, string> = {
  background: "text-background",
  border: "text-border",
  card: "text-card",
  foreground: "text-foreground",
  muted: "text-muted",
  negative: "text-negative",
  positive: "text-positive",
  primary: "text-primary",
  selected: "text-selected",
};
