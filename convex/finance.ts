import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import {
  accountType,
  budgetPeriod,
  plannedPaymentFrequency,
  plannedPaymentType,
} from './schema';

const DAY_MS = 86_400_000;

type BudgetPeriod = 'weekly' | 'monthly' | 'yearly' | 'one_time';

/** Epoch millis for the start of a budget's current period window. */
function budgetPeriodStart(period: BudgetPeriod, now: number): number {
  const date = new Date(now);
  switch (period) {
    case 'weekly': {
      const daysSinceMonday = (date.getDay() + 6) % 7;
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - daysSinceMonday
      ).getTime();
    }
    case 'yearly':
      return new Date(date.getFullYear(), 0, 1).getTime();
    case 'one_time':
      return 0;
    default:
      return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  }
}

/** Loads budgets with `spent` computed live from matching-category expenses. */
async function loadBudgetsWithSpend(ctx: QueryCtx) {
  const budgets = (await ctx.db.query('budgets').collect()).sort((a, b) => a.order - b.order);
  if (budgets.length === 0) {
    return [];
  }

  const now = Date.now();
  const trackedCategories = new Set(
    budgets.map((budget) => budget.category).filter((name): name is string => Boolean(name))
  );
  const earliestStart = Math.min(
    ...budgets.map((budget) => budgetPeriodStart(budget.period ?? 'monthly', now))
  );

  const expenses =
    trackedCategories.size === 0
      ? []
      : (await ctx.db.query('transactions').collect()).filter(
          (transaction) =>
            transaction.amount < 0 &&
            transaction.date >= earliestStart &&
            trackedCategories.has(transaction.category)
        );

  return budgets.map((budget) => {
    const period = budget.period ?? 'monthly';
    let spent = budget.spent ?? 0;
    if (budget.category) {
      const periodStart = budgetPeriodStart(period, now);
      spent = expenses
        .filter(
          (transaction) =>
            transaction.category === budget.category && transaction.date >= periodStart
        )
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    }

    return {
      id: budget._id,
      name: budget.name,
      spent,
      limit: budget.limit,
      currency: budget.currency,
      symbol: budget.symbol,
      color: budget.color,
      period,
      category: budget.category ?? null,
      tagId: budget.tagId ?? null,
      notifyOnOverspend: budget.notifyOnOverspend ?? false,
      notifyAtThreshold: budget.notifyAtThreshold ?? false,
    };
  });
}

const normalizeLookupName = (name: string) => name.trim().toLocaleLowerCase();
const DEFAULT_TAG_COLOR = '#8E8E93';
const TRANSFER_CATEGORY = {
  name: 'Transfer',
  symbol: 'arrow.left.arrow.right',
  color: '#6366F1',
};
const TRANSACTION_CHARGES_TAG_NAME = 'Transaction charges';
const TRANSACTION_CHARGES_TAG_COLOR = '#8E8E93';
const ACCOUNT_TRANSFER_TAG_NAME = 'Account transfer';
const ACCOUNT_TRANSFER_TAG_COLOR = '#6366F1';
const BALANCE_ADJUSTMENT_CATEGORY = {
  name: 'Balance adjustment',
  symbol: 'plus.forwardslash.minus',
  color: '#8E8E93',
};

function resolveTransactionKind(transaction: Doc<'transactions'>) {
  if (transaction.transactionKind) {
    return transaction.transactionKind;
  }
  if (transaction.category === 'Transaction charges') {
    return 'charge' as const;
  }
  if (transaction.category === 'Transfer') {
    return transaction.amount < 0 ? ('transfer_out' as const) : ('transfer_in' as const);
  }
  return transaction.amount >= 0 ? ('income' as const) : ('expense' as const);
}

async function loadPairTransactions(
  ctx: QueryCtx,
  transactions: Doc<'transactions'>[]
): Promise<Map<Id<'transactions'>, Doc<'transactions'>>> {
  const pairIds = [
    ...new Set(
      transactions
        .map((transaction) => transaction.pairTransactionId)
        .filter((id): id is Id<'transactions'> => id !== undefined)
    ),
  ];
  const pairs = await Promise.all(pairIds.map((id) => ctx.db.get('transactions', id)));
  return new Map(
    pairs
      .filter((pair): pair is Doc<'transactions'> => pair !== null)
      .map((pair) => [pair._id, pair])
  );
}

