import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  accountType,
  budgetPeriod,
  plannedPaymentFrequency,
  plannedPaymentType,
} from "./schema";

const DAY_MS = 86_400_000;
const DEFAULT_CURRENCY = "GHS";
type BudgetPeriod = "weekly" | "monthly" | "yearly" | "one_time";

function normalizeFirstName(value: string): string {
  const firstName = value.trim().replaceAll(/\s+/g, " ");
  if (firstName.length > 40) {
    throw new Error("Name must be 40 characters or fewer");
  }
  return firstName;
}

/** Epoch millis for the start of a budget's current period window. */
function budgetPeriodStart(period: BudgetPeriod, now: number): number {
  const date = new Date(now);
  switch (period) {
    case "weekly": {
      const daysSinceMonday = (date.getDay() + 6) % 7;
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - daysSinceMonday
      ).getTime();
    }
    case "yearly": {
      return new Date(date.getFullYear(), 0, 1).getTime();
    }
    case "one_time": {
      return 0;
    }
    default: {
      return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
    }
  }
}

/** Loads budgets with `spent` computed live from matching-category expenses. */
async function loadBudgetsWithSpend(ctx: QueryCtx) {
  const budgets = await ctx.db.query("budgets").collect();
  budgets.sort((a, b) => a.order - b.order);
  if (budgets.length === 0) {
    return [];
  }

  const uniqueTagIds = new Set<Id<"tags">>();
  for (const budget of budgets) {
    const tagIds = budget.tagIds ?? (budget.tagId ? [budget.tagId] : []);
    for (const tagId of tagIds) {
      uniqueTagIds.add(tagId);
    }
  }
  const tagDocs = await Promise.all(
    [...uniqueTagIds].map((tagId) => ctx.db.get("tags", tagId))
  );
  const tagById = new Map(
    tagDocs
      .filter((tag): tag is Doc<"tags"> => tag !== null)
      .map((tag) => [tag._id, tag])
  );

  const now = Date.now();
  const trackedCategories = new Set(
    budgets
      .map((budget) => budget.category)
      .filter((name): name is string => Boolean(name))
  );
  const earliestStart = Math.min(
    ...budgets.map((budget) =>
      budgetPeriodStart(budget.period ?? "monthly", now)
    )
  );

  const expenses =
    trackedCategories.size === 0
      ? []
      : (await ctx.db.query("transactions").collect()).filter(
          (transaction) =>
            transaction.amount < 0 &&
            transaction.date >= earliestStart &&
            trackedCategories.has(transaction.category)
        );

  return budgets.map((budget) => {
    const period = budget.period ?? "monthly";
    const tagIds = budget.tagIds ?? (budget.tagId ? [budget.tagId] : []);
    let spent = budget.spent ?? 0;
    if (budget.category) {
      const periodStart = budgetPeriodStart(period, now);
      spent = expenses
        .filter(
          (transaction) =>
            transaction.category === budget.category &&
            transaction.date >= periodStart
        )
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    }

    return {
      category: budget.category ?? null,
      color: budget.color,
      currency: budget.currency,
      id: budget._id,
      limit: budget.limit,
      name: budget.name,
      notifyAtThreshold: budget.notifyAtThreshold ?? false,
      notifyOnOverspend: budget.notifyOnOverspend ?? false,
      period,
      spent,
      symbol: budget.symbol,
      tagId: budget.tagId ?? null,
      tagIds,
      tags: tagIds
        .map((tagId) => tagById.get(tagId))
        .filter((tag): tag is Doc<"tags"> => tag !== undefined)
        .map((tag) => ({
          color: tag.color ?? DEFAULT_TAG_COLOR,
          id: tag._id,
          name: tag.name,
        })),
    };
  });
}

const normalizeLookupName = (name: string) => name.trim().toLocaleLowerCase();
const DEFAULT_TAG_COLOR = "#8E8E93";
const TRANSFER_CATEGORY = {
  color: "#6366F1",
  name: "Transfer",
  symbol: "arrow.left.arrow.right",
};
const TRANSACTION_CHARGES_TAG_NAME = "Transaction charges";
const TRANSACTION_CHARGES_TAG_COLOR = "#8E8E93";
const ACCOUNT_TRANSFER_TAG_NAME = "Account transfer";
const ACCOUNT_TRANSFER_TAG_COLOR = "#6366F1";
const BALANCE_ADJUSTMENT_CATEGORY = {
  color: "#8E8E93",
  name: "Balance adjustment",
  symbol: "plus.forwardslash.minus",
};

function resolveTransactionKind(transaction: Doc<"transactions">) {
  if (transaction.transactionKind) {
    return transaction.transactionKind;
  }
  if (transaction.category === "Transaction charges") {
    return "charge" as const;
  }
  if (transaction.category === "Transfer") {
    return transaction.amount < 0
      ? ("transfer_out" as const)
      : ("transfer_in" as const);
  }
  return transaction.amount >= 0 ? ("income" as const) : ("expense" as const);
}

async function loadPairTransactions(
  ctx: QueryCtx,
  transactions: Doc<"transactions">[]
): Promise<Map<Id<"transactions">, Doc<"transactions">>> {
  const pairIds = [
    ...new Set(
      transactions
        .map((transaction) => transaction.pairTransactionId)
        .filter((id): id is Id<"transactions"> => id !== undefined)
    ),
  ];
  const pairs = await Promise.all(
    pairIds.map((id) => ctx.db.get("transactions", id))
  );
  return new Map(
    pairs
      .filter((pair): pair is Doc<"transactions"> => pair !== null)
      .map((pair) => [pair._id, pair])
  );
}

async function loadChargeTransactionsByParent(
  ctx: QueryCtx,
  transactions: Doc<"transactions">[]
): Promise<Map<Id<"transactions">, Doc<"transactions">>> {
  const parentIds = transactions.map((transaction) => transaction._id);
  const chargeGroups = await Promise.all(
    parentIds.map((parentId) =>
      ctx.db
        .query("transactions")
        .withIndex("by_parentTransactionId", (q) =>
          q.eq("parentTransactionId", parentId)
        )
        .collect()
    )
  );

  return new Map(
    chargeGroups
      .map((charges, index) => {
        const charge = charges.find(
          (transaction) => resolveTransactionKind(transaction) === "charge"
        );
        return charge ? ([parentIds[index], charge] as const) : null;
      })
      .filter(
        (item): item is readonly [Id<"transactions">, Doc<"transactions">] =>
          item !== null
      )
  );
}

async function enrichTransactions(
  ctx: QueryCtx,
  transactions: Doc<"transactions">[],
  accountNameById: Map<Id<"accounts">, string>
) {
  if (transactions.length === 0) {
    return [];
  }

  const tagLinksByTxn = await Promise.all(
    transactions.map((transaction) =>
      ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) =>
          q.eq("transactionId", transaction._id)
        )
        .collect()
    )
  );

  const uniqueTagIds = new Set<Id<"tags">>();
  for (const links of tagLinksByTxn) {
    for (const link of links) {
      uniqueTagIds.add(link.tagId);
    }
  }

  const tagDocs = await Promise.all(
    [...uniqueTagIds].map((tagId) => ctx.db.get("tags", tagId))
  );
  const tagById = new Map(
    tagDocs
      .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
      .map((tag) => [tag._id, tag])
  );
  const pairById = await loadPairTransactions(ctx, transactions);
  const chargeByParentId = await loadChargeTransactionsByParent(
    ctx,
    transactions
  );

  return transactions.map((transaction, index) => {
    const kind = resolveTransactionKind(transaction);
    const pair = transaction.pairTransactionId
      ? pairById.get(transaction.pairTransactionId)
      : undefined;
    const childCharge = chargeByParentId.get(transaction._id);
    let transactionChargeAmount: number | null = null;
    if (pair && resolveTransactionKind(pair) === "charge") {
      transactionChargeAmount = Math.abs(pair.amount);
    } else if (childCharge) {
      transactionChargeAmount = Math.abs(childCharge.amount);
    }

    let toAccountId: Id<"accounts"> | undefined;
    let toAccountName: string | undefined;
    let fromAccountId: Id<"accounts"> | undefined;
    let fromAccountName: string | undefined;

    const { toAccountId: transferToAccountId } = transaction;
    if (kind === "transfer_out" && transferToAccountId) {
      toAccountId = transferToAccountId;
      toAccountName = accountNameById.get(toAccountId);
      fromAccountId = transaction.accountId;
      fromAccountName = accountNameById.get(transaction.accountId);
    } else if (
      kind === "transfer_in" &&
      pair &&
      resolveTransactionKind(pair) === "transfer_out"
    ) {
      fromAccountId = pair.accountId;
      fromAccountName = accountNameById.get(pair.accountId);
      toAccountId = transaction.accountId;
      toAccountName = accountNameById.get(transaction.accountId);
    }

    return {
      accountId: transaction.accountId,
      accountName: accountNameById.get(transaction.accountId) ?? "Unknown",
      amount: transaction.amount,
      category: transaction.category,
      color: transaction.color,
      createdByName: transaction.createdByName ?? "",
      currency: transaction.currency,
      date: new Date(transaction.date).toISOString(),
      fromAccountId,
      fromAccountName,
      id: transaction._id,
      merchant: transaction.merchant,
      parentTransactionId: transaction.parentTransactionId,
      symbol: transaction.symbol,
      tags: tagLinksByTxn[index]
        .map((link) => tagById.get(link.tagId))
        .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
        .map((tag) => ({
          color: tag.color ?? DEFAULT_TAG_COLOR,
          id: tag._id,
          name: tag.name,
        })),
      toAccountId,
      toAccountName,
      transactionChargeAmount,
      transactionKind: kind,
    };
  });
}

