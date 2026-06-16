import { useMemo } from 'react';

import { mockSnapshot } from './mock-data';
import type { FinanceSnapshot } from './types';

export type FinanceData = FinanceSnapshot & {
  /** Net worth across all accounts in minor units (cents). */
  netWorth: number;
  /** Sum of positive (asset) balances in minor units. */
  totalAssets: number;
  /** Absolute sum of negative (liability) balances in minor units. */
  totalLiabilities: number;
  isLoading: boolean;
};

/**
 * Single source of finance data for the UI.
 *
 * Currently returns local sample data so we can build out the screens. When the
 * Convex backend is wired up, replace the body with:
 *
 *   const snapshot = useQuery(api.finance.getSnapshot);
 *
 * The returned shape (`FinanceSnapshot`) is intentionally identical, so the
 * screens won't need to change.
 */
export function useFinance(): FinanceData {
  const snapshot: FinanceSnapshot = mockSnapshot;

  return useMemo(() => {
    const totalAssets = snapshot.accounts
      .filter((a) => a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = snapshot.accounts
      .filter((a) => a.balance < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    return {
      ...snapshot,
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      isLoading: false,
    };
  }, [snapshot]);
}
