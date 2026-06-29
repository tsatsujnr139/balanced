import { useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "../../../convex/_generated/api";
import { DEFAULT_CURRENCY } from "./format";
import type { PeriodType } from "./period";
import { periodRange, shiftPeriod } from "./period";

export interface SpendingGroup {
  key: string;
  label: string;
  color: string;
  symbol: string;
  amount: number;
  count: number;
}

export interface TrendBucket {
  label: string;
  amount: number;
}

export interface BudgetPerformance {
  id: string;
  name: string;
  color: string;
  symbol: string;
  limit: number;
  spent: number;
  currency: string;
}

export interface SpendingStats {
  currency: string;
  totalSpent: number;
  previousTotalSpent: number;
  totalIncome: number;
  previousTotalIncome: number;
  transactionCount: number;
  categories: SpendingGroup[];
  tags: SpendingGroup[];
  trend: TrendBucket[];
  budgets: BudgetPerformance[];
}

export interface StatsData {
  stats: SpendingStats;
  isLoading: boolean;
}

function emptyStats(currency: string): SpendingStats {
  return {
    budgets: [],
    categories: [],
    currency,
    previousTotalIncome: 0,
    previousTotalSpent: 0,
    tags: [],
    totalIncome: 0,
    totalSpent: 0,
    transactionCount: 0,
    trend: [],
  };
}

/** Currency used by the most accounts, defaulting to GHS. */
export function resolvePrimaryCurrency(currencies: string[]): string {
  if (currencies.length === 0) {
    return DEFAULT_CURRENCY;
  }
  const counts = new Map<string, number>();
  for (const currency of currencies) {
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }
  let best = DEFAULT_CURRENCY;
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

export function useStats(
  periodType: PeriodType,
  anchor: Date,
  currency: string
): StatsData {
  const { start, end, prevStart, prevEnd } = useMemo(() => {
    const current = periodRange(periodType, anchor);
    const previous = periodRange(
      periodType,
      shiftPeriod(anchor, periodType, -1)
    );
    return {
      end: current.end,
      prevEnd: previous.end,
      prevStart: previous.start,
      start: current.start,
    };
  }, [periodType, anchor]);

  const stats = useQuery(api.finance.getSpendingStats, {
    currency,
    end,
    periodType,
    prevEnd,
    prevStart,
    start,
  });

  return {
    isLoading: stats === undefined,
    stats: stats ?? emptyStats(currency),
  };
}