async function resolveEditableTransaction(
  ctx: Pick<QueryCtx, "db">,
  id: Id<"transactions">
) {
  const transaction = await ctx.db.get("transactions", id);
  if (!transaction) {
    return null;
  }

  const kind = resolveTransactionKind(transaction);
  if (kind === "charge" && transaction.parentTransactionId) {
    return await ctx.db.get("transactions", transaction.parentTransactionId);
  }
  if (kind === "transfer_in" && transaction.pairTransactionId) {
    const outLeg = await ctx.db.get(
      "transactions",
      transaction.pairTransactionId
    );
    if (outLeg) {
      return outLeg;
    }
  }

  return transaction;
}

function transactionTypeFromKind(
  kind: ReturnType<typeof resolveTransactionKind>
) {
  if (kind === "income") {
    return "income" as const;
  }
  if (kind === "transfer_out" || kind === "transfer_in") {
    return "transfer" as const;
  }
  return "expense" as const;
}

async function replaceTransactionTags(
  ctx: MutationCtx,
  transactionId: Id<"transactions">,
  tagIds: Id<"tags">[]
) {
  const existingLinks = await ctx.db
    .query("transactionTags")
    .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
    .collect();
  for (const link of existingLinks) {
    await ctx.db.delete(link._id);
  }

  for (const tagId of new Set(tagIds)) {
    const tag = await ctx.db.get("tags", tagId);
    if (!tag) {
      throw new Error("Tag not found");
    }
    await ctx.db.insert("transactionTags", { tagId, transactionId });
  }
}

async function getOrCreateTransactionChargesTagId(
  ctx: MutationCtx
): Promise<Id<"tags">> {
  const normalizedName = normalizeLookupName(TRANSACTION_CHARGES_TAG_NAME);
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
    color: TRANSACTION_CHARGES_TAG_COLOR,
    name: TRANSACTION_CHARGES_TAG_NAME,
    normalizedName,
  });
}

async function getOrCreateAccountTransferTagId(
  ctx: MutationCtx
): Promise<Id<"tags">> {
  const normalizedName = normalizeLookupName(ACCOUNT_TRANSFER_TAG_NAME);
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
    color: ACCOUNT_TRANSFER_TAG_COLOR,
    name: ACCOUNT_TRANSFER_TAG_NAME,
    normalizedName,
  });
}

async function replaceChargeTransactionTags(
  ctx: MutationCtx,
  transactionId: Id<"transactions">
) {
  const tagId = await getOrCreateTransactionChargesTagId(ctx);
  await replaceTransactionTags(ctx, transactionId, [tagId]);
}

async function getChargeForParentTransaction(
  ctx: Pick<QueryCtx, "db">,
  parentTransactionId: Id<"transactions">
) {
  const charges = await ctx.db
    .query("transactions")
    .withIndex("by_parentTransactionId", (q) =>
      q.eq("parentTransactionId", parentTransactionId)
    )
    .collect();
  return (
    charges.find(
      (transaction) => resolveTransactionKind(transaction) === "charge"
    ) ?? null
  );
}

/**
 * Returns everything the dashboard needs in a single round trip. The shape
 * mirrors the `FinanceSnapshot` type the UI consumes, so the client can swap
 * the local mock for `useQuery(api.finance.getSnapshot)` without further edits.
 */
export const getSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const [accounts, transactions, budgets, plannedPaymentsOverdueCount] =
      await Promise.all([
        ctx.db.query("accounts").collect(),
        ctx.db
          .query("transactions")
          .withIndex("by_date")
          .order("desc")
          .take(25),
        loadBudgetsWithSpend(ctx),
        countOverduePlannedPayments(ctx),
      ]);

    const accountNameById = new Map(
      accounts.map((account) => [account._id, account.name])
    );
    const visibleTransactions = transactions.slice(0, 10);

    return {
      accounts: accounts
        .sort((a, b) => a.order - b.order)
        .map((a) => ({
          balance: a.balance,
          color: a.color,
          currency: a.currency,
          id: a._id,
          institution: a.institution,
          name: a.name,
          symbol: a.symbol,
          type: a.type,
        })),
      budgets,
      plannedPaymentsOverdueCount,
      transactions: await enrichTransactions(
        ctx,
        visibleTransactions,
        accountNameById
      ),
    };
  },
});

type StatsPeriod = "weekly" | "monthly" | "yearly";

interface SpendingGroup {
  key: string;
  label: string;
  color: string;
  symbol: string;
  amount: number;
  count: number;
}

interface TrendBucket {
  label: string;
  amount: number;
}

interface BudgetPerformance {
  id: string;
  name: string;
  color: string;
  symbol: string;
  limit: number;
  spent: number;
  currency: string;
}

