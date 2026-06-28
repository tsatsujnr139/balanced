import { useQuery } from "convex/react";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useMemo } from "react";

import { api } from "../../../convex/_generated/api";
import type { FinanceSnapshot } from "./types";

export type FinanceData = FinanceSnapshot & {
  /** Net worth across all accounts in minor units (cents). */
  netWorth: number;
  /** Sum of positive (asset) balances in minor units. */
  totalAssets: number;
  /** Absolute sum of negative (liability) balances in minor units. */
  totalLiabilities: number;
  isLoading: boolean;
  isRefreshing: boolean;
};

const FINANCE_CACHE_KEY = "finance.snapshot.v1";
const FINANCE_CACHE_VERSION = 4;
const EMPTY_SNAPSHOT: FinanceSnapshot = {
  accounts: [],
  budgets: [],
  plannedPaymentsOverdueCount: 0,
  transactions: [],
};

interface CachedFinanceSnapshot {
  version: typeof FINANCE_CACHE_VERSION;
  savedAt: number;
  snapshot: FinanceSnapshot;
}

function isFinanceSnapshot(value: unknown): value is FinanceSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<FinanceSnapshot>;
  return (
    Array.isArray(snapshot.accounts) &&
    Array.isArray(snapshot.transactions) &&
    Array.isArray(snapshot.budgets)
  );
}

function readCachedSnapshot(): FinanceSnapshot | null {
  try {
    const serialized = Storage.getItemSync(FINANCE_CACHE_KEY);
    if (!serialized) {
      return null;
    }

    const cached = JSON.parse(serialized) as Partial<CachedFinanceSnapshot>;
    if (
      cached.version !== FINANCE_CACHE_VERSION ||
      !isFinanceSnapshot(cached.snapshot)
    ) {
      Storage.removeItemSync(FINANCE_CACHE_KEY);
      return null;
    }

    return cached.snapshot;
  } catch {
    return null;
  }
}

let cachedSnapshot = readCachedSnapshot();

export function useFinance(): FinanceData {
  const convexSnapshot = useQuery(api.finance.getSnapshot);
  const snapshot: FinanceSnapshot =
    convexSnapshot ?? cachedSnapshot ?? EMPTY_SNAPSHOT;

  useEffect(() => {
    if (convexSnapshot === undefined) {
      return;
    }

    cachedSnapshot = convexSnapshot;
    const value: CachedFinanceSnapshot = {
      savedAt: Date.now(),
      snapshot: convexSnapshot,
      version: FINANCE_CACHE_VERSION,
    };

    void Storage.setItem(FINANCE_CACHE_KEY, JSON.stringify(value)).catch(() => {
      /* empty */
    });
  }, [convexSnapshot]);

  return useMemo(() => {
    const totalAssets = snapshot.accounts
      .filter((a) => a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = snapshot.accounts
      .filter((a) => a.balance < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    return {
      ...snapshot,
      isLoading: convexSnapshot === undefined && cachedSnapshot === null,
      isRefreshing: convexSnapshot === undefined && cachedSnapshot !== null,
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
    };
  }, [convexSnapshot, snapshot]);
}