async function enrichTransactions(
  ctx: QueryCtx,
  transactions: Doc<'transactions'>[],
  accountNameById: Map<Id<'accounts'>, string>
) {
  if (transactions.length === 0) {
    return [];
  }

  const tagLinksByTxn = await Promise.all(
    transactions.map((transaction) =>
      ctx.db
        .query('transactionTags')
        .withIndex('by_transactionId', (q) => q.eq('transactionId', transaction._id))
        .collect()
    )
  );

  const uniqueTagIds = new Set<Id<'tags'>>();
  for (const links of tagLinksByTxn) {
    for (const link of links) {
      uniqueTagIds.add(link.tagId);
    }
  }

  const tagDocs = await Promise.all([...uniqueTagIds].map((tagId) => ctx.db.get('tags', tagId)));
  const tagById = new Map(
    tagDocs
      .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
      .map((tag) => [tag._id, tag])
  );
  const pairById = await loadPairTransactions(ctx, transactions);

  return transactions.map((transaction, index) => {
    const kind = resolveTransactionKind(transaction);
    const pair = transaction.pairTransactionId
      ? pairById.get(transaction.pairTransactionId)
      : undefined;
    let transactionChargeAmount: number | null = null;
    if (pair && resolveTransactionKind(pair) === 'charge') {
      transactionChargeAmount = Math.abs(pair.amount);
    }

    let toAccountId: Id<'accounts'> | undefined;
    let toAccountName: string | undefined;
    let fromAccountId: Id<'accounts'> | undefined;
    let fromAccountName: string | undefined;

    if (kind === 'transfer_out' && transaction.toAccountId) {
      toAccountId = transaction.toAccountId;
      toAccountName = accountNameById.get(toAccountId);
      fromAccountId = transaction.accountId;
      fromAccountName = accountNameById.get(transaction.accountId);
    } else if (kind === 'transfer_in' && pair && resolveTransactionKind(pair) === 'transfer_out') {
      fromAccountId = pair.accountId;
      fromAccountName = accountNameById.get(pair.accountId);
      toAccountId = transaction.accountId;
      toAccountName = accountNameById.get(transaction.accountId);
    }

    return {
      id: transaction._id,
      accountId: transaction.accountId,
      accountName: accountNameById.get(transaction.accountId) ?? 'Unknown',
      merchant: transaction.merchant,
      category: transaction.category,
      amount: transaction.amount,
      currency: transaction.currency,
      date: new Date(transaction.date).toISOString(),
      symbol: transaction.symbol,
      color: transaction.color,
      transactionKind: kind,
      transactionChargeAmount,
      parentTransactionId: transaction.parentTransactionId,
      fromAccountId,
      fromAccountName,
      toAccountId,
      toAccountName,
      tags: tagLinksByTxn[index]
        .map((link) => tagById.get(link.tagId))
        .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
        .map((tag) => ({
          id: tag._id,
          name: tag.name,
          color: tag.color ?? DEFAULT_TAG_COLOR,
        })),
    };
  });
}

async function resolveEditableTransaction(
  ctx: Pick<QueryCtx, 'db'>,
  id: Id<'transactions'>
) {
  const transaction = await ctx.db.get('transactions', id);
  if (!transaction) {
    return null;
  }

  const kind = resolveTransactionKind(transaction);
  if (kind === 'charge' && transaction.parentTransactionId) {
    return await ctx.db.get('transactions', transaction.parentTransactionId);
  }
  if (kind === 'transfer_in' && transaction.pairTransactionId) {
    const outLeg = await ctx.db.get('transactions', transaction.pairTransactionId);
    if (outLeg) {
      return outLeg;
    }
  }

  return transaction;
}

function transactionTypeFromKind(kind: ReturnType<typeof resolveTransactionKind>) {
  if (kind === 'income') return 'income' as const;
  if (kind === 'transfer_out' || kind === 'transfer_in') return 'transfer' as const;
  return 'expense' as const;
}

async function replaceTransactionTags(
  ctx: MutationCtx,
  transactionId: Id<'transactions'>,
  tagIds: Id<'tags'>[]
) {
  const existingLinks = await ctx.db
    .query('transactionTags')
    .withIndex('by_transactionId', (q) => q.eq('transactionId', transactionId))
    .collect();
  for (const link of existingLinks) {
    await ctx.db.delete(link._id);
  }

  for (const tagId of [...new Set(tagIds)]) {
    const tag = await ctx.db.get('tags', tagId);
    if (!tag) {
      throw new Error('Tag not found');
    }
    await ctx.db.insert('transactionTags', { tagId, transactionId });
  }
}

async function getOrCreateTransactionChargesTagId(ctx: MutationCtx): Promise<Id<'tags'>> {
  const normalizedName = normalizeLookupName(TRANSACTION_CHARGES_TAG_NAME);
  const existing = await ctx.db
    .query('tags')
    .withIndex('by_normalizedName', (q) => q.eq('normalizedName', normalizedName))
    .unique();
  if (existing) {
    return existing._id;
  }

  return await ctx.db.insert('tags', {
    color: TRANSACTION_CHARGES_TAG_COLOR,
    name: TRANSACTION_CHARGES_TAG_NAME,
    normalizedName,
  });
}

async function getOrCreateAccountTransferTagId(ctx: MutationCtx): Promise<Id<'tags'>> {
  const normalizedName = normalizeLookupName(ACCOUNT_TRANSFER_TAG_NAME);
  const existing = await ctx.db
    .query('tags')
    .withIndex('by_normalizedName', (q) => q.eq('normalizedName', normalizedName))
    .unique();
  if (existing) {
    return existing._id;
  }

  return await ctx.db.insert('tags', {
    color: ACCOUNT_TRANSFER_TAG_COLOR,
    name: ACCOUNT_TRANSFER_TAG_NAME,
    normalizedName,
  });
}

async function replaceChargeTransactionTags(
  ctx: MutationCtx,
  transactionId: Id<'transactions'>
) {
  const tagId = await getOrCreateTransactionChargesTagId(ctx);
  await replaceTransactionTags(ctx, transactionId, [tagId]);
}

/**
 * Returns everything the dashboard needs in a single round trip. The shape
 * mirrors the `FinanceSnapshot` type the UI consumes, so the client can swap
 * the local mock for `useQuery(api.finance.getSnapshot)` without further edits.
 */