const UNTAGGED_KEY = "__untagged__";
const UNTAGGED_COLOR = "#8E8E93";
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Currency used by the most accounts, used as the default for stats. */
function mostCommonCurrency(accounts: Doc<"accounts">[]): string | null {
  if (accounts.length === 0) {
    return null;
  }
  const counts = new Map<string, number>();
  for (const account of accounts) {
    counts.set(account.currency, (counts.get(account.currency) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

/** True for real outflows: excludes transfers and balance adjustments. */
function isSpendTransaction(transaction: Doc<"transactions">): boolean {
  if (transaction.amount >= 0) {
    return false;
  }
  const kind = resolveTransactionKind(transaction);
  if (kind === "transfer_in" || kind === "transfer_out") {
    return false;
  }
  return transaction.category !== BALANCE_ADJUSTMENT_CATEGORY.name;
}

/** True for real inflows: excludes transfers and balance adjustments. */
function isIncomeTransaction(transaction: Doc<"transactions">): boolean {
  if (transaction.amount <= 0) {
    return false;
  }
  const kind = resolveTransactionKind(transaction);
  if (kind === "transfer_in" || kind === "transfer_out") {
    return false;
  }
  return transaction.category !== BALANCE_ADJUSTMENT_CATEGORY.name;
}

/** Period transactions in a currency, fetched via the date-range index. */
async function loadCurrencyWindow(
  ctx: QueryCtx,
  currency: string,
  start: number,
  end: number
): Promise<Doc<"transactions">[]> {
  return await ctx.db
    .query("transactions")
    .withIndex("by_currency_and_date", (q) =>
      q.eq("currency", currency).gte("date", start).lt("date", end)
    )
    .collect();
}

/** Sums spend amounts by category snapshot. */
function groupByCategory(spend: Doc<"transactions">[]): SpendingGroup[] {
  const map = new Map<string, SpendingGroup>();
  for (const transaction of spend) {
    const amount = Math.abs(transaction.amount);
    const existing = map.get(transaction.category);
    if (existing) {
      existing.amount += amount;
      existing.count += 1;
    } else {
      map.set(transaction.category, {
        amount,
        color: transaction.color,
        count: 1,
        key: transaction.category,
        label: transaction.category,
        symbol: transaction.symbol,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/**
 * Sums spend amounts by tag. A transaction's amount is split evenly across its
 * tags so totals stay comparable; untagged spend lands in an "Untagged" group.
 */
async function groupByTag(
  ctx: QueryCtx,
  spend: Doc<"transactions">[]
): Promise<SpendingGroup[]> {
  const linksByTxn = await Promise.all(
    spend.map((transaction) =>
      ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) =>
          q.eq("transactionId", transaction._id)
        )
        .collect()
    )
  );

  const uniqueTagIds = new Set<Id<"tags">>();
  for (const links of linksByTxn) {
    for (const link of links) {
      uniqueTagIds.add(link.tagId);
    }
  }
  const tagDocs = await Promise.all(
    [...uniqueTagIds].map((tagId) => ctx.db.get("tags", tagId))
  );
  const tagById = new Map(
    tagDocs
      .filter((tag): tag is Doc<"tags"> => tag !== null)
      .map((tag) => [tag._id, tag])
  );

  const map = new Map<string, SpendingGroup>();
  const add = (group: Omit<SpendingGroup, "count">) => {
    const existing = map.get(group.key);
    if (existing) {
      existing.amount += group.amount;
      existing.count += 1;
    } else {
      map.set(group.key, { ...group, count: 1 });
    }
  };

  for (const [index, transaction] of spend.entries()) {
    const amount = Math.abs(transaction.amount);
    const links = linksByTxn[index];
    if (links.length === 0) {
      add({
        amount,
        color: UNTAGGED_COLOR,
        key: UNTAGGED_KEY,
        label: "Untagged",
        symbol: "tag.slash.fill",
      });
      continue;
    }
    const share = amount / links.length;
    for (const link of links) {
      const tag = tagById.get(link.tagId);
      add({
        amount: share,
        color: tag?.color ?? UNTAGGED_COLOR,
        key: link.tagId,
        label: tag?.name ?? "Tag",
        symbol: "tag.fill",
      });
    }
  }

  return [...map.values()]
    .map((group) => ({ ...group, amount: Math.round(group.amount) }))
    .sort((a, b) => b.amount - a.amount);
}

/** Spend-over-time buckets: daily for week/month, monthly for year. */
function buildTrend(
  period: StatsPeriod,
  start: number,
  end: number,
  spend: Doc<"transactions">[]
): TrendBucket[] {
  if (period === "yearly") {
    const startMonth = new Date(start).getUTCMonth();
    const startYear = new Date(start).getUTCFullYear();
    const buckets: TrendBucket[] = Array.from({ length: 12 }, (_, index) => ({
      amount: 0,
      label: MONTH_LABELS[(startMonth + index) % 12],
    }));
    for (const transaction of spend) {
      const date = new Date(transaction.date);
      const index =
        (date.getUTCFullYear() - startYear) * 12 +
        (date.getUTCMonth() - startMonth);
      if (index >= 0 && index < 12) {
        buckets[index].amount += Math.abs(transaction.amount);
      }
    }
    return buckets;
  }

  const dayCount = Math.max(1, Math.round((end - start) / DAY_MS));
  const buckets: TrendBucket[] = Array.from(
    { length: dayCount },
    (_, index) => ({
      amount: 0,
      label:
        period === "weekly" ? (WEEKDAY_LABELS[index] ?? "") : String(index + 1),
    })
  );
  for (const transaction of spend) {
    const index = Math.floor((transaction.date - start) / DAY_MS);
    if (index >= 0 && index < dayCount) {
      buckets[index].amount += Math.abs(transaction.amount);
    }
  }
  return buckets;
}

/** Per-budget spend within the window, for budgets matching the currency. */
async function loadBudgetPerformance(
  ctx: QueryCtx,
  currency: string,
  spend: Doc<"transactions">[]
): Promise<BudgetPerformance[]> {
  const budgets = await ctx.db.query("budgets").collect();
  const spentByCategory = new Map<string, number>();
  for (const transaction of spend) {
    spentByCategory.set(
      transaction.category,
      (spentByCategory.get(transaction.category) ?? 0) +
        Math.abs(transaction.amount)
    );
  }
  return budgets
    .filter(
      (budget) => budget.currency === currency && Boolean(budget.category)
    )
    .sort((a, b) => a.order - b.order)
    .map((budget) => ({
      color: budget.color,
      currency: budget.currency,
      id: budget._id,
      limit: budget.limit,
      name: budget.name,
      spent: budget.category
        ? (spentByCategory.get(budget.category) ?? 0)
        : (budget.spent ?? 0),
      symbol: budget.symbol,
    }));
}

/**
 * Period-based spending insights for a single currency: category and tag
 * breakdowns, income/cashflow totals, a spend-over-time trend, and budget
 * performance. Transfers and balance adjustments are excluded; charges count
 * as spend. `previous*` totals cover the immediately preceding window.
 */
export const getSpendingStats = query({
  args: {
    start: v.number(),
    end: v.number(),
    periodType: v.union(
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly")
    ),
    currency: v.optional(v.string()),
    prevStart: v.optional(v.number()),
    prevEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db.query("accounts").collect();
    const targetCurrency =
      args.currency ?? mostCommonCurrency(accounts) ?? DEFAULT_CURRENCY;
    const prevStart = args.prevStart ?? args.start - (args.end - args.start);
    const prevEnd = args.prevEnd ?? args.start;

    const [current, previous] = await Promise.all([
      loadCurrencyWindow(ctx, targetCurrency, args.start, args.end),
      loadCurrencyWindow(ctx, targetCurrency, prevStart, prevEnd),
    ]);

    const spend = current.filter(isSpendTransaction);
    const income = current.filter(isIncomeTransaction);
    const sumAbs = (rows: Doc<"transactions">[]) =>
      rows.reduce((total, row) => total + Math.abs(row.amount), 0);

    const totalSpent = sumAbs(spend);
    const totalIncome = sumAbs(income);
    const previousTotalSpent = sumAbs(previous.filter(isSpendTransaction));
    const previousTotalIncome = sumAbs(previous.filter(isIncomeTransaction));

    const [tags, budgets] = await Promise.all([
      groupByTag(ctx, spend),
      loadBudgetPerformance(ctx, targetCurrency, spend),
    ]);

    return {
      budgets,
      categories: groupByCategory(spend),
      currency: targetCurrency,
      previousTotalIncome,
      previousTotalSpent,
      tags,
      totalIncome,
      totalSpent,
      transactionCount: spend.length,
      trend: buildTrend(args.periodType, args.start, args.end, spend),
    };
  },
});

export const listAccountTransactions = query({
  args: {
    accountId: v.id("accounts"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("transactions")
      .withIndex("by_accountId_and_date", (q) =>
        q.eq("accountId", args.accountId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const account = await ctx.db.get("accounts", args.accountId);
    const accountNameById = new Map([
      [args.accountId, account?.name ?? "Unknown"],
    ] as const);

    return {
      ...result,
      page: await enrichTransactions(ctx, result.page, accountNameById),
    };
  },
});

export const listTransactions = query({
  args: {},
  handler: async (ctx) => {
    const [accounts, transactions] = await Promise.all([
      ctx.db.query("accounts").collect(),
      ctx.db.query("transactions").withIndex("by_date").order("desc").take(500),
    ]);
    const accountNameById = new Map(
      accounts.map((account) => [account._id, account.name])
    );
    return await enrichTransactions(ctx, transactions, accountNameById);
  },
});

export const getTransaction = query({
  args: {
    id: v.id("transactions"),
  },
  handler: async (ctx, args) => {
    const transaction = await resolveEditableTransaction(ctx, args.id);
    if (!transaction) {
      return null;
    }

    const accounts = await ctx.db.query("accounts").collect();
    const accountNameById = new Map(
      accounts.map((account) => [account._id, account.name])
    );
    const [item] = await enrichTransactions(
      ctx,
      [transaction],
      accountNameById
    );
    const kind = resolveTransactionKind(transaction);

    return {
      ...item,
      type: transactionTypeFromKind(kind),
    };
  },
});

const accountArgs = {
  balance: v.number(),
  color: v.string(),
  currency: v.string(),
  name: v.string(),
  symbol: v.string(),
  type: accountType,
};

export const createAccount = mutation({
  args: accountArgs,
  handler: async (ctx, args) => {
    const accounts = await ctx.db.query("accounts").collect();
    const nextOrder =
      accounts.length === 0
        ? 0
        : Math.max(...accounts.map((account) => account.order)) + 1;

    return await ctx.db.insert("accounts", {
      ...args,
      institution: args.type === "cash" ? "Cash" : "",
      order: nextOrder,
    });
  },
});

export const updateAccount = mutation({
  args: {
    id: v.id("accounts"),
    ...accountArgs,
    balanceUpdateMode: v.optional(
      v.union(v.literal("record"), v.literal("initial"))
    ),
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      balanceUpdateMode,
      createdByName: createdByNameArg,
      id,
      ...patch
    } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Account not found");
    }
    const balanceDelta = patch.balance - existing.balance;

    await ctx.db.patch(id, {
      ...patch,
      institution: patch.type === "cash" ? "Cash" : "",
    });

    if ((balanceUpdateMode ?? "initial") === "record" && balanceDelta !== 0) {
      const createdByName = normalizeFirstName(createdByNameArg ?? "");
      await ctx.db.insert("transactions", {
        accountId: id,
        amount: balanceDelta,
        category: BALANCE_ADJUSTMENT_CATEGORY.name,
        color: BALANCE_ADJUSTMENT_CATEGORY.color,
        createdByName,
        currency: patch.currency,
        date: Date.now(),
        merchant: BALANCE_ADJUSTMENT_CATEGORY.name,
        symbol: BALANCE_ADJUSTMENT_CATEGORY.symbol,
        transactionKind: balanceDelta > 0 ? "income" : "expense",
      });
    }

    return id;
  },
});

export const deleteAccount = mutation({
  args: {
    id: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const archived = await ctx.db.query("archivedCategories").collect();
    const archivedNames = new Set(
      archived.map((category) => category.normalizedName)
    );
    const categories = await ctx.db.query("categories").take(500);
    return categories
      .filter(
        (category) =>
          category.archived !== true &&
          !archivedNames.has(category.normalizedName)
      )
      .map((category) => ({
        color: category.color,
        id: category._id,
        name: category.name,
        symbol: category.symbol,
      }));
  },
});

export const listArchivedCategoryNames = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("archivedCategories").take(500);
    return categories.map((category) => category.name);
  },
});

export const createCategory = mutation({
  args: {
    color: v.string(),
    name: v.string(),
    symbol: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const normalizedName = normalizeLookupName(name);
    if (!name || name.length > 80) {
      throw new Error("Category name must contain between 1 and 80 characters");
    }
    const archived = await ctx.db
      .query("archivedCategories")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .unique();
    if (archived) {
      await ctx.db.delete(archived._id);
    }

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .unique();
    if (existing) {
      if (existing.archived === true) {
        await ctx.db.patch(existing._id, {
          archived: false,
          color: args.color,
          symbol: args.symbol,
        });
        return {
          color: args.color,
          id: existing._id,
          name: existing.name,
          symbol: args.symbol,
        };
      }
      return {
        color: existing.color,
        id: existing._id,
        name: existing.name,
        symbol: existing.symbol,
      };
    }

    const id = await ctx.db.insert("categories", {
      color: args.color,
      name,
      normalizedName,
      symbol: args.symbol,
    });
    return { color: args.color, id, name, symbol: args.symbol };
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }
    await ctx.db.patch(args.id, { archived: true });
    return args.id;
  },
});

export const deleteCategoryByName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const normalizedName = normalizeLookupName(name);
    if (!name) {
      throw new Error("Category name is required");
    }

    const existingArchive = await ctx.db
      .query("archivedCategories")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .unique();
    if (!existingArchive) {
      await ctx.db.insert("archivedCategories", { name, normalizedName });
    }

    const matchingCategories = await ctx.db
      .query("categories")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .collect();
    for (const category of matchingCategories) {
      await ctx.db.patch(category._id, { archived: true });
    }

    return name;
  },
});

export const listTags = query({
  args: {},
  handler: async (ctx) => {
    const tags = await ctx.db.query("tags").take(500);
    return tags
      .filter((tag) => tag.archived !== true)
      .map((tag) => ({
        color: tag.color ?? "#8E8E93",
        id: tag._id,
        name: tag.name,
      }));
  },
});

export const createTag = mutation({
  args: { color: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const normalizedName = normalizeLookupName(name);
    if (!name || name.length > 50) {
      throw new Error("Tag name must contain between 1 and 50 characters");
    }

    const existing = await ctx.db
      .query("tags")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", normalizedName)
      )
      .unique();
    if (existing) {
      if (existing.archived === true) {
        await ctx.db.patch(existing._id, {
          archived: false,
          color: args.color,
        });
        return {
          color: args.color,
          id: existing._id,
          name: existing.name,
        };
      }
      return {
        color: existing.color ?? args.color,
        id: existing._id,
        name: existing.name,
      };
    }

    const id = await ctx.db.insert("tags", {
      color: args.color,
      name,
      normalizedName,
    });
    return { color: args.color, id, name };
  },
});

