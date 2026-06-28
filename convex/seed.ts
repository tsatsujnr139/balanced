import { mutation } from "./_generated/server";

const DAY = 86_400_000;

/** Deletes all tags and transaction-tag links. Run: npx convex run seed:clearAllTags */
export const clearAllTags = mutation({
  args: {},
  handler: async (ctx) => {
    const transactionTags = await ctx.db.query("transactionTags").collect();
    for (const row of transactionTags) {
      await ctx.db.delete(row._id);
    }

    const tags = await ctx.db.query("tags").collect();
    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }

    return { deletedLinks: transactionTags.length, deletedTags: tags.length };
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
      "transactions",
      "accounts",
      "profiles",
      "budgets",
      "plannedPayments",
      "plannedPaymentEntries",
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    }

    const now = Date.now();

    const everyday = await ctx.db.insert("accounts", {
      balance: 482_355,
      color: "#2F6BFF",
      currency: "GHS",
      institution: "Chase",
      name: "Everyday",
      order: 0,
      symbol: "creditcard.fill",
      type: "current",
    });
    const savings = await ctx.db.insert("accounts", {
      balance: 1_864_200,
      color: "#16A34A",
      currency: "GHS",
      institution: "Ally",
      name: "Rainy Day",
      order: 1,
      symbol: "banknote.fill",
      type: "savings",
    });
    await ctx.db.insert("accounts", {
      balance: 3_421_780,
      color: "#9333EA",
      currency: "GHS",
      institution: "Fidelity",
      name: "Brokerage",
      order: 2,
      symbol: "chart.line.uptrend.xyaxis",
      type: "investment",
    });
    const credit = await ctx.db.insert("accounts", {
      balance: -128_940,
      color: "#DC2626",
      currency: "GHS",
      institution: "Chase",
      name: "Sapphire",
      order: 3,
      symbol: "creditcard.circle.fill",
      type: "general",
    });
    await ctx.db.insert("accounts", {
      balance: 24_000,
      color: "#F59E0B",
      currency: "GHS",
      institution: "Cash",
      name: "Wallet",
      order: 4,
      symbol: "dollarsign.circle.fill",
      type: "cash",
    });

    const transactions = [
      {
        accountId: credit,
        amount: -8432,
        category: "Groceries",
        color: "#16A34A",
        date: now,
        merchant: "Whole Foods",
        symbol: "cart.fill",
      },
      {
        accountId: everyday,
        amount: 412_500,
        category: "Income",
        color: "#16A34A",
        date: now - 4 * 3_600_000,
        merchant: "Acme Payroll",
        symbol: "arrow.down.circle.fill",
      },
      {
        accountId: credit,
        amount: -1870,
        category: "Transport",
        color: "#2563EB",
        date: now - DAY,
        merchant: "Uber",
        symbol: "car.fill",
      },
      {
        accountId: credit,
        amount: -1599,
        category: "Subscriptions",
        color: "#DC2626",
        date: now - 2 * DAY,
        merchant: "Netflix",
        symbol: "play.tv.fill",
      },
      {
        accountId: everyday,
        amount: -640,
        category: "Coffee",
        color: "#B45309",
        date: now - 3 * DAY,
        merchant: "Blue Bottle",
        symbol: "cup.and.saucer.fill",
      },
      {
        accountId: savings,
        amount: 50_000,
        category: "Transfer",
        color: "#6366F1",
        date: now - 4 * DAY,
        merchant: "Transfer to Savings",
        symbol: "arrow.left.arrow.right",
      },
    ];
    for (const t of transactions) {
      await ctx.db.insert("transactions", { ...t, currency: "GHS" });
    }

    const budgets = [
      {
        category: "Groceries",
        color: "#16A34A",
        limit: 60_000,
        name: "Groceries",
        order: 0,
        symbol: "cart.fill",
      },
      {
        category: "Coffee",
        color: "#F59E0B",
        limit: 35_000,
        name: "Dining out",
        order: 1,
        symbol: "fork.knife",
      },
      {
        category: "Transport",
        color: "#2563EB",
        limit: 25_000,
        name: "Transport",
        order: 2,
        symbol: "car.fill",
      },
      {
        category: "Subscriptions",
        color: "#DC2626",
        limit: 2000,
        name: "Subscriptions",
        order: 3,
        symbol: "repeat.circle.fill",
      },
    ];
    for (const b of budgets) {
      await ctx.db.insert("budgets", {
        ...b,
        currency: "GHS",
        notifyAtThreshold: true,
        notifyOnOverspend: true,
        period: "monthly",
      });
    }

    const plannedPayments = [
      {
        accountId: everyday,
        amount: 4300,
        category: "Subscriptions",
        categoryColor: "#1DB954",
        categorySymbol: "repeat.circle.fill",
        description: "Spotify",
        frequency: "monthly" as const,
        interval: 1,
        name: "Spotify Subscription",
        order: 0,
        startDate: now - 95 * DAY,
        type: "expense" as const,
      },
      {
        accountId: everyday,
        amount: 35_294,
        category: "Insurance",
        categoryColor: "#34C7B5",
        categorySymbol: "shield.fill",
        description: "Prudential Life",
        frequency: "monthly" as const,
        interval: 1,
        name: "Vicki's Insurance",
        order: 1,
        startDate: now - 135 * DAY,
        type: "expense" as const,
      },
      {
        accountId: everyday,
        amount: 412_500,
        category: "Income",
        categoryColor: "#34C759",
        categorySymbol: "banknote.fill",
        description: "Acme Payroll",
        frequency: "monthly" as const,
        interval: 1,
        name: "Salary",
        order: 2,
        startDate: now + 6 * DAY,
        type: "income" as const,
      },
    ];
    for (const p of plannedPayments) {
      await ctx.db.insert("plannedPayments", {
        ...p,
        currency: "GHS",
        notifyOnDue: true,
        notifyOnOverdue: true,
        tagIds: [],
      });
    }

    return { ok: true };
  },
});