export const getSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const [accounts, transactions, budgets, plannedPaymentsOverdueCount] = await Promise.all([
      ctx.db.query('accounts').collect(),
      ctx.db.query('transactions').order('desc').take(25),
      loadBudgetsWithSpend(ctx),
      countOverduePlannedPayments(ctx),
    ]);

    const accountNameById = new Map(accounts.map((account) => [account._id, account.name]));
    const visibleTransactions = transactions.slice(0, 10);

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
      transactions: await enrichTransactions(ctx, visibleTransactions, accountNameById),
      budgets,
      plannedPaymentsOverdueCount,
    };
  },
});

export const listAccountTransactions = query({
  args: {
    accountId: v.id('accounts'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query('transactions')
      .withIndex('by_accountId_and_date', (q) => q.eq('accountId', args.accountId))
      .order('desc')
      .paginate(args.paginationOpts);

    const account = await ctx.db.get('accounts', args.accountId);
    const accountNameById = new Map([
      [args.accountId, account?.name ?? 'Unknown'],
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
      ctx.db.query('accounts').collect(),
      ctx.db.query('transactions').order('desc').take(500),
    ]);
    const accountNameById = new Map(accounts.map((account) => [account._id, account.name]));
    return await enrichTransactions(ctx, transactions, accountNameById);
  },
});

export const getTransaction = query({
  args: {
    id: v.id('transactions'),
  },
  handler: async (ctx, args) => {
    const transaction = await resolveEditableTransaction(ctx, args.id);
    if (!transaction) {
      return null;
    }

    const accounts = await ctx.db.query('accounts').collect();
    const accountNameById = new Map(accounts.map((account) => [account._id, account.name]));
    const [item] = await enrichTransactions(ctx, [transaction], accountNameById);
    const kind = resolveTransactionKind(transaction);

    return {
      ...item,
      type: transactionTypeFromKind(kind),
    };
  },
});

const accountArgs = {
  name: v.string(),
  type: accountType,
  balance: v.number(),
  currency: v.string(),
  symbol: v.string(),
  color: v.string(),
};

export const createAccount = mutation({
  args: accountArgs,
  handler: async (ctx, args) => {
    const accounts = await ctx.db.query('accounts').collect();
    const nextOrder =
      accounts.length === 0 ? 0 : Math.max(...accounts.map((account) => account.order)) + 1;

    return await ctx.db.insert('accounts', {
      ...args,
      institution: args.type === 'cash' ? 'Cash' : '',
      order: nextOrder,
    });
  },
});

export const updateAccount = mutation({
  args: {
    id: v.id('accounts'),
    ...accountArgs,
    balanceUpdateMode: v.optional(v.union(v.literal('record'), v.literal('initial'))),
  },
  handler: async (ctx, args) => {
    const { balanceUpdateMode, id, ...patch } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Account not found');
    }
    const balanceDelta = patch.balance - existing.balance;

    await ctx.db.patch(id, {
      ...patch,
      institution: patch.type === 'cash' ? 'Cash' : '',
    });

    if ((balanceUpdateMode ?? 'initial') === 'record' && balanceDelta !== 0) {
      await ctx.db.insert('transactions', {
        accountId: id,
        amount: balanceDelta,
        category: BALANCE_ADJUSTMENT_CATEGORY.name,
        color: BALANCE_ADJUSTMENT_CATEGORY.color,
        currency: patch.currency,
        date: Date.now(),
        merchant: BALANCE_ADJUSTMENT_CATEGORY.name,
        symbol: BALANCE_ADJUSTMENT_CATEGORY.symbol,
        transactionKind: balanceDelta > 0 ? 'income' : 'expense',
      });
    }

    return id;
  },
});