export const deleteTag = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.id);
    if (!tag) {
      throw new Error("Tag not found");
    }

    const budgets = await ctx.db.query("budgets").collect();
    for (const budget of budgets) {
      const currentTagIds =
        budget.tagIds ?? (budget.tagId ? [budget.tagId] : []);
      if (!currentTagIds.includes(args.id)) {
        continue;
      }
      const tagIds = currentTagIds.filter((tagId) => tagId !== args.id);
      await ctx.db.patch(budget._id, {
        tagId: tagIds[0],
        tagIds,
      });
    }

    const templates = await ctx.db.query("transactionTemplates").collect();
    for (const template of templates) {
      if (!template.tagIds.includes(args.id)) {
        continue;
      }
      await ctx.db.patch(template._id, {
        tagIds: template.tagIds.filter((tagId) => tagId !== args.id),
      });
    }

    const plannedPayments = await ctx.db.query("plannedPayments").collect();
    for (const payment of plannedPayments) {
      if (!payment.tagIds.includes(args.id)) {
        continue;
      }
      await ctx.db.patch(payment._id, {
        tagIds: payment.tagIds.filter((tagId) => tagId !== args.id),
      });
    }

    await ctx.db.patch(args.id, { archived: true });
    return args.id;
  },
});

export const createBudget = mutation({
  args: {
    category: v.string(),
    color: v.string(),
    currency: v.string(),
    limit: v.number(),
    name: v.string(),
    notifyAtThreshold: v.boolean(),
    notifyOnOverspend: v.boolean(),
    period: budgetPeriod,
    symbol: v.string(),
    tagId: v.optional(v.id("tags")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name || name.length > 80) {
      throw new Error("Budget name must contain between 1 and 80 characters");
    }
    if (!Number.isFinite(args.limit) || args.limit <= 0) {
      throw new Error("Budget amount must be positive");
    }
    const tagIds = args.tagIds ?? (args.tagId ? [args.tagId] : []);
    for (const tagId of new Set(tagIds)) {
      const tag = await ctx.db.get(tagId);
      if (!tag) {
        throw new Error("Tag not found");
      }
    }

    const budgets = await ctx.db.query("budgets").collect();
    const nextOrder =
      budgets.length === 0
        ? 0
        : Math.max(...budgets.map((budget) => budget.order)) + 1;

    return await ctx.db.insert("budgets", {
      category: args.category,
      color: args.color,
      currency: args.currency,
      limit: args.limit,
      name,
      notifyAtThreshold: args.notifyAtThreshold,
      notifyOnOverspend: args.notifyOnOverspend,
      order: nextOrder,
      period: args.period,
      symbol: args.symbol,
      tagId: tagIds[0],
      tagIds: [...new Set(tagIds)],
    });
  },
});

export const updateBudget = mutation({
  args: {
    category: v.string(),
    color: v.string(),
    currency: v.string(),
    id: v.id("budgets"),
    limit: v.number(),
    name: v.string(),
    notifyAtThreshold: v.boolean(),
    notifyOnOverspend: v.boolean(),
    period: budgetPeriod,
    symbol: v.string(),
    tagId: v.optional(v.id("tags")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Budget not found");
    }

    const name = args.name.trim();
    if (!name || name.length > 80) {
      throw new Error("Budget name must contain between 1 and 80 characters");
    }
    if (!Number.isFinite(args.limit) || args.limit <= 0) {
      throw new Error("Budget amount must be positive");
    }
    const tagIds = args.tagIds ?? (args.tagId ? [args.tagId] : []);
    for (const tagId of new Set(tagIds)) {
      const tag = await ctx.db.get(tagId);
      if (!tag) {
        throw new Error("Tag not found");
      }
    }

    await ctx.db.patch(args.id, {
      category: args.category,
      color: args.color,
      currency: args.currency,
      limit: args.limit,
      name,
      notifyAtThreshold: args.notifyAtThreshold,
      notifyOnOverspend: args.notifyOnOverspend,
      period: args.period,
      symbol: args.symbol,
      tagId: tagIds[0],
      tagIds: [...new Set(tagIds)],
    });

    return args.id;
  },
});

