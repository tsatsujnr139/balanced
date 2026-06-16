import type { FinanceSnapshot } from './types';

function daysAgo(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/**
 * Local sample data used to build out the UI. This mirrors the shape returned by
 * the Convex `finance.getSnapshot` query so it can be swapped in later with no
 * changes to the screens.
 */
export const mockSnapshot: FinanceSnapshot = {
  accounts: [
    {
      id: 'acc_checking',
      name: 'Everyday',
      institution: 'Chase',
      type: 'checking',
      balance: 482_355,
      currency: 'GHS',
      symbol: 'creditcard.fill',
      color: '#2F6BFF',
    },
    {
      id: 'acc_savings',
      name: 'Rainy Day',
      institution: 'Ally',
      type: 'savings',
      balance: 1_864_200,
      currency: 'GHS',
      symbol: 'banknote.fill',
      color: '#16A34A',
    },
    {
      id: 'acc_invest',
      name: 'Brokerage',
      institution: 'Fidelity',
      type: 'investment',
      balance: 3_421_780,
      currency: 'GHS',
      symbol: 'chart.line.uptrend.xyaxis',
      color: '#9333EA',
    },
    {
      id: 'acc_credit',
      name: 'Sapphire',
      institution: 'Chase',
      type: 'credit',
      balance: -128_940,
      currency: 'GHS',
      symbol: 'creditcard.circle.fill',
      color: '#DC2626',
    },
    {
      id: 'acc_cash',
      name: 'Wallet',
      institution: 'Cash',
      type: 'cash',
      balance: 24_000,
      currency: 'GHS',
      symbol: 'dollarsign.circle.fill',
      color: '#F59E0B',
    },
  ],
  transactions: [
    {
      id: 'txn_1',
      accountId: 'acc_credit',
      merchant: 'Whole Foods',
      category: 'Groceries',
      amount: -8_432,
      currency: 'GHS',
      date: daysAgo(0, 18),
      symbol: 'cart.fill',
      color: '#16A34A',
    },
    {
      id: 'txn_2',
      accountId: 'acc_checking',
      merchant: 'Acme Payroll',
      category: 'Income',
      amount: 412_500,
      currency: 'GHS',
      date: daysAgo(0, 8),
      symbol: 'arrow.down.circle.fill',
      color: '#16A34A',
    },
    {
      id: 'txn_3',
      accountId: 'acc_credit',
      merchant: 'Uber',
      category: 'Transport',
      amount: -1_870,
      currency: 'GHS',
      date: daysAgo(1, 21),
      symbol: 'car.fill',
      color: '#2563EB',
    },
    {
      id: 'txn_4',
      accountId: 'acc_credit',
      merchant: 'Netflix',
      category: 'Subscriptions',
      amount: -1_599,
      currency: 'GHS',
      date: daysAgo(2, 6),
      symbol: 'play.tv.fill',
      color: '#DC2626',
    },
    {
      id: 'txn_5',
      accountId: 'acc_checking',
      merchant: 'Blue Bottle',
      category: 'Coffee',
      amount: -640,
      currency: 'GHS',
      date: daysAgo(3, 10),
      symbol: 'cup.and.saucer.fill',
      color: '#B45309',
    },
    {
      id: 'txn_6',
      accountId: 'acc_savings',
      merchant: 'Transfer to Savings',
      category: 'Transfer',
      amount: 50_000,
      currency: 'GHS',
      date: daysAgo(4, 12),
      symbol: 'arrow.left.arrow.right',
      color: '#6366F1',
    },
  ],
  budgets: [
    {
      id: 'bud_groceries',
      name: 'Groceries',
      spent: 42_300,
      limit: 60_000,
      currency: 'GHS',
      symbol: 'cart.fill',
      color: '#16A34A',
    },
    {
      id: 'bud_dining',
      name: 'Dining out',
      spent: 31_800,
      limit: 35_000,
      currency: 'GHS',
      symbol: 'fork.knife',
      color: '#F59E0B',
    },
    {
      id: 'bud_transport',
      name: 'Transport',
      spent: 9_400,
      limit: 25_000,
      currency: 'GHS',
      symbol: 'car.fill',
      color: '#2563EB',
    },
    {
      id: 'bud_fun',
      name: 'Entertainment',
      spent: 22_100,
      limit: 20_000,
      currency: 'GHS',
      symbol: 'gamecontroller.fill',
      color: '#DC2626',
    },
  ],
};