export const deleteAccount = mutation({
  args: {
    id: v.id('accounts'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query('categories').take(500);
    return categories.map((category) => ({
      id: category._id,
      name: category.name,
      symbol: category.symbol,
      color: category.color,
    }));
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    symbol: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const normalizedName = normalizeLookupName(name);
    if (!name || name.length > 80) {
      throw new Error('Category name must contain between 1 and 80 characters');
    }

    const existing = await ctx.db
      .query('categories')
      .withIndex('by_normalizedName', (q) => q.eq('normalizedName', normalizedName))
      .unique();
    if (existing) {
      return {
        id: existing._id,
        color: existing.color,
        name: existing.name,
        symbol: existing.symbol,
      };
    }

    const id = await ctx.db.insert('categories', {
      color: args.color,
      name,
      normalizedName,
      symbol: args.symbol,
    });
    return { id, color: args.color, name, symbol: args.symbol };
  },
});

export const listTags = query({
  args: {},
  handler: async (ctx) => {
    const tags = await ctx.db.query('tags').take(500);
    return tags.map((tag) => ({
      id: tag._id,
      name: tag.name,
      color: tag.color ?? '#8E8E93',
    }));
  },
});

export const createTag = mutation({
  args: { color: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const normalizedName = normalizeLookupName(name);
    if (!name || name.length > 50) {
      throw new Error('Tag name must contain between 1 and 50 characters');
    }

    const existing = await ctx.db
      .query('tags')
      .withIndex('by_normalizedName', (q) => q.eq('normalizedName', normalizedName))
      .unique();
    if (existing) {
      return { color: existing.color ?? args.color, id: existing._id, name: existing.name };
    }

    const id = await ctx.db.insert('tags', {
      color: args.color,
      name,
      normalizedName,
    });
    return { color: args.color, id, name };
  },
});

export const createBudget = mutation({
  args: {
    name: v.string(),
    limit: v.number(),
    currency: v.string(),
    category: v.string(),
    symbol: v.string(),
    color: v.string(),
    period: budgetPeriod,
    tagId: v.optional(v.id('tags')),
    notifyOnOverspend: v.boolean(),
    notifyAtThreshold: v.boolean(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name || name.length > 80) {
      throw new Error('Budget name must contain between 1 and 80 characters');
    }
    if (!Number.isFinite(args.limit) || args.limit <= 0) {
      throw new Error('Budget amount must be positive');
    }
    if (args.tagId) {
      const tag = await ctx.db.get('tags', args.tagId);
      if (!tag) {
        throw new Error('Tag not found');
      }
    }

    const budgets = await ctx.db.query('budgets').collect();
    const nextOrder =
      budgets.length === 0 ? 0 : Math.max(...budgets.map((budget) => budget.order)) + 1;

    return await ctx.db.insert('budgets', {
      name,
      limit: args.limit,
      currency: args.currency,
      category: args.category,
      symbol: args.symbol,
      color: args.color,
      period: args.period,
      tagId: args.tagId,
      notifyOnOverspend: args.notifyOnOverspend,
      notifyAtThreshold: args.notifyAtThreshold,
      order: nextOrder,
    });
  },
});

export const updateBudget = mutation({
  args: {
    id: v.id('budgets'),
    name: v.string(),
    limit: v.number(),
    currency: v.string(),
    category: v.string(),
    symbol: v.string(),
    color: v.string(),
    period: budgetPeriod,
    tagId: v.optional(v.id('tags')),
    notifyOnOverspend: v.boolean(),
    notifyAtThreshold: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Budget not found');
    }

    const name = args.name.trim();
    if (!name || name.length > 80) {
      throw new Error('Budget name must contain between 1 and 80 characters');
    }
    if (!Number.isFinite(args.limit) || args.limit <= 0) {
      throw new Error('Budget amount must be positive');
    }
    if (args.tagId) {
      const tag = await ctx.db.get('tags', args.tagId);
      if (!tag) {
        throw new Error('Tag not found');
      }
    }

    await ctx.db.patch(args.id, {
      name,
      limit: args.limit,
      currency: args.currency,
      category: args.category,
      symbol: args.symbol,
      color: args.color,
      period: args.period,
      tagId: args.tagId,
      notifyOnOverspend: args.notifyOnOverspend,
      notifyAtThreshold: args.notifyAtThreshold,
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
    accountId: v.id('accounts'),
    amount: v.number(),
    category: v.string(),
    color: v.string(),
    date: v.number(),
    merchant: v.string(),
    symbol: v.string(),
    tagIds: v.array(v.id('tags')),
    attachments: v.array(
      v.object({
        storageId: v.id('_storage'),
        name: v.string(),
        mimeType: v.optional(v.string()),
        size: v.optional(v.number()),
      })
    ),
    toAccountId: v.optional(v.id('accounts')),
    transactionCharge: v.optional(v.number()),
    type: v.union(v.literal('expense'), v.literal('income'), v.literal('transfer')),
  },
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error('Transaction amounts must be positive');
    }
    if (
      args.transactionCharge !== undefined &&
      (!Number.isFinite(args.transactionCharge) || args.transactionCharge <= 0)
    ) {
      throw new Error('Transaction charge must be positive');
    }

    if (args.type === 'transfer') {
      if (!args.toAccountId) {
        throw new Error('Transfer requires a destination account');
      }
      if (args.accountId === args.toAccountId) {
        throw new Error('Transfer accounts must be different');
      }

      const fromAccount = await ctx.db.get('accounts', args.accountId);
      const toAccount = await ctx.db.get('accounts', args.toAccountId);
      if (!fromAccount || !toAccount) {
        throw new Error('Account not found');
      }
      if (fromAccount.currency !== toAccount.currency) {
        throw new Error('Transfer accounts must use the same currency');
      }

      const merchant = args.merchant.trim() || `Transfer to ${toAccount.name}`;
      const transferOutId = await ctx.db.insert('transactions', {
        accountId: args.accountId,
        amount: -args.amount,
        category: TRANSFER_CATEGORY.name,
        color: TRANSFER_CATEGORY.color,
        currency: fromAccount.currency,
        date: args.date,
        merchant,
        symbol: TRANSFER_CATEGORY.symbol,
        transactionKind: 'transfer_out',
        toAccountId: args.toAccountId,
      });
      const transferInId = await ctx.db.insert('transactions', {
        accountId: args.toAccountId,
        amount: args.amount,
        category: TRANSFER_CATEGORY.name,
        color: TRANSFER_CATEGORY.color,
        currency: toAccount.currency,
        date: args.date,
        merchant: `Transfer from ${fromAccount.name}`,
        symbol: TRANSFER_CATEGORY.symbol,
        transactionKind: 'transfer_in',
      });

      await ctx.db.patch(transferOutId, { pairTransactionId: transferInId });
      await ctx.db.patch(transferInId, { pairTransactionId: transferOutId });

      const accountTransferTagId = await getOrCreateAccountTransferTagId(ctx);
      await replaceTransactionTags(ctx, transferOutId, [...args.tagIds, accountTransferTagId]);
      await replaceTransactionTags(ctx, transferInId, [accountTransferTagId]);
      for (const attachment of args.attachments) {
        await ctx.db.insert('transactionAttachments', {
          ...attachment,
          transactionId: transferOutId,
        });
      }

      await ctx.db.patch(args.accountId, {
        balance: fromAccount.balance - args.amount,
      });
      await ctx.db.patch(args.toAccountId, {
        balance: toAccount.balance + args.amount,
      });

      return { mainTransactionId: transferOutId, transactionChargeId: null };
    }

    const account = await ctx.db.get('accounts', args.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const merchant = args.merchant.trim() || args.category;
    const signedAmount = args.type === 'expense' ? -args.amount : args.amount;
    const transactionCharge = args.type === 'expense' ? (args.transactionCharge ?? 0) : 0;
    const mainTransactionId = await ctx.db.insert('transactions', {
      accountId: args.accountId,
      amount: signedAmount,
      category: args.category,
      color: args.color,
      currency: account.currency,
      date: args.date,
      merchant,
      symbol: args.symbol,
      transactionKind: args.type,
    });

    await replaceTransactionTags(ctx, mainTransactionId, args.tagIds);
    for (const attachment of args.attachments) {
      await ctx.db.insert('transactionAttachments', {
        ...attachment,
        transactionId: mainTransactionId,
      });
    }

    let transactionChargeId = null;
    if (transactionCharge > 0) {
      transactionChargeId = await ctx.db.insert('transactions', {
        accountId: args.accountId,
        amount: -transactionCharge,
        category: 'Transaction charges',
        color: '#8E8E93',
        currency: account.currency,
        date: args.date,
        merchant: `${merchant} TC`,
        symbol: 'creditcard.fill',
        transactionKind: 'charge',
        parentTransactionId: mainTransactionId,
      });
      await ctx.db.patch(mainTransactionId, { pairTransactionId: transactionChargeId });
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
    id: v.id('transactions'),
    accountId: v.id('accounts'),
    amount: v.number(),
    category: v.string(),
    color: v.string(),
    date: v.number(),
    merchant: v.string(),
    symbol: v.string(),
    tagIds: v.array(v.id('tags')),
    toAccountId: v.optional(v.id('accounts')),
    transactionCharge: v.optional(v.number()),
    type: v.union(v.literal('expense'), v.literal('income'), v.literal('transfer')),
  },
  handler: async (ctx, args) => {
    const existing = await resolveEditableTransaction(ctx, args.id);
    if (!existing) {
      throw new Error('Transaction not found');
    }

    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error('Transaction amounts must be positive');
    }
    if (
      args.transactionCharge !== undefined &&
      (!Number.isFinite(args.transactionCharge) || args.transactionCharge <= 0)
    ) {
      throw new Error('Transaction charge must be positive');
    }

    const existingKind = resolveTransactionKind(existing);

    if (existingKind === 'transfer_out' || args.type === 'transfer') {
      if (!args.toAccountId) {
        throw new Error('Transfer requires a destination account');
      }
      if (args.accountId === args.toAccountId) {
        throw new Error('Transfer accounts must be different');
      }

      const fromAccount = await ctx.db.get('accounts', args.accountId);
      const toAccount = await ctx.db.get('accounts', args.toAccountId);
      if (!fromAccount || !toAccount) {
        throw new Error('Account not found');
      }
      if (fromAccount.currency !== toAccount.currency) {
        throw new Error('Transfer accounts must use the same currency');
      }

      const oldFromAccountId = existing.accountId;
      const oldInLeg = existing.pairTransactionId
        ? await ctx.db.get('transactions', existing.pairTransactionId)
        : null;
      const oldToAccountId = existing.toAccountId ?? oldInLeg?.accountId;
      const oldAmount = Math.abs(existing.amount);

      if (oldToAccountId) {
        const oldFromAccount = await ctx.db.get('accounts', oldFromAccountId);
        const oldToAccount = await ctx.db.get('accounts', oldToAccountId);
        if (oldFromAccount) {
          await ctx.db.patch(oldFromAccountId, {
            balance: oldFromAccount.balance + oldAmount,
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
        transactionKind: 'transfer_out',
        toAccountId: args.toAccountId,
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
          transactionKind: 'transfer_in',
        });
      } else {
        transferInId = await ctx.db.insert('transactions', {
          accountId: args.toAccountId,
          amount: args.amount,
          category: TRANSFER_CATEGORY.name,
          color: TRANSFER_CATEGORY.color,
          currency: toAccount.currency,
          date: args.date,
          merchant: `Transfer from ${fromAccount.name}`,
          symbol: TRANSFER_CATEGORY.symbol,
          transactionKind: 'transfer_in',
          pairTransactionId: existing._id,
        });
        await ctx.db.patch(existing._id, { pairTransactionId: transferInId });
      }

      const updatedFromAccount = await ctx.db.get('accounts', args.accountId);
      const updatedToAccount = await ctx.db.get('accounts', args.toAccountId);
      if (updatedFromAccount) {
        await ctx.db.patch(args.accountId, {
          balance: updatedFromAccount.balance - args.amount,
        });
      }
      if (updatedToAccount) {
        await ctx.db.patch(args.toAccountId, {
          balance: updatedToAccount.balance + args.amount,
        });
      }

      const accountTransferTagId = await getOrCreateAccountTransferTagId(ctx);
      await replaceTransactionTags(ctx, existing._id, [...args.tagIds, accountTransferTagId]);
      await replaceTransactionTags(ctx, transferInId, [accountTransferTagId]);

      return existing._id;
    }

    const oldAccount = await ctx.db.get('accounts', existing.accountId);
    const newAccount = await ctx.db.get('accounts', args.accountId);
    if (!oldAccount || !newAccount) {
      throw new Error('Account not found');
    }

    const merchant = args.merchant.trim() || args.category;
    const signedAmount = args.type === 'expense' ? -args.amount : args.amount;
    const nextCharge = args.type === 'expense' ? (args.transactionCharge ?? 0) : 0;

    const existingCharge =
      existing.pairTransactionId !== undefined
        ? await ctx.db.get('transactions', existing.pairTransactionId)
        : null;
    const oldChargeAmount =
      existingCharge && resolveTransactionKind(existingCharge) === 'charge'
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
      transactionKind: args.type,
      toAccountId: undefined,
    });

    if (existingCharge && resolveTransactionKind(existingCharge) === 'charge') {
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
      const chargeId = await ctx.db.insert('transactions', {
        accountId: args.accountId,
        amount: -nextCharge,
        category: 'Transaction charges',
        color: '#8E8E93',
        currency: newAccount.currency,
        date: args.date,
        merchant: `${merchant} TC`,
        symbol: 'creditcard.fill',
        transactionKind: 'charge',
        parentTransactionId: existing._id,
      });
      await ctx.db.patch(existing._id, { pairTransactionId: chargeId });
      await replaceChargeTransactionTags(ctx, chargeId);
    }

    await replaceTransactionTags(ctx, existing._id, args.tagIds);

    return existing._id;
  },
});