export const generateAttachmentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const createTransaction = mutation({
  args: {
    accountId: v.id("accounts"),
    amount: v.number(),
    attachments: v.array(
      v.object({
        mimeType: v.optional(v.string()),
        name: v.string(),
        size: v.optional(v.number()),
        storageId: v.id("_storage"),
      })
    ),
    category: v.string(),
    color: v.string(),
    createdByName: v.optional(v.string()),
    date: v.number(),
    merchant: v.string(),
    symbol: v.string(),
    tagIds: v.array(v.id("tags")),
    toAccountId: v.optional(v.id("accounts")),
    transactionCharge: v.optional(v.number()),
    type: v.union(
      v.literal("expense"),
      v.literal("income"),
      v.literal("transfer")
    ),
  },
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error("Transaction amounts must be positive");
    }
    if (
      args.transactionCharge !== undefined &&
      (!Number.isFinite(args.transactionCharge) || args.transactionCharge <= 0)
    ) {
      throw new Error("Transaction charge must be positive");
    }

    const createdByName = normalizeFirstName(args.createdByName ?? "");

    if (args.type === "transfer") {
      if (!args.toAccountId) {
        throw new Error("Transfer requires a destination account");
      }
      if (args.accountId === args.toAccountId) {
        throw new Error("Transfer accounts must be different");
      }

      const fromAccount = await ctx.db.get("accounts", args.accountId);
      const toAccount = await ctx.db.get("accounts", args.toAccountId);
      if (!fromAccount || !toAccount) {
        throw new Error("Account not found");
      }
      if (fromAccount.currency !== toAccount.currency) {
        throw new Error("Transfer accounts must use the same currency");
      }

      const merchant = args.merchant.trim() || `Transfer to ${toAccount.name}`;
      const transactionCharge = args.transactionCharge ?? 0;
      const transferOutId = await ctx.db.insert("transactions", {
        accountId: args.accountId,
        amount: -args.amount,
        category: TRANSFER_CATEGORY.name,
        color: TRANSFER_CATEGORY.color,
        createdByName,
        currency: fromAccount.currency,
        date: args.date,
        merchant,
        symbol: TRANSFER_CATEGORY.symbol,
        toAccountId: args.toAccountId,
        transactionKind: "transfer_out",
      });
      const transferInId = await ctx.db.insert("transactions", {
        accountId: args.toAccountId,
        amount: args.amount,
        category: TRANSFER_CATEGORY.name,
        color: TRANSFER_CATEGORY.color,
        createdByName,
        currency: toAccount.currency,
        date: args.date,
        merchant: `Transfer from ${fromAccount.name}`,
        symbol: TRANSFER_CATEGORY.symbol,
        transactionKind: "transfer_in",
      });

      await ctx.db.patch(transferOutId, { pairTransactionId: transferInId });
      await ctx.db.patch(transferInId, { pairTransactionId: transferOutId });

      const accountTransferTagId = await getOrCreateAccountTransferTagId(ctx);
      await replaceTransactionTags(ctx, transferOutId, [
        ...args.tagIds,
        accountTransferTagId,
      ]);
      await replaceTransactionTags(ctx, transferInId, [accountTransferTagId]);
      for (const attachment of args.attachments) {
        await ctx.db.insert("transactionAttachments", {
          ...attachment,
          transactionId: transferOutId,
        });
      }

      let transactionChargeId = null;
      if (transactionCharge > 0) {
        transactionChargeId = await ctx.db.insert("transactions", {
          accountId: args.accountId,
          amount: -transactionCharge,
          category: "Transaction charges",
          color: TRANSACTION_CHARGES_TAG_COLOR,
          createdByName,
          currency: fromAccount.currency,
          date: args.date,
          merchant: `${merchant} TC`,
          parentTransactionId: transferOutId,
          symbol: "creditcard.fill",
          transactionKind: "charge",
        });
        await replaceChargeTransactionTags(ctx, transactionChargeId);
      }

      await ctx.db.patch(args.accountId, {
        balance: fromAccount.balance - args.amount - transactionCharge,
      });
      await ctx.db.patch(args.toAccountId, {
        balance: toAccount.balance + args.amount,
      });

      return { mainTransactionId: transferOutId, transactionChargeId };
    }

    const account = await ctx.db.get("accounts", args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const merchant = args.merchant.trim() || args.category;
    const signedAmount = args.type === "expense" ? -args.amount : args.amount;
    const transactionCharge =
      args.type === "expense" ? (args.transactionCharge ?? 0) : 0;
    const mainTransactionId = await ctx.db.insert("transactions", {
      accountId: args.accountId,
      amount: signedAmount,
      category: args.category,
      color: args.color,
      createdByName,
      currency: account.currency,
      date: args.date,
      merchant,
      symbol: args.symbol,
      transactionKind: args.type,
    });

    await replaceTransactionTags(ctx, mainTransactionId, args.tagIds);
    for (const attachment of args.attachments) {
      await ctx.db.insert("transactionAttachments", {
        ...attachment,
        transactionId: mainTransactionId,
      });
    }

    let transactionChargeId = null;
    if (transactionCharge > 0) {
      transactionChargeId = await ctx.db.insert("transactions", {
        accountId: args.accountId,
        amount: -transactionCharge,
        category: "Transaction charges",
        color: "#8E8E93",
        createdByName,
        currency: account.currency,
        date: args.date,
        merchant: `${merchant} TC`,
        parentTransactionId: mainTransactionId,
        symbol: "creditcard.fill",
        transactionKind: "charge",
      });
      await ctx.db.patch(mainTransactionId, {
        pairTransactionId: transactionChargeId,
      });
      await replaceChargeTransactionTags(ctx, transactionChargeId);
    }

    await ctx.db.patch(args.accountId, {
      balance: account.balance + signedAmount - transactionCharge,
    });

    return { mainTransactionId, transactionChargeId };
  },
});

export const updateTransaction = mutation({
  args: {
    accountId: v.id("accounts"),
    amount: v.number(),
    category: v.string(),
    color: v.string(),
    createdByName: v.optional(v.string()),
    date: v.number(),
    id: v.id("transactions"),
    merchant: v.string(),
    symbol: v.string(),
    tagIds: v.array(v.id("tags")),
    toAccountId: v.optional(v.id("accounts")),
    transactionCharge: v.optional(v.number()),
    type: v.union(
      v.literal("expense"),
      v.literal("income"),
      v.literal("transfer")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await resolveEditableTransaction(ctx, args.id);
    if (!existing) {
      throw new Error("Transaction not found");
    }

    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error("Transaction amounts must be positive");
    }
    if (
      args.transactionCharge !== undefined &&
      (!Number.isFinite(args.transactionCharge) || args.transactionCharge <= 0)
    ) {
      throw new Error("Transaction charge must be positive");
    }

    const existingKind = resolveTransactionKind(existing);

    if (existingKind === "transfer_out" || args.type === "transfer") {
      if (!args.toAccountId) {
        throw new Error("Transfer requires a destination account");
      }
      if (args.accountId === args.toAccountId) {
        throw new Error("Transfer accounts must be different");
      }

      const fromAccount = await ctx.db.get("accounts", args.accountId);
      const toAccount = await ctx.db.get("accounts", args.toAccountId);
      if (!fromAccount || !toAccount) {
        throw new Error("Account not found");
      }
      if (fromAccount.currency !== toAccount.currency) {
        throw new Error("Transfer accounts must use the same currency");
      }

      const oldFromAccountId = existing.accountId;
      const oldInLeg = existing.pairTransactionId
        ? await ctx.db.get("transactions", existing.pairTransactionId)
        : null;
      const oldToAccountId = existing.toAccountId ?? oldInLeg?.accountId;
      const oldAmount = Math.abs(existing.amount);
      const oldCharge = await getChargeForParentTransaction(ctx, existing._id);
      const oldChargeAmount = oldCharge ? Math.abs(oldCharge.amount) : 0;
      const nextCharge = args.transactionCharge ?? 0;
      const createdByName =
        existing.createdByName ?? normalizeFirstName(args.createdByName ?? "");

      if (oldToAccountId) {
        const oldFromAccount = await ctx.db.get("accounts", oldFromAccountId);
        const oldToAccount = await ctx.db.get("accounts", oldToAccountId);
        if (oldFromAccount) {
          await ctx.db.patch(oldFromAccountId, {
            balance: oldFromAccount.balance + oldAmount + oldChargeAmount,
          });
        }
        if (oldToAccount) {
          await ctx.db.patch(oldToAccountId, {
            balance: oldToAccount.balance - oldAmount,
          });
        }
      }

      const merchant = args.merchant.trim() || `Transfer to ${toAccount.name}`;
      await ctx.db.patch(existing._id, {
        accountId: args.accountId,
        amount: -args.amount,
        category: TRANSFER_CATEGORY.name,
        color: TRANSFER_CATEGORY.color,
        currency: fromAccount.currency,
        date: args.date,
        merchant,
        symbol: TRANSFER_CATEGORY.symbol,
        toAccountId: args.toAccountId,
        transactionKind: "transfer_out",
      });

      let transferInId = existing.pairTransactionId;
      if (transferInId) {
        await ctx.db.patch(transferInId, {
          accountId: args.toAccountId,
          amount: args.amount,
          category: TRANSFER_CATEGORY.name,
          color: TRANSFER_CATEGORY.color,
          currency: toAccount.currency,
          date: args.date,
          merchant: `Transfer from ${fromAccount.name}`,
          symbol: TRANSFER_CATEGORY.symbol,
          transactionKind: "transfer_in",
        });
      } else {
        transferInId = await ctx.db.insert("transactions", {
          accountId: args.toAccountId,
          amount: args.amount,
          category: TRANSFER_CATEGORY.name,
          color: TRANSFER_CATEGORY.color,
          createdByName,
          currency: toAccount.currency,
          date: args.date,
          merchant: `Transfer from ${fromAccount.name}`,
          pairTransactionId: existing._id,
          symbol: TRANSFER_CATEGORY.symbol,
          transactionKind: "transfer_in",
        });
        await ctx.db.patch(existing._id, { pairTransactionId: transferInId });
      }

      const updatedFromAccount = await ctx.db.get("accounts", args.accountId);
      const updatedToAccount = await ctx.db.get("accounts", args.toAccountId);
      if (updatedFromAccount) {
        await ctx.db.patch(args.accountId, {
          balance: updatedFromAccount.balance - args.amount - nextCharge,
        });
      }
      if (updatedToAccount) {
        await ctx.db.patch(args.toAccountId, {
          balance: updatedToAccount.balance + args.amount,
        });
      }

      const accountTransferTagId = await getOrCreateAccountTransferTagId(ctx);
      await replaceTransactionTags(ctx, existing._id, [
        ...args.tagIds,
        accountTransferTagId,
      ]);
      await replaceTransactionTags(ctx, transferInId, [accountTransferTagId]);

      if (oldCharge) {
        if (nextCharge > 0) {
          await ctx.db.patch(oldCharge._id, {
            accountId: args.accountId,
            amount: -nextCharge,
            currency: fromAccount.currency,
            date: args.date,
            merchant: `${merchant} TC`,
            parentTransactionId: existing._id,
          });
          await replaceChargeTransactionTags(ctx, oldCharge._id);
        } else {
          await deleteTransactionDocument(ctx, oldCharge);
        }
      } else if (nextCharge > 0) {
        const chargeId = await ctx.db.insert("transactions", {
          accountId: args.accountId,
          amount: -nextCharge,
          category: "Transaction charges",
          color: TRANSACTION_CHARGES_TAG_COLOR,
          createdByName,
          currency: fromAccount.currency,
          date: args.date,
          merchant: `${merchant} TC`,
          parentTransactionId: existing._id,
          symbol: "creditcard.fill",
          transactionKind: "charge",
        });
        await replaceChargeTransactionTags(ctx, chargeId);
      }

      return existing._id;
    }

    const oldAccount = await ctx.db.get("accounts", existing.accountId);
    const newAccount = await ctx.db.get("accounts", args.accountId);
    if (!oldAccount || !newAccount) {
      throw new Error("Account not found");
    }

    const merchant = args.merchant.trim() || args.category;
    const signedAmount = args.type === "expense" ? -args.amount : args.amount;
    const nextCharge =
      args.type === "expense" ? (args.transactionCharge ?? 0) : 0;

    const existingCharge =
      existing.pairTransactionId !== undefined
        ? await ctx.db.get("transactions", existing.pairTransactionId)
        : null;
    const oldChargeAmount =
      existingCharge && resolveTransactionKind(existingCharge) === "charge"
        ? Math.abs(existingCharge.amount)
        : 0;

    if (existing.accountId === args.accountId) {
      await ctx.db.patch(args.accountId, {
        balance:
          oldAccount.balance -
          existing.amount +
          signedAmount +
          oldChargeAmount -
          nextCharge,
      });
    } else {
      await ctx.db.patch(existing.accountId, {
        balance: oldAccount.balance - existing.amount - oldChargeAmount,
      });
      await ctx.db.patch(args.accountId, {
        balance: newAccount.balance + signedAmount - nextCharge,
      });
    }

    await ctx.db.patch(existing._id, {
      accountId: args.accountId,
      amount: signedAmount,
      category: args.category,
      color: args.color,
      currency: newAccount.currency,
      date: args.date,
      merchant,
      symbol: args.symbol,
      toAccountId: undefined,
      transactionKind: args.type,
    });

    if (existingCharge && resolveTransactionKind(existingCharge) === "charge") {
      if (nextCharge > 0) {
        await ctx.db.patch(existingCharge._id, {
          accountId: args.accountId,
          amount: -nextCharge,
          currency: newAccount.currency,
          date: args.date,
          merchant: `${merchant} TC`,
        });
        await replaceChargeTransactionTags(ctx, existingCharge._id);
      } else {
        await deleteTransactionArtifacts(ctx, existingCharge._id);
        await ctx.db.delete(existingCharge._id);
        await ctx.db.patch(existing._id, { pairTransactionId: undefined });
      }
    } else if (nextCharge > 0) {
      const createdByName =
        existing.createdByName ?? normalizeFirstName(args.createdByName ?? "");
      const chargeId = await ctx.db.insert("transactions", {
        accountId: args.accountId,
        amount: -nextCharge,
        category: "Transaction charges",
        color: "#8E8E93",
        createdByName,
        currency: newAccount.currency,
        date: args.date,
        merchant: `${merchant} TC`,
        parentTransactionId: existing._id,
        symbol: "creditcard.fill",
        transactionKind: "charge",
      });
      await ctx.db.patch(existing._id, { pairTransactionId: chargeId });
      await replaceChargeTransactionTags(ctx, chargeId);
    }

    await replaceTransactionTags(ctx, existing._id, args.tagIds);

    return existing._id;
  },
});

