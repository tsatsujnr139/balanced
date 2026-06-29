import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";

const DAY = 86_400_000;

const DEFAULT_CATEGORIES = [
  {
    color: "#34C759",
    name: "Groceries",
    symbol: "cart.fill",
  },
  {
    color: "#AF52DE",
    name: "Grooming",
    symbol: "scissors",
  },
  {
    color: "#FF9500",
    name: "Eating Out",
    symbol: "fork.knife",
  },
  {
    color: "#A2845E",
    name: "Fuel",
    symbol: "fuelpump.fill",
  },
  {
    color: "#0A84FF",
    name: "Transportation",
    symbol: "bus.fill",
  },
  {
    color: "#5E5CE6",
    name: "Subscriptions",
    symbol: "repeat.circle.fill",
  },
  {
    color: "#30B05A",
    name: "Fitness",
    symbol: "figure.run",
  },
  {
    color: "#8E8E93",
    name: "Miscell",
    symbol: "square.grid.2x2.fill",
  },
  {
    color: "#FF2D55",
    name: "Charity & Gifts",
    symbol: "gift.fill",
  },
  {
    color: "#FF3B30",
    name: "Health & Wellness",
    symbol: "heart.fill",
  },
  {
    color: "#8E6B48",
    name: "Home Maintenance",
    symbol: "hammer.fill",
  },
  {
    color: "#BF5AF2",
    name: "Home Improvement",
    symbol: "paintbrush.fill",
  },
  {
    color: "#5AC8FA",
    name: "Work & Career",
    symbol: "briefcase.fill",
  },
  {
    color: "#5856D6",
    name: "Education",
    symbol: "graduationcap.fill",
  },
  {
    color: "#00A7A5",
    name: "Travel",
    symbol: "airplane",
  },
  {
    color: "#636366",
    name: "Vehicle Maintenance",
    symbol: "wrench.and.screwdriver.fill",
  },
  {
    color: "#007AFF",
    name: "Vehicle Insurance",
    symbol: "car.fill",
  },
  {
    color: "#00A86B",
    name: "Savings & Investment",
    symbol: "chart.line.uptrend.xyaxis",
  },
  {
    color: "#FF375F",
    name: "Clothing",
    symbol: "tshirt.fill",
  },
  {
    color: "#FF9F0A",
    name: "Outing",
    symbol: "ticket.fill",
  },
  {
    color: "#8E8E93",
    name: "Transaction charges",
    symbol: "creditcard.fill",
  },
  {
    color: "#AC8E68",
    name: "Ministry",
    symbol: "building.columns.fill",
  },
  {
    color: "#64D2FF",
    name: "Lending",
    symbol: "person.2.fill",
  },
  {
    color: "#30D158",
    name: "Refunds",
    symbol: "arrow.uturn.left.circle.fill",
  },
  {
    color: "#32D74B",
    name: "Interest & Dividends",
    symbol: "percent",
  },
  {
    color: "#34C759",
    name: "Salary",
    symbol: "banknote.fill",
  },
  {
    color: "#30B05A",
    name: "Income",
    symbol: "arrow.down.circle.fill",
  },
  {
    color: "#FF2D55",
    name: "Gifts",
    symbol: "gift.fill",
  },
  {
    color: "#007AFF",
    name: "Insurance",
    symbol: "shield.fill",
  },
  {
    color: "#5856D6",
    name: "Rent",
    symbol: "house.fill",
  },
  {
    color: "#FFCC00",
    name: "Electricity",
    symbol: "bolt.fill",
  },
  {
    color: "#0A84FF",
    name: "Water",
    symbol: "drop.fill",
  },
  {
    color: "#FF6B00",
    name: "Gas",
    symbol: "flame.fill",
  },
  {
    color: "#5E5CE6",
    name: "Internet",
    symbol: "network",
  },
  {
    color: "#30B05A",
    name: "Airtime",
    symbol: "phone.fill",
  },
  {
    color: "#007AFF",
    name: "Data",
    symbol: "antenna.radiowaves.left.and.right",
  },
] as const;

const normalizeLookupName = (name: string) => name.trim().toLocaleLowerCase();

const CATEGORY_META: Record<string, { color: string; symbol: string }> =
  Object.fromEntries(
    DEFAULT_CATEGORIES.map((category) => [
      category.name,
      { color: category.color, symbol: category.symbol },
    ])
  );

interface SeedSpend {
  category: string;
  merchant: string;
  major: number;
}

// Expenses (cedis) for the current month — varied categories and sizes.
const THIS_MONTH_SPEND: SeedSpend[] = [
  { category: "Groceries", major: 320, merchant: "Whole Foods" },
  { category: "Groceries", major: 145.5, merchant: "Marina Market" },
  { category: "Eating Out", major: 88, merchant: "Burger Joint" },
  { category: "Fuel", major: 410, merchant: "Shell" },
  { category: "Transportation", major: 64.2, merchant: "Uber" },
  { category: "Subscriptions", major: 55, merchant: "Netflix" },
  { category: "Health & Wellness", major: 120, merchant: "Pharmacy" },
  { category: "Clothing", major: 230, merchant: "Zara" },
];

// Expenses (cedis) for the previous month — different totals to show a delta.
const LAST_MONTH_SPEND: SeedSpend[] = [
  { category: "Groceries", major: 280, merchant: "Whole Foods" },
  { category: "Groceries", major: 90, merchant: "Corner Shop" },
  { category: "Eating Out", major: 150, merchant: "Sushi Place" },
  { category: "Fuel", major: 380, merchant: "Total" },
  { category: "Transportation", major: 95, merchant: "Bolt" },
  { category: "Subscriptions", major: 43, merchant: "Spotify" },
  { category: "Education", major: 200, merchant: "Udemy" },
  { category: "Outing", major: 75, merchant: "Cinema" },
];