async function deleteTransactionArtifacts(ctx: MutationCtx, transactionId: Id<'transactions'>) {
  const tagLinks = await ctx.db
    .query('transactionTags')
    .withIndex('by_transactionId', (q) => q.eq('transactionId', transactionId))
    .collect();
  for (const link of tagLinks) {
    await ctx.db.delete(link._id);
  }

  const attachments = await ctx.db
    .query('transactionAttachments')
    .withIndex('by_transactionId', (q) => q.eq('transactionId', transactionId))
    .collect();
  for (const attachment of attachments) {
    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete(attachment._id);
  }
}

async function deleteTransactionDocument(
  ctx: MutationCtx,
  transaction: Doc<'transactions'> | null
) {
  if (!transaction) {
    return;
  }

  await deleteTransactionArtifacts(ctx, transaction._id);
  await ctx.db.delete(transaction._id);
}

export const deleteTransaction = mutation({
  args: {
    id: v.id('transactions'),
  },
  handler: async (ctx, args) => {
    const existing = await resolveEditableTransaction(ctx, args.id);
    if (!existing) {
      throw new Error('Transaction not found');
    }

    const kind = resolveTransactionKind(existing);

    if (kind === 'transfer_out') {
      const inLeg = existing.pairTransactionId
        ? await ctx.db.get('transactions', existing.pairTransactionId)
        : null;
      const amount = Math.abs(existing.amount);
      const fromAccount = await ctx.db.get('accounts', existing.accountId);
      const toAccountId = existing.toAccountId ?? inLeg?.accountId;
      const toAccount = toAccountId ? await ctx.db.get('accounts', toAccountId) : null;

      if (fromAccount) {
        await ctx.db.patch(fromAccount._id, { balance: fromAccount.balance + amount });
      }
      if (toAccount) {
        await ctx.db.patch(toAccount._id, { balance: toAccount.balance - amount });
      }

      await deleteTransactionDocument(ctx, inLeg);
      await deleteTransactionDocument(ctx, existing);
      return existing._id;
    }

    const account = await ctx.db.get('accounts', existing.accountId);
    const charge =
      existing.pairTransactionId !== undefined
        ? await ctx.db.get('transactions', existing.pairTransactionId)
        : null;
    const chargeAmount =
      charge && resolveTransactionKind(charge) === 'charge' ? Math.abs(charge.amount) : 0;

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

type PlannedFrequency = 'once' | 'weekly' | 'monthly' | 'yearly';

function startOfDay(ms: number): number {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Next due date after `date`; Infinity for one-off payments. */
function advancePlannedDate(date: number, frequency: PlannedFrequency, interval: number): number {
  const step = Math.max(1, Math.round(interval));
  const next = new Date(date);
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7 * step);
      return next.getTime();
    case 'monthly':
      next.setMonth(next.getMonth() + step);
      return next.getTime();
    case 'yearly':
      next.setFullYear(next.getFullYear() + step);
      return next.getTime();
    default:
      return Number.POSITIVE_INFINITY;
  }
}

function entriesByDay(
  entries: Doc<'plannedPaymentEntries'>[]
): Map<number, Doc<'plannedPaymentEntries'>> {
  return new Map(entries.map((entry) => [startOfDay(entry.dueDate), entry]));
}

/** Earliest pending occurrence + number of overdue pending occurrences. */
function summarizePlannedPayment(
  payment: Doc<'plannedPayments'>,
  entries: Doc<'plannedPaymentEntries'>[],
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
    if (payment.frequency === 'once') {
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

  return { overdueCount, nextDueDate };
}

/** Resolved + upcoming occurrences for the detail view, newest first. */
function buildPlannedOccurrences(
  payment: Doc<'plannedPayments'>,
  entries: Doc<'plannedPaymentEntries'>[],
  now: number
) {
  const todayStart = startOfDay(now);
  const resolvedByDay = entriesByDay(entries);
  const occurrences: { dueDate: number; status: 'pending' | 'paid' | 'skipped'; paidDate: number | null }[] = [];
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
      status: entry ? entry.status : 'pending',
      paidDate: entry?.paidDate ?? null,
    });
    if (payment.frequency === 'once') {
      break;
    }
    date = advancePlannedDate(date, payment.frequency, payment.interval);
    if (!Number.isFinite(date) || futureCount >= 2) {
      break;
    }
  }

  return occurrences.sort((a, b) => b.dueDate - a.dueDate).slice(0, 24);
}

