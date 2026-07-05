import type { AndroidSymbol, SFSymbol } from "expo-symbols";

/**
 * Android Material Symbol equivalents of the SF Symbols used in native header
 * and toolbar buttons.
 */
export const MaterialIcons: Record<
  "add" | "check" | "chevronLeft" | "close" | "notifications" | "search",
  { ios: SFSymbol; android: AndroidSymbol; offsetY?: number; size?: number }
> = {
  add: {
    android: "add",
    ios: "plus",
  },
  check: {
    android: "check",
    ios: "checkmark",
    offsetY: 2,
    size: 30,
  },
  chevronLeft: {
    android: "chevron_left",
    ios: "chevron.left",
  },
  close: {
    android: "close",
    ios: "xmark",
    offsetY: 3,
    size: 30,
  },
  notifications: {
    android: "notifications",
    ios: "bell",
  },
  search: {
    android: "search",
    ios: "magnifyingglass",
  },
};
