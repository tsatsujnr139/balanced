import { mutation } from './_generated/server';

const DAY = 86_400_000;

/** Deletes all tags and transaction-tag links. Run: npx convex run seed:clearAllTags */
export const clearAllTags = mutation({
  args: {},
  handler: async (ctx) => {
    const transactionTags = await ctx.db.query('transactionTags').collect();
    for (const row of transactionTags) {
      await ctx.db.delete(row._id);
    }

    const tags = await ctx.db.query('tags').collect();
    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }

    return { deletedTags: tags.length, deletedLinks: transactionTags.length };
  },
});

/**
 * Populates the database with demo finance data. Run once from the dashboard:
 *   npx convex run seed:seedDemo
 * Safe to re-run: it clears existing rows first.
 */
export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    for (const table of [
      'transactions',
      'accounts',
      'profiles',
      'budgets',
      'plannedPayments',
      'plannedPaymentEntries',
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    }

    const now = Date.now();

    const everyday = await ctx.db.insert('accounts', {
      name: 'Everyday',
      institution: 'Chase',
      type: 'current',
      balance: 482_355,
      currency: 'GHS',
      symbol: 'creditcard.fill',
      color: '#2F6BFF',
      order: 0,
    });
    const savings = await ctx.db.insert('accounts', {
      name: 'Rainy Day',
      institution: 'Ally',
      type: 'savings',
      balance: 1_864_200,
      currency: 'GHS',
      symbol: 'banknote.fill',
      color: '#16A34A',
      order: 1,
    });
    await ctx.db.insert('accounts', {
      name: 'Brokerage',
      institution: 'Fidelity',
      type: 'investment',
      balance: 3_421_780,
      currency: 'GHS',
      symbol: 'chart.line.uptrend.xyaxis',
      color: '#9333EA',
      order: 2,
    });
    const credit = await ctx.db.insert('accounts', {
      name: 'Sapphire',
      institution: 'Chase',
      type: 'general',
      balance: -128_940,
      currency: 'GHS',
      symbol: 'creditcard.circle.fill',
      color: '#DC2626',
      order: 3,
    });
    await ctx.db.insert('accounts', {
      name: 'Wallet',
      institution: 'Cash',
      type: 'cash',
      balance: 24_000,
      currency: 'GHS',
      symbol: 'dollarsign.circle.fill',
      color: '#F59E0B',
      order: 4,
    });

    const transactions = [
      { accountId: credit, merchant: 'Whole Foods', category: 'Groceries', amount: -8_432, date: now, symbol: 'cart.fill', color: '#16A34A' },
      { accountId: everyday, merchant: 'Acme Payroll', category: 'Income', amount: 412_500, date: now - 4 * 3_600_000, symbol: 'arrow.down.circle.fill', color: '#16A34A' },
      { accountId: credit, merchant: 'Uber', category: 'Transport', amount: -1_870, date: now - DAY, symbol: 'car.fill', color: '#2563EB' },
      { accountId: credit, merchant: 'Netflix', category: 'Subscriptions', amount: -1_599, date: now - 2 * DAY, symbol: 'play.tv.fill', color: '#DC2626' },
      { accountId: everyday, merchant: 'Blue Bottle', category: 'Coffee', amount: -640, date: now - 3 * DAY, symbol: 'cup.and.saucer.fill', color: '#B45309' },
      { accountId: savings, merchant: 'Transfer to Savings', category: 'Transfer', amount: 50_000, date: now - 4 * DAY, symbol: 'arrow.left.arrow.right', color: '#6366F1' },
    ];
    for (const t of transactions) {
      await ctx.db.insert('transactions', { ...t, currency: 'GHS' });
    }

    const budgets = [
      { name: 'Groceries', category: 'Groceries', limit: 60_000, symbol: 'cart.fill', color: '#16A34A', order: 0 },
      { name: 'Dining out', category: 'Coffee', limit: 35_000, symbol: 'fork.knife', color: '#F59E0B', order: 1 },
      { name: 'Transport', category: 'Transport', limit: 25_000, symbol: 'car.fill', color: '#2563EB', order: 2 },
      { name: 'Subscriptions', category: 'Subscriptions', limit: 2_000, symbol: 'repeat.circle.fill', color: '#DC2626', order: 3 },
    ];
    for (const b of budgets) {
      await ctx.db.insert('budgets', {
        ...b,
        currency: 'GHS',
        period: 'monthly',
        notifyOnOverspend: true,
        notifyAtThreshold: true,
      });
    }

    const plannedPayments = [
      {
        name: 'Spotify Subscription',
        description: 'Spotify',
        accountId: everyday,
        category: 'Subscriptions',
        categorySymbol: 'repeat.circle.fill',
        categoryColor: '#1DB954',
        amount: 4_300,
        type: 'expense' as const,
        startDate: now - 95 * DAY,
        frequency: 'monthly' as const,
        interval: 1,
        order: 0,
      },
      {
        name: "Vicki's Insurance",
        description: 'Prudential Life',
        accountId: everyday,
        category: 'Insurance',
        categorySymbol: 'shield.fill',
        categoryColor: '#34C7B5',
        amount: 35_294,
        type: 'expense' as const,
        startDate: now - 135 * DAY,
        frequency: 'monthly' as const,
        interval: 1,
        order: 1,
      },
      {
        name: 'Salary',
        description: 'Acme Payroll',
        accountId: everyday,
        category: 'Income',
        categorySymbol: 'banknote.fill',
        categoryColor: '#34C759',
        amount: 412_500,
        type: 'income' as const,
        startDate: now + 6 * DAY,
        frequency: 'monthly' as const,
        interval: 1,
        order: 2,
      },
    ];
    for (const p of plannedPayments) {
      await ctx.db.insert('plannedPayments', {
        ...p,
        currency: 'GHS',
        tagIds: [],
        notifyOnDue: true,
        notifyOnOverdue: true,
      });
    }

    return { ok: true };
  },
});