const SEED_SPEND_DAYS = [3, 5, 9, 12, 15, 18, 22, 25];

/**
 * Adds categorized expenses across this month and last month so the stats
 * screen has data to visualize. Does NOT clear existing rows — additive only.
 * Run: npx convex run seed:seedStatsTransactions
 */
export const seedStatsTransactions = mutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    let accountId =
      accounts.find((account) => account.currency === "GHS")?._id ??
      accounts[0]?._id;
    if (!accountId) {
      accountId = await ctx.db.insert("accounts", {
        balance: 482_355,
        color: "#2F6BFF",
        currency: "GHS",
        institution: "Chase",
        name: "Everyday",
        order: 0,
        symbol: "creditcard.fill",
        type: "current",
      });
    }

    const now = new Date();
    const salaryMeta = CATEGORY_META.Income ?? {
      color: "#30B05A",
      symbol: "arrow.down.circle.fill",
    };

    const insertMonth = async (monthOffset: number, spend: SeedSpend[]) => {
      const year = now.getFullYear();
      const month = now.getMonth() + monthOffset;
      const isCurrentMonth = monthOffset === 0;
      for (const [index, entry] of spend.entries()) {
        const day = SEED_SPEND_DAYS[index] ?? index + 1;
        // Keep current-month entries in the past, not the future.
        const clampedDay = isCurrentMonth ? Math.min(day, now.getDate()) : day;
        const meta = CATEGORY_META[entry.category] ?? {
          color: "#8E8E93",
          symbol: "square.grid.2x2.fill",
        };
        await ctx.db.insert("transactions", {
          accountId,
          amount: -Math.round(entry.major * 100),
          category: entry.category,
          color: meta.color,
          currency: "GHS",
          date: new Date(year, month, clampedDay, 12).getTime(),
          merchant: entry.merchant,
          symbol: meta.symbol,
          transactionKind: "expense",
        });
      }

      // One income per month — should be excluded from spend stats.
      await ctx.db.insert("transactions", {
        accountId,
        amount: 412_500,
        category: "Income",
        color: salaryMeta.color,
        currency: "GHS",
        date: new Date(year, month, 1, 9).getTime(),
        merchant: "Acme Payroll",
        symbol: salaryMeta.symbol,
        transactionKind: "income",
      });
    };

    await insertMonth(0, THIS_MONTH_SPEND);
    await insertMonth(-1, LAST_MONTH_SPEND);

    return {
      inserted: THIS_MONTH_SPEND.length + LAST_MONTH_SPEND.length + 2,
    };
  },
});

const TAG_BY_CATEGORY: Record<string, string> = {
  Clothing: "Discretionary",
  "Eating Out": "Discretionary",
  Education: "Discretionary",
  Fuel: "Essentials",
  Groceries: "Essentials",
  "Health & Wellness": "Essentials",
  Outing: "Discretionary",
  Subscriptions: "Discretionary",
  Transportation: "Essentials",
};

const TAG_COLORS: Record<string, string> = {
  Discretionary: "#FF9F0A",
  Essentials: "#34C759",
};

/**
 * Tags existing expense transactions as Essentials/Discretionary so the stats
 * "Tags" breakdown has data. Idempotent. Run: npx convex run seed:seedStatsTags
 */
export const seedStatsTags = mutation({
  args: {},
  handler: async (ctx) => {
    const upsertTag = async (name: string): Promise<Id<"tags">> => {
      const normalizedName = normalizeLookupName(name);
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_normalizedName", (q) =>
          q.eq("normalizedName", normalizedName)
        )
        .unique();
      if (existing) {
        return existing._id;
      }
      return await ctx.db.insert("tags", {
        color: TAG_COLORS[name] ?? "#8E8E93",
        name,
        normalizedName,
      });
    };

    const tagIdByName = new Map<string, Id<"tags">>();
    for (const name of new Set(Object.values(TAG_BY_CATEGORY))) {
      tagIdByName.set(name, await upsertTag(name));
    }

    const transactions = await ctx.db.query("transactions").collect();
    let linked = 0;
    for (const transaction of transactions) {
      if (transaction.amount >= 0) {
        continue;
      }
      const tagName = TAG_BY_CATEGORY[transaction.category];
      const tagId = tagName ? tagIdByName.get(tagName) : undefined;
      if (!tagId) {
        continue;
      }
      const existingLinks = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) =>
          q.eq("transactionId", transaction._id)
        )
        .collect();
      if (existingLinks.some((link) => link.tagId === tagId)) {
        continue;
      }
      await ctx.db.insert("transactionTags", {
        tagId,
        transactionId: transaction._id,
      });
      linked += 1;
    }

    return { linked, tags: tagIdByName.size };
  },
});

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

/** Upserts default app categories. Run: npx convex run seed:seedDefaultCategories */
export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;

    for (const category of DEFAULT_CATEGORIES) {
      const normalizedName = normalizeLookupName(category.name);
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_normalizedName", (q) =>
          q.eq("normalizedName", normalizedName)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          color: category.color,
          name: category.name,
          symbol: category.symbol,
        });
        updated += 1;
        continue;
      }

      await ctx.db.insert("categories", {
        ...category,
        normalizedName,
      });
      inserted += 1;
    }

    return { inserted, updated };
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