async function deleteTransactionArtifacts(
  ctx: MutationCtx,
  transactionId: Id<"transactions">
) {
  const tagLinks = await ctx.db
    .query("transactionTags")
    .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
    .collect();
  for (const link of tagLinks) {
    await ctx.db.delete(link._id);
  }

  const attachments = await ctx.db
    .query("transactionAttachments")
    .withIndex("by_transactionId", (q) => q.eq("transactionId", transactionId))
    .collect();
  for (const attachment of attachments) {
    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete(attachment._id);
  }
}

async function deleteTransactionDocument(
  ctx: MutationCtx,
  transaction: Doc<"transactions"> | null
) {
  if (!transaction) {
    return;
  }

  await deleteTransactionArtifacts(ctx, transaction._id);
  await ctx.db.delete(transaction._id);
}

export const deleteTransaction = mutation({
  args: {
    id: v.id("transactions"),
  },
  handler: async (ctx, args) => {
    const existing = await resolveEditableTransaction(ctx, args.id);
    if (!existing) {
      throw new Error("Transaction not found");
    }

    const kind = resolveTransactionKind(existing);

    if (kind === "transfer_out") {
      const inLeg = existing.pairTransactionId
        ? await ctx.db.get("transactions", existing.pairTransactionId)
        : null;
      const amount = Math.abs(existing.amount);
      const fromAccount = await ctx.db.get("accounts", existing.accountId);
      const toAccountId = existing.toAccountId ?? inLeg?.accountId;
      const toAccount = toAccountId
        ? await ctx.db.get("accounts", toAccountId)
        : null;
      const charge = await getChargeForParentTransaction(ctx, existing._id);
      const chargeAmount = charge ? Math.abs(charge.amount) : 0;

      if (fromAccount) {
        await ctx.db.patch(fromAccount._id, {
          balance: fromAccount.balance + amount + chargeAmount,
        });
      }
      if (toAccount) {
        await ctx.db.patch(toAccount._id, {
          balance: toAccount.balance - amount,
        });
      }

      await deleteTransactionDocument(ctx, charge);
      await deleteTransactionDocument(ctx, inLeg);
      await deleteTransactionDocument(ctx, existing);
      return existing._id;
    }

    const account = await ctx.db.get("accounts", existing.accountId);
    const charge =
      existing.pairTransactionId !== undefined
        ? await ctx.db.get("transactions", existing.pairTransactionId)
        : null;
    const chargeAmount =
      charge && resolveTransactionKind(charge) === "charge"
        ? Math.abs(charge.amount)
        : 0;

    if (account) {
      await ctx.db.patch(account._id, {
        balance: account.balance - existing.amount + chargeAmount,
      });
    }

    await deleteTransactionDocument(ctx, charge);
    await deleteTransactionDocument(ctx, existing);
    return existing._id;
  },
});

const transactionTemplateType = v.union(
  v.literal("expense"),
  v.literal("income"),
  v.literal("transfer")
);

async function loadTemplateTags(ctx: QueryCtx, tagIds: Id<"tags">[]) {
  return await loadPlannedPaymentTags(ctx, tagIds);
}

async function enrichTransactionTemplate(
  ctx: QueryCtx,
  template: Doc<"transactionTemplates">
) {
  const [account, toAccount, tags] = await Promise.all([
    ctx.db.get(template.accountId),
    template.toAccountId
      ? ctx.db.get(template.toAccountId)
      : Promise.resolve(null),
    loadTemplateTags(ctx, template.tagIds),
  ]);

  return {
    accountId: template.accountId,
    accountName: account?.name ?? "Unknown",
    amount: template.amount,
    category: template.category,
    color: template.color,
    currency: template.currency,
    id: template._id,
    merchant: template.merchant,
    name: template.name,
    symbol: template.symbol,
    tags,
    toAccountId: template.toAccountId ?? null,
    toAccountName: toAccount?.name ?? null,
    transactionCharge: template.transactionCharge ?? null,
    type: template.type,
  };
}

export const listTransactionTemplates = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("transactionTemplates").collect();
    const enriched = await Promise.all(
      templates
        .sort((a, b) => a.order - b.order)
        .map((template) => enrichTransactionTemplate(ctx, template))
    );
    return enriched;
  },
});

export const getTransactionTemplate = query({
  args: { id: v.id("transactionTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) {
      return null;
    }
    return await enrichTransactionTemplate(ctx, template);
  },
});

const transactionTemplateArgs = {
  accountId: v.id("accounts"),
  amount: v.number(),
  category: v.string(),
  color: v.string(),
  merchant: v.string(),
  name: v.string(),
  symbol: v.string(),
  tagIds: v.array(v.id("tags")),
  toAccountId: v.optional(v.id("accounts")),
  transactionCharge: v.optional(v.number()),
  type: transactionTemplateType,
};

