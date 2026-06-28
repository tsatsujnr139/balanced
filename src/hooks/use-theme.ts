import { useCSSVariable } from "uniwind";

import type { ThemeToken } from "@/constants/theme";

const TOKEN_VARS: Record<ThemeToken, `--color-${string}`> = {
  background: "--color-background",
  border: "--color-border",
  card: "--color-card",
  foreground: "--color-foreground",
  muted: "--color-muted",
  negative: "--color-negative",
  positive: "--color-positive",
  primary: "--color-primary",
  selected: "--color-selected",
};

/**
 * Resolves semantic theme tokens to their current CSS variable values.
 * Use for APIs that need raw colors (SymbolView tintColor, native tab bar props, etc.).
 */
export function useThemeColors() {
  const [
    background,
    foreground,
    card,
    muted,
    border,
    selected,
    primary,
    positive,
    negative,
  ] = useCSSVariable([
    TOKEN_VARS.background,
    TOKEN_VARS.foreground,
    TOKEN_VARS.card,
    TOKEN_VARS.muted,
    TOKEN_VARS.border,
    TOKEN_VARS.selected,
    TOKEN_VARS.primary,
    TOKEN_VARS.positive,
    TOKEN_VARS.negative,
  ]);

  return {
    background: background as string,
    border: border as string,
    card: card as string,
    foreground: foreground as string,
    muted: muted as string,
    negative: negative as string,
    positive: positive as string,
    primary: primary as string,
    selected: selected as string,
  };
}

/** @deprecated Use className with semantic tokens or useThemeColors() instead. */
export function useTheme() {
  return useThemeColors();
}