async function loadPlannedPaymentTags(ctx: QueryCtx, tagIds: Id<'tags'>[]) {
  const uniqueIds = [...new Set(tagIds)];
  const tagDocs = await Promise.all(uniqueIds.map((id) => ctx.db.get('tags', id)));
  return tagDocs
    .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
    .map((tag) => ({ id: tag._id, name: tag.name, color: tag.color ?? DEFAULT_TAG_COLOR }));
}

async function countOverduePlannedPayments(ctx: QueryCtx): Promise<number> {
  const payments = await ctx.db.query('plannedPayments').collect();
  if (payments.length === 0) {
    return 0;
  }
  const now = Date.now();
  let total = 0;
  for (const payment of payments) {
    const entries = await ctx.db
      .query('plannedPaymentEntries')
      .withIndex('by_plannedPaymentId', (q) => q.eq('plannedPaymentId', payment._id))
      .collect();
    total += summarizePlannedPayment(payment, entries, now).overdueCount;
  }
  return total;
}

export const listPlannedPayments = query({
  args: {},
  handler: async (ctx) => {
    const payments = await ctx.db.query('plannedPayments').collect();
    if (payments.length === 0) {
      return [];
    }

    const accounts = await ctx.db.query('accounts').collect();
    const accountNameById = new Map(accounts.map((account) => [account._id, account.name]));
    const now = Date.now();
    const todayStart = startOfDay(now);

    const enriched = await Promise.all(
      payments.map(async (payment) => {
        const entries = await ctx.db
          .query('plannedPaymentEntries')
          .withIndex('by_plannedPaymentId', (q) => q.eq('plannedPaymentId', payment._id))
          .collect();
        const { overdueCount, nextDueDate } = summarizePlannedPayment(payment, entries, now);
        const tags = await loadPlannedPaymentTags(ctx, payment.tagIds);
        const nextDayKey = nextDueDate === null ? null : startOfDay(nextDueDate);
        const dueStatus =
          nextDayKey === null
            ? ('completed' as const)
            : nextDayKey < todayStart
              ? ('overdue' as const)
              : nextDayKey === todayStart
                ? ('today' as const)
                : ('upcoming' as const);

        return {
          id: payment._id,
          name: payment.name,
          description: payment.description,
          accountId: payment.accountId,
          accountName: accountNameById.get(payment.accountId) ?? 'Unknown',
          category: payment.category,
          symbol: payment.categorySymbol,
          color: payment.categoryColor,
          amount: payment.amount,
          type: payment.type,
          currency: payment.currency,
          frequency: payment.frequency,
          interval: payment.interval,
          nextDueDate: nextDueDate === null ? null : new Date(nextDueDate).toISOString(),
          daysUntilDue: nextDayKey === null ? null : Math.round((nextDayKey - todayStart) / DAY_MS),
          overdueCount,
          dueStatus,
          notifyOnDue: payment.notifyOnDue ?? false,
          notifyOnOverdue: payment.notifyOnOverdue ?? false,
          tags,
        };
      })
    );

    return enriched.sort((a, b) => {
      if (a.nextDueDate === null && b.nextDueDate === null) return 0;
      if (a.nextDueDate === null) return 1;
      if (b.nextDueDate === null) return -1;
      return a.nextDueDate.localeCompare(b.nextDueDate);
    });
  },
});