async function validateTransactionTemplateArgs(
  ctx: MutationCtx,
  args: {
    name: string;
    accountId: Id<"accounts">;
    amount: number;
    type: "expense" | "income" | "transfer";
    toAccountId?: Id<"accounts">;
    transactionCharge?: number;
  }
) {
  const name = args.name.trim();
  if (!name || name.length > 80) {
    throw new Error("Template name must contain between 1 and 80 characters");
  }
  if (!Number.isFinite(args.amount) || args.amount < 0) {
    throw new Error("Template amount must be zero or positive");
  }
  if (
    args.transactionCharge !== undefined &&
    (!Number.isFinite(args.transactionCharge) || args.transactionCharge <= 0)
  ) {
    throw new Error("Transaction charge must be positive");
  }

  const account = await ctx.db.get(args.accountId);
  if (!account) {
    throw new Error("Account not found");
  }

  if (args.type === "transfer") {
    if (!args.toAccountId) {
      throw new Error("Transfer templates require a destination account");
    }
    if (args.accountId === args.toAccountId) {
      throw new Error("Transfer accounts must be different");
    }
    const toAccount = await ctx.db.get(args.toAccountId);
    if (!toAccount) {
      throw new Error("Destination account not found");
    }
    if (account.currency !== toAccount.currency) {
      throw new Error("Transfer accounts must use the same currency");
    }
  }

  return { account, name };
}

export const createTransactionTemplate = mutation({
  args: transactionTemplateArgs,
  handler: async (ctx, args) => {
    const { name, account } = await validateTransactionTemplateArgs(ctx, args);
    const templates = await ctx.db.query("transactionTemplates").collect();
    const nextOrder =
      templates.length === 0
        ? 0
        : Math.max(...templates.map((template) => template.order)) + 1;

    return await ctx.db.insert("transactionTemplates", {
      accountId: args.accountId,
      amount: args.amount,
      category:
        args.type === "transfer" ? TRANSFER_CATEGORY.name : args.category,
      color: args.type === "transfer" ? TRANSFER_CATEGORY.color : args.color,
      currency: account.currency,
      merchant: args.merchant.trim(),
      name,
      order: nextOrder,
      symbol: args.type === "transfer" ? TRANSFER_CATEGORY.symbol : args.symbol,
      tagIds: [...new Set(args.tagIds)],
      toAccountId: args.type === "transfer" ? args.toAccountId : undefined,
      transactionCharge:
        (args.type === "expense" || args.type === "transfer") &&
        args.transactionCharge
          ? args.transactionCharge
          : undefined,
      type: args.type,
    });
  },
});

export const updateTransactionTemplate = mutation({
  args: { id: v.id("transactionTemplates"), ...transactionTemplateArgs },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Template not found");
    }
    const { name, account } = await validateTransactionTemplateArgs(ctx, args);

    await ctx.db.patch(args.id, {
      accountId: args.accountId,
      amount: args.amount,
      category:
        args.type === "transfer" ? TRANSFER_CATEGORY.name : args.category,
      color: args.type === "transfer" ? TRANSFER_CATEGORY.color : args.color,
      currency: account.currency,
      merchant: args.merchant.trim(),
      name,
      symbol: args.type === "transfer" ? TRANSFER_CATEGORY.symbol : args.symbol,
      tagIds: [...new Set(args.tagIds)],
      toAccountId: args.type === "transfer" ? args.toAccountId : undefined,
      transactionCharge:
        (args.type === "expense" || args.type === "transfer") &&
        args.transactionCharge
          ? args.transactionCharge
          : undefined,
      type: args.type,
    });

    return args.id;
  },
});

