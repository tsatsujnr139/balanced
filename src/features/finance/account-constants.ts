import type { AccountType } from "./types";

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: "Cash",
  current: "Current",
  general: "General",
  investment: "Investment",
  savings: "Savings",
};

export const ACCOUNT_TYPE_SYMBOL: Record<AccountType, string> = {
  cash: "banknote.fill",
  current: "building.columns.fill",
  general: "wallet.pass.fill",
  investment: "chart.line.uptrend.xyaxis",
  savings: "tray.full.fill",
};

export const DEFAULT_ACCOUNT_COLOR = "#34C7B5";

export const ACCOUNT_TYPES = [
  "general",
  "cash",
  "current",
  "savings",
  "investment",
] as const;

export const ACCOUNT_CURRENCIES = ["USD", "EUR", "GBP", "GHS"] as const;

export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

export const ACCOUNT_CURRENCY_LABEL: Record<AccountCurrency, string> = {
  EUR: "Euro",
  GBP: "British Pound",
  GHS: "Ghanaian Cedi",
  USD: "US Dollar",
};

/** Color families ordered light → medium → dark within each row. */
export const ACCOUNT_COLOR_GROUPS = [
  { colors: ["#99F6E4", "#34C7B5", "#0F766E"], id: "teal" },
  { colors: ["#BFDBFE", "#007AFF", "#1E3A8A"], id: "blue" },
  { colors: ["#BAE6FD", "#2F6BFF", "#1D4ED8"], id: "sky" },
  { colors: ["#86EFAC", "#16A34A", "#14532D"], id: "green" },
  { colors: ["#D9F99D", "#30D158", "#3F6212"], id: "lime" },
  { colors: ["#FEF08A", "#FACC15", "#A16207"], id: "yellow" },
  { colors: ["#FDE68A", "#F59E0B", "#B45309"], id: "amber" },
  { colors: ["#FED7AA", "#FF6B00", "#C2410C"], id: "orange" },
  { colors: ["#FCA5A5", "#DC2626", "#991B1B"], id: "red" },
  { colors: ["#FECDD3", "#F43F5E", "#9F1239"], id: "rose" },
  { colors: ["#FBCFE8", "#EC4899", "#9D174D"], id: "pink" },
  { colors: ["#D8B4FE", "#9333EA", "#581C87"], id: "purple" },
  { colors: ["#C7D2FE", "#6366F1", "#3730A3"], id: "indigo" },
  { colors: ["#E7D4C4", "#A2845E", "#5C4033"], id: "brown" },
  { colors: ["#E5E7EB", "#8E8E93", "#374151"], id: "grey" },
] as const;

export const ACCOUNT_COLOR_OPTIONS = ACCOUNT_COLOR_GROUPS.flatMap((group) => [
  ...group.colors,
]);
