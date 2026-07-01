import { useQuery } from "convex/react";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useMemo } from "react";

import { api } from "../../../convex/_generated/api";
import { DEFAULT_CURRENCY } from "./format";
import type { FinanceSnapshot } from "./types";

export interface CurrencyBalance {
  currency: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export type FinanceData = FinanceSnapshot & {
  /** Per-currency net worth, assets, and liabilities. */
  balanceByCurrency: CurrencyBalance[];
  isLoading: boolean;
  isRefreshing: boolean;
};

const FINANCE_CACHE_KEY = "finance.snapshot.v1";
const FINANCE_CACHE_VERSION = 5;
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
    const currencyMap = new Map<
      string,
      { assets: number; liabilities: number }
    >();

    for (const account of snapshot.accounts) {
      const { currency, balance } = account;
      if (!currencyMap.has(currency)) {
        currencyMap.set(currency, { assets: 0, liabilities: 0 });
      }
      const entry = currencyMap.get(currency)!;
      if (balance > 0) {
        entry.assets += balance;
      } else if (balance < 0) {
        entry.liabilities += Math.abs(balance);
      }
    }

    const entries = [...currencyMap.entries()]
      .map(([currency, { assets, liabilities }]) => ({
        currency,
        netWorth: assets - liabilities,
        totalAssets: assets,
        totalLiabilities: liabilities,
      }))
      .sort((a, b) => {
        if (a.currency === DEFAULT_CURRENCY) {
          return -1;
        }
        if (b.currency === DEFAULT_CURRENCY) {
          return 1;
        }
        return a.currency.localeCompare(b.currency);
      });

    const balanceByCurrency: CurrencyBalance[] =
      entries.length > 0
        ? entries
        : [
            {
              currency: DEFAULT_CURRENCY,
              netWorth: 0,
              totalAssets: 0,
              totalLiabilities: 0,
            },
          ];

    return {
      ...snapshot,
      balanceByCurrency,
      isLoading: convexSnapshot === undefined && cachedSnapshot === null,
      isRefreshing: convexSnapshot === undefined && cachedSnapshot !== null,
    };
  }, [convexSnapshot, snapshot]);
}