export const deleteTransactionTemplate = mutation({
  args: { id: v.id("transactionTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

type PlannedFrequency = "once" | "weekly" | "monthly" | "yearly";

function startOfDay(ms: number): number {
  const date = new Date(ms);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
}

/** Next due date after `date`; Infinity for one-off payments. */
function advancePlannedDate(
  date: number,
  frequency: PlannedFrequency,
  interval: number
): number {
  const step = Math.max(1, Math.round(interval));
  const next = new Date(date);
  switch (frequency) {
    case "weekly": {
      next.setDate(next.getDate() + 7 * step);
      return next.getTime();
    }
    case "monthly": {
      next.setMonth(next.getMonth() + step);
      return next.getTime();
    }
    case "yearly": {
      next.setFullYear(next.getFullYear() + step);
      return next.getTime();
    }
    default: {
      return Number.POSITIVE_INFINITY;
    }
  }
}

function entriesByDay(
  entries: Doc<"plannedPaymentEntries">[]
): Map<number, Doc<"plannedPaymentEntries">> {
  return new Map(entries.map((entry) => [startOfDay(entry.dueDate), entry]));
}

/** Earliest pending occurrence + number of overdue pending occurrences. */
function summarizePlannedPayment(
  payment: Doc<"plannedPayments">,
  entries: Doc<"plannedPaymentEntries">[],
  now: number
): { overdueCount: number; nextDueDate: number | null } {
  const todayStart = startOfDay(now);
  const resolvedByDay = entriesByDay(entries);
  let date = payment.startDate;
  let overdueCount = 0;
  let nextDueDate: number | null = null;

  for (let i = 0; i < 600; i += 1) {
    const dayKey = startOfDay(date);
    if (!resolvedByDay.has(dayKey)) {
      if (nextDueDate === null) {
        nextDueDate = date;
      }
      if (dayKey < todayStart) {
        overdueCount += 1;
      }
    }
    if (payment.frequency === "once") {
      break;
    }
    date = advancePlannedDate(date, payment.frequency, payment.interval);
    if (!Number.isFinite(date)) {
      break;
    }
    if (startOfDay(date) > todayStart && nextDueDate !== null) {
      break;
    }
  }

  return { nextDueDate, overdueCount };
}

/** Resolved + upcoming occurrences for the detail view, newest first. */
function buildPlannedOccurrences(
  payment: Doc<"plannedPayments">,
  entries: Doc<"plannedPaymentEntries">[],
  now: number
) {
  const todayStart = startOfDay(now);
  const resolvedByDay = entriesByDay(entries);
  const occurrences: {
    dueDate: number;
    status: "pending" | "paid" | "skipped";
    paidDate: number | null;
  }[] = [];
  let date = payment.startDate;
  let futureCount = 0;

  for (let i = 0; i < 600; i += 1) {
    const dayKey = startOfDay(date);
    if (dayKey > todayStart) {
      futureCount += 1;
    }
    const entry = resolvedByDay.get(dayKey);
    occurrences.push({
      dueDate: date,
      paidDate: entry?.paidDate ?? null,
      status: entry ? entry.status : "pending",
    });
    if (payment.frequency === "once") {
      break;
    }
    date = advancePlannedDate(date, payment.frequency, payment.interval);
    if (!Number.isFinite(date) || futureCount >= 2) {
      break;
    }
  }

  occurrences.sort((a, b) => b.dueDate - a.dueDate);
  return occurrences.slice(0, 24);
}

async function loadPlannedPaymentTags(ctx: QueryCtx, tagIds: Id<"tags">[]) {
  const uniqueIds = [...new Set(tagIds)];
  const tagDocs = await Promise.all(
    uniqueIds.map((id) => ctx.db.get("tags", id))
  );
  return tagDocs
    .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
    .map((tag) => ({
      color: tag.color ?? DEFAULT_TAG_COLOR,
      id: tag._id,
      name: tag.name,
    }));
}

async function countOverduePlannedPayments(ctx: QueryCtx): Promise<number> {
  const payments = await ctx.db.query("plannedPayments").collect();
  if (payments.length === 0) {
    return 0;
  }
  const now = Date.now();
  let total = 0;
  for (const payment of payments) {
    const entries = await ctx.db
      .query("plannedPaymentEntries")
      .withIndex("by_plannedPaymentId", (q) =>
        q.eq("plannedPaymentId", payment._id)
      )
      .collect();
    total += summarizePlannedPayment(payment, entries, now).overdueCount;
  }
  return total;
}

export const listPlannedPayments = query({
  args: {},
  handler: async (ctx) => {
    const payments = await ctx.db.query("plannedPayments").collect();
    if (payments.length === 0) {
      return [];
    }

    const accounts = await ctx.db.query("accounts").collect();
    const accountNameById = new Map(
      accounts.map((account) => [account._id, account.name])
    );
    const now = Date.now();
    const todayStart = startOfDay(now);

    const enriched = await Promise.all(
      payments.map(async (payment) => {
        const entries = await ctx.db
          .query("plannedPaymentEntries")
          .withIndex("by_plannedPaymentId", (q) =>
            q.eq("plannedPaymentId", payment._id)
          )
          .collect();
        const { overdueCount, nextDueDate } = summarizePlannedPayment(
          payment,
          entries,
          now
        );
        const tags = await loadPlannedPaymentTags(ctx, payment.tagIds);
        const nextDayKey =
          nextDueDate === null ? null : startOfDay(nextDueDate);
        const dueStatus =
          nextDayKey === null
            ? ("completed" as const)
            : nextDayKey < todayStart
              ? ("overdue" as const)
              : nextDayKey === todayStart
                ? ("today" as const)
                : ("upcoming" as const);

        return {
          accountId: payment.accountId,
          accountName: accountNameById.get(payment.accountId) ?? "Unknown",
          amount: payment.amount,
          category: payment.category,
          color: payment.categoryColor,
          currency: payment.currency,
          daysUntilDue:
            nextDayKey === null
              ? null
              : Math.round((nextDayKey - todayStart) / DAY_MS),
          description: payment.description,
          dueStatus,
          frequency: payment.frequency,
          id: payment._id,
          interval: payment.interval,
          name: payment.name,
          nextDueDate:
            nextDueDate === null ? null : new Date(nextDueDate).toISOString(),
          notifyOnDue: payment.notifyOnDue ?? false,
          notifyOnOverdue: payment.notifyOnOverdue ?? false,
          overdueCount,
          symbol: payment.categorySymbol,
          tags,
          type: payment.type,
        };
      })
    );

    return enriched.sort((a, b) => {
      if (a.nextDueDate === null && b.nextDueDate === null) {
        return 0;
      }
      if (a.nextDueDate === null) {
        return 1;
      }
      if (b.nextDueDate === null) {
        return -1;
      }
      return a.nextDueDate.localeCompare(b.nextDueDate);
    });
  },
});

export const getPlannedPayment = query({
  args: { id: v.id("plannedPayments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get("plannedPayments", args.id);
    if (!payment) {
      return null;
    }

    const [entries, account, tags] = await Promise.all([
      ctx.db
        .query("plannedPaymentEntries")
        .withIndex("by_plannedPaymentId", (q) =>
          q.eq("plannedPaymentId", payment._id)
        )
        .collect(),
      ctx.db.get("accounts", payment.accountId),
      loadPlannedPaymentTags(ctx, payment.tagIds),
    ]);

    const now = Date.now();
    const todayStart = startOfDay(now);
    const signedAmount =
      payment.type === "expense" ? -payment.amount : payment.amount;
    const { overdueCount } = summarizePlannedPayment(payment, entries, now);
    const occurrences = buildPlannedOccurrences(payment, entries, now).map(
      (occurrence) => ({
        amount: signedAmount,
        daysUntilDue: Math.round(
          (startOfDay(occurrence.dueDate) - todayStart) / DAY_MS
        ),
        dueDate: new Date(occurrence.dueDate).toISOString(),
        paidDate: occurrence.paidDate
          ? new Date(occurrence.paidDate).toISOString()
          : null,
        status: occurrence.status,
      })
    );

    return {
      accountId: payment.accountId,
      accountName: account?.name ?? "Unknown",
      amount: payment.amount,
      category: payment.category,
      color: payment.categoryColor,
      currency: payment.currency,
      description: payment.description,
      frequency: payment.frequency,
      id: payment._id,
      interval: payment.interval,
      name: payment.name,
      notifyOnDue: payment.notifyOnDue ?? false,
      notifyOnOverdue: payment.notifyOnOverdue ?? false,
      occurrences,
      overdueCount,
      startDate: new Date(payment.startDate).toISOString(),
      symbol: payment.categorySymbol,
      tags,
      type: payment.type,
    };
  },
});

const plannedPaymentArgs = {
  accountId: v.id("accounts"),
  amount: v.number(),
  category: v.string(),
  categoryColor: v.string(),
  categorySymbol: v.string(),
  description: v.string(),
  frequency: plannedPaymentFrequency,
  interval: v.number(),
  name: v.string(),
  notifyOnDue: v.boolean(),
  notifyOnOverdue: v.boolean(),
  startDate: v.number(),
  tagIds: v.array(v.id("tags")),
  type: plannedPaymentType,
};

async function validatePlannedPaymentArgs(
  ctx: MutationCtx,
  args: {
    name: string;
    amount: number;
    accountId: Id<"accounts">;
    interval: number;
  }
) {
  const name = args.name.trim();
  if (!name || name.length > 80) {
    throw new Error("Payment name must contain between 1 and 80 characters");
  }
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new Error("Planned payment amount must be positive");
  }
  if (!Number.isFinite(args.interval) || args.interval < 1) {
    throw new Error("Repeat interval must be at least 1");
  }
  const account = await ctx.db.get("accounts", args.accountId);
  if (!account) {
    throw new Error("Account not found");
  }
  return { account, name };
}

export const createPlannedPayment = mutation({
  args: plannedPaymentArgs,
  handler: async (ctx, args) => {
    const { name, account } = await validatePlannedPaymentArgs(ctx, args);
    const payments = await ctx.db.query("plannedPayments").collect();
    const nextOrder =
      payments.length === 0
        ? 0
        : Math.max(...payments.map((payment) => payment.order)) + 1;

    return await ctx.db.insert("plannedPayments", {
      accountId: args.accountId,
      amount: args.amount,
      category: args.category,
      categoryColor: args.categoryColor,
      categorySymbol: args.categorySymbol,
      currency: account.currency,
      description: args.description.trim(),
      frequency: args.frequency,
      interval: Math.max(1, Math.round(args.interval)),
      name,
      notifyOnDue: args.notifyOnDue,
      notifyOnOverdue: args.notifyOnOverdue,
      order: nextOrder,
      startDate: args.startDate,
      tagIds: [...new Set(args.tagIds)],
      type: args.type,
    });
  },
});

export const updatePlannedPayment = mutation({
  args: { id: v.id("plannedPayments"), ...plannedPaymentArgs },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get("plannedPayments", args.id);
    if (!existing) {
      throw new Error("Planned payment not found");
    }
    const { name, account } = await validatePlannedPaymentArgs(ctx, args);

    await ctx.db.patch(args.id, {
      accountId: args.accountId,
      amount: args.amount,
      category: args.category,
      categoryColor: args.categoryColor,
      categorySymbol: args.categorySymbol,
      currency: account.currency,
      description: args.description.trim(),
      frequency: args.frequency,
      interval: Math.max(1, Math.round(args.interval)),
      name,
      notifyOnDue: args.notifyOnDue,
      notifyOnOverdue: args.notifyOnOverdue,
      startDate: args.startDate,
      tagIds: [...new Set(args.tagIds)],
      type: args.type,
    });

    return args.id;
  },
});

export const deletePlannedPayment = mutation({
  args: { id: v.id("plannedPayments") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("plannedPaymentEntries")
      .withIndex("by_plannedPaymentId", (q) =>
        q.eq("plannedPaymentId", args.id)
      )
      .collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const markPlannedPaymentPaid = mutation({
  args: {
    createdByName: v.optional(v.string()),
    dueDate: v.number(),
    id: v.id("plannedPayments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get("plannedPayments", args.id);
    if (!payment) {
      throw new Error("Planned payment not found");
    }

    const dueDay = startOfDay(args.dueDate);
    const existingEntries = await ctx.db
      .query("plannedPaymentEntries")
      .withIndex("by_plannedPaymentId", (q) =>
        q.eq("plannedPaymentId", payment._id)
      )
      .collect();
    if (existingEntries.some((entry) => startOfDay(entry.dueDate) === dueDay)) {
      throw new Error("This occurrence has already been resolved");
    }

    const account = await ctx.db.get("accounts", payment.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const signedAmount =
      payment.type === "expense" ? -payment.amount : payment.amount;
    const merchant = payment.description.trim() || payment.name;
    const createdByName = normalizeFirstName(args.createdByName ?? "");
    const transactionId = await ctx.db.insert("transactions", {
      accountId: payment.accountId,
      amount: signedAmount,
      category: payment.category,
      color: payment.categoryColor,
      createdByName,
      currency: payment.currency,
      date: args.dueDate,
      merchant,
      symbol: payment.categorySymbol,
      transactionKind: payment.type,
    });
    await replaceTransactionTags(ctx, transactionId, payment.tagIds);
    await ctx.db.patch(payment.accountId, {
      balance: account.balance + signedAmount,
    });

    await ctx.db.insert("plannedPaymentEntries", {
      dueDate: args.dueDate,
      paidDate: Date.now(),
      plannedPaymentId: payment._id,
      status: "paid",
      transactionId,
    });

    return transactionId;
  },
});

export const skipPlannedPaymentOccurrence = mutation({
  args: { dueDate: v.number(), id: v.id("plannedPayments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get("plannedPayments", args.id);
    if (!payment) {
      throw new Error("Planned payment not found");
    }

    const dueDay = startOfDay(args.dueDate);
    const existingEntries = await ctx.db
      .query("plannedPaymentEntries")
      .withIndex("by_plannedPaymentId", (q) =>
        q.eq("plannedPaymentId", payment._id)
      )
      .collect();
    if (existingEntries.some((entry) => startOfDay(entry.dueDate) === dueDay)) {
      return args.id;
    }

    await ctx.db.insert("plannedPaymentEntries", {
      dueDate: args.dueDate,
      plannedPaymentId: payment._id,
      status: "skipped",
    });

    return args.id;
  },
});