export const getPlannedPayment = query({
  args: { id: v.id('plannedPayments') },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get('plannedPayments', args.id);
    if (!payment) {
      return null;
    }

    const [entries, account, tags] = await Promise.all([
      ctx.db
        .query('plannedPaymentEntries')
        .withIndex('by_plannedPaymentId', (q) => q.eq('plannedPaymentId', payment._id))
        .collect(),
      ctx.db.get('accounts', payment.accountId),
      loadPlannedPaymentTags(ctx, payment.tagIds),
    ]);

    const now = Date.now();
    const todayStart = startOfDay(now);
    const signedAmount = payment.type === 'expense' ? -payment.amount : payment.amount;
    const { overdueCount } = summarizePlannedPayment(payment, entries, now);
    const occurrences = buildPlannedOccurrences(payment, entries, now).map((occurrence) => ({
      dueDate: new Date(occurrence.dueDate).toISOString(),
      status: occurrence.status,
      paidDate: occurrence.paidDate ? new Date(occurrence.paidDate).toISOString() : null,
      amount: signedAmount,
      daysUntilDue: Math.round((startOfDay(occurrence.dueDate) - todayStart) / DAY_MS),
    }));

    return {
      id: payment._id,
      name: payment.name,
      description: payment.description,
      accountId: payment.accountId,
      accountName: account?.name ?? 'Unknown',
      category: payment.category,
      symbol: payment.categorySymbol,
      color: payment.categoryColor,
      amount: payment.amount,
      type: payment.type,
      currency: payment.currency,
      frequency: payment.frequency,
      interval: payment.interval,
      startDate: new Date(payment.startDate).toISOString(),
      notifyOnDue: payment.notifyOnDue ?? false,
      notifyOnOverdue: payment.notifyOnOverdue ?? false,
      overdueCount,
      tags,
      occurrences,
    };
  },
});

