import { query } from './_generated/server';

/**
 * Returns everything the dashboard needs in a single round trip. The shape
 * mirrors the `FinanceSnapshot` type the UI consumes, so the client can swap
 * the local mock for `useQuery(api.finance.getSnapshot)` without further edits.
 */
export const getSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const [accounts, transactions, budgets] = await Promise.all([
      ctx.db.query('accounts').collect(),
      ctx.db.query('transactions').order('desc').take(10),
      ctx.db.query('budgets').collect(),
    ]);

    return {
      accounts: accounts
        .sort((a, b) => a.order - b.order)
        .map((a) => ({
          id: a._id,
          name: a.name,
          institution: a.institution,
          type: a.type,
          balance: a.balance,
          currency: a.currency,
          symbol: a.symbol,
          color: a.color,
        })),
      transactions: transactions.map((t) => ({
        id: t._id,
        accountId: t.accountId,
        merchant: t.merchant,
        category: t.category,
        amount: t.amount,
        currency: t.currency,
        date: new Date(t.date).toISOString(),
        symbol: t.symbol,
        color: t.color,
      })),
      budgets: budgets
        .sort((a, b) => a.order - b.order)
        .map((b) => ({
          id: b._id,
          name: b.name,
          spent: b.spent,
          limit: b.limit,
          currency: b.currency,
          symbol: b.symbol,
          color: b.color,
        })),
    };
  },
});