const plannedPaymentArgs = {
  name: v.string(),
  description: v.string(),
  accountId: v.id('accounts'),
  category: v.string(),
  categorySymbol: v.string(),
  categoryColor: v.string(),
  amount: v.number(),
  type: plannedPaymentType,
  startDate: v.number(),
  frequency: plannedPaymentFrequency,
  interval: v.number(),
  tagIds: v.array(v.id('tags')),
  notifyOnDue: v.boolean(),
  notifyOnOverdue: v.boolean(),
};

async function validatePlannedPaymentArgs(
  ctx: MutationCtx,
  args: {
    name: string;
    amount: number;
    accountId: Id<'accounts'>;
    interval: number;
  }
) {
  const name = args.name.trim();
  if (!name || name.length > 80) {
    throw new Error('Payment name must contain between 1 and 80 characters');
  }
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new Error('Planned payment amount must be positive');
  }
  if (!Number.isFinite(args.interval) || args.interval < 1) {
    throw new Error('Repeat interval must be at least 1');
  }
  const account = await ctx.db.get('accounts', args.accountId);
  if (!account) {
    throw new Error('Account not found');
  }
  return { name, account };
}

export const createPlannedPayment = mutation({
  args: plannedPaymentArgs,
  handler: async (ctx, args) => {
    const { name, account } = await validatePlannedPaymentArgs(ctx, args);
    const payments = await ctx.db.query('plannedPayments').collect();
    const nextOrder =
      payments.length === 0 ? 0 : Math.max(...payments.map((payment) => payment.order)) + 1;

    return await ctx.db.insert('plannedPayments', {
      name,
      description: args.description.trim(),
      accountId: args.accountId,
      category: args.category,
      categorySymbol: args.categorySymbol,
      categoryColor: args.categoryColor,
      amount: args.amount,
      type: args.type,
      currency: account.currency,
      startDate: args.startDate,
      frequency: args.frequency,
      interval: Math.max(1, Math.round(args.interval)),
      tagIds: [...new Set(args.tagIds)],
      notifyOnDue: args.notifyOnDue,
      notifyOnOverdue: args.notifyOnOverdue,
      order: nextOrder,
    });
  },
});

export const updatePlannedPayment = mutation({
  args: { id: v.id('plannedPayments'), ...plannedPaymentArgs },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get('plannedPayments', args.id);
    if (!existing) {
      throw new Error('Planned payment not found');
    }
    const { name, account } = await validatePlannedPaymentArgs(ctx, args);

    await ctx.db.patch(args.id, {
      name,
      description: args.description.trim(),
      accountId: args.accountId,
      category: args.category,
      categorySymbol: args.categorySymbol,
      categoryColor: args.categoryColor,
      amount: args.amount,
      type: args.type,
      currency: account.currency,
      startDate: args.startDate,
      frequency: args.frequency,
      interval: Math.max(1, Math.round(args.interval)),
      tagIds: [...new Set(args.tagIds)],
      notifyOnDue: args.notifyOnDue,
      notifyOnOverdue: args.notifyOnOverdue,
    });

    return args.id;
  },
});

export const deletePlannedPayment = mutation({
  args: { id: v.id('plannedPayments') },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query('plannedPaymentEntries')
      .withIndex('by_plannedPaymentId', (q) => q.eq('plannedPaymentId', args.id))
      .collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const markPlannedPaymentPaid = mutation({
  args: { id: v.id('plannedPayments'), dueDate: v.number() },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get('plannedPayments', args.id);
    if (!payment) {
      throw new Error('Planned payment not found');
    }

    const dueDay = startOfDay(args.dueDate);
    const existingEntries = await ctx.db
      .query('plannedPaymentEntries')
      .withIndex('by_plannedPaymentId', (q) => q.eq('plannedPaymentId', payment._id))
      .collect();
    if (existingEntries.some((entry) => startOfDay(entry.dueDate) === dueDay)) {
      throw new Error('This occurrence has already been resolved');
    }

    const account = await ctx.db.get('accounts', payment.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const signedAmount = payment.type === 'expense' ? -payment.amount : payment.amount;
    const merchant = payment.description.trim() || payment.name;
    const transactionId = await ctx.db.insert('transactions', {
      accountId: payment.accountId,
      amount: signedAmount,
      category: payment.category,
      color: payment.categoryColor,
      currency: payment.currency,
      date: args.dueDate,
      merchant,
      symbol: payment.categorySymbol,
      transactionKind: payment.type,
    });
    await replaceTransactionTags(ctx, transactionId, payment.tagIds);
    await ctx.db.patch(payment.accountId, { balance: account.balance + signedAmount });

    await ctx.db.insert('plannedPaymentEntries', {
      plannedPaymentId: payment._id,
      dueDate: args.dueDate,
      status: 'paid',
      paidDate: Date.now(),
      transactionId,
    });

    return transactionId;
  },
});

export const skipPlannedPaymentOccurrence = mutation({
  args: { id: v.id('plannedPayments'), dueDate: v.number() },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get('plannedPayments', args.id);
    if (!payment) {
      throw new Error('Planned payment not found');
    }

    const dueDay = startOfDay(args.dueDate);
    const existingEntries = await ctx.db
      .query('plannedPaymentEntries')
      .withIndex('by_plannedPaymentId', (q) => q.eq('plannedPaymentId', payment._id))
      .collect();
    if (existingEntries.some((entry) => startOfDay(entry.dueDate) === dueDay)) {
      return args.id;
    }

    await ctx.db.insert('plannedPaymentEntries', {
      plannedPaymentId: payment._id,
      dueDate: args.dueDate,
      status: 'skipped',
    });

    return args.id;
  },
});
