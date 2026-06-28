import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const accountType = v.union(
  v.literal('general'),
  v.literal('cash'),
  v.literal('current'),
  v.literal('savings'),
  v.literal('investment')
);

export const transactionKind = v.union(
  v.literal('expense'),
  v.literal('income'),
  v.literal('transfer_out'),
  v.literal('transfer_in'),
  v.literal('charge')
);

export const budgetPeriod = v.union(
  v.literal('weekly'),
  v.literal('monthly'),
  v.literal('yearly'),
  v.literal('one_time')
);

export const plannedPaymentFrequency = v.union(
  v.literal('once'),
  v.literal('weekly'),
  v.literal('monthly'),
  v.literal('yearly')
);

export const plannedPaymentType = v.union(v.literal('expense'), v.literal('income'));

export const plannedPaymentEntryStatus = v.union(v.literal('paid'), v.literal('skipped'));

export default defineSchema({
  accounts: defineTable({
    userId: v.optional(v.string()),
    name: v.string(),
    institution: v.string(),
    type: accountType,
    /** Available balance in minor units (cents). */
    balance: v.number(),
    currency: v.string(),
    /** SF Symbol name. */
    symbol: v.string(),
    /** Accent hex color. */
    color: v.string(),
    /** Display order in the dashboard carousel. */
    order: v.number(),
  }).index('by_user', ['userId']),

  transactions: defineTable({
    userId: v.optional(v.string()),
    accountId: v.id('accounts'),
    merchant: v.string(),
    category: v.string(),
    /** Signed amount in minor units (cents). Negative = outflow. */
    amount: v.number(),
    currency: v.string(),
    /** Epoch millis the transaction posted. */
    date: v.number(),
    symbol: v.string(),
    color: v.string(),
    transactionKind: v.optional(transactionKind),
    /** Linked leg: charge, transfer pair, etc. */
    pairTransactionId: v.optional(v.id('transactions')),
    /** Parent transaction for charge rows. */
    parentTransactionId: v.optional(v.id('transactions')),
    /** Destination account for transfer_out rows. */
    toAccountId: v.optional(v.id('accounts')),
  })
    .index('by_user', ['userId'])
    .index('by_account', ['accountId'])
    .index('by_accountId_and_date', ['accountId', 'date'])
    .index('by_user_and_date', ['userId', 'date'])
    .index('by_parentTransactionId', ['parentTransactionId']),

  categories: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    symbol: v.string(),
    color: v.string(),
  }).index('by_normalizedName', ['normalizedName']),

  tags: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    color: v.optional(v.string()),
  }).index('by_normalizedName', ['normalizedName']),

  transactionTags: defineTable({
    transactionId: v.id('transactions'),
    tagId: v.id('tags'),
  })
    .index('by_transactionId', ['transactionId'])
    .index('by_tagId', ['tagId']),

  transactionAttachments: defineTable({
    transactionId: v.id('transactions'),
    storageId: v.id('_storage'),
    name: v.string(),
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
  }).index('by_transactionId', ['transactionId']),

  budgets: defineTable({
    userId: v.optional(v.string()),
    name: v.string(),
    /**
     * Fallback spent amount in minor units (cents). When `category` is set the
     * spend is computed live from matching transactions instead.
     */
    spent: v.optional(v.number()),
    /** Budget limit in minor units (cents). */
    limit: v.number(),
    currency: v.string(),
    symbol: v.string(),
    color: v.string(),
    order: v.number(),
    /** Category whose transactions count against this budget. */
    category: v.optional(v.string()),
    /** How often the budget resets. Defaults to monthly when absent. */
    period: v.optional(budgetPeriod),
    /** Optional tag association (no effect on spend calculation). */
    tagId: v.optional(v.id('tags')),
    /** In-app notification when spending exceeds the limit. */
    notifyOnOverspend: v.optional(v.boolean()),
    /** In-app notification when spending crosses 75% of the limit. */
    notifyAtThreshold: v.optional(v.boolean()),
  }).index('by_user', ['userId']),

  plannedPayments: defineTable({
    userId: v.optional(v.string()),
    name: v.string(),
    /** Becomes the transaction description when an occurrence is confirmed. */
    description: v.string(),
    accountId: v.id('accounts'),
    category: v.string(),
    categorySymbol: v.string(),
    categoryColor: v.string(),
    /** Positive amount in minor units (cents); sign derived from `type`. */
    amount: v.number(),
    type: plannedPaymentType,
    currency: v.string(),
    /** First due date (epoch millis). */
    startDate: v.number(),
    frequency: plannedPaymentFrequency,
    /** Repeat every N periods. */
    interval: v.number(),
    tagIds: v.array(v.id('tags')),
    /** In-app notification when an occurrence becomes due. */
    notifyOnDue: v.optional(v.boolean()),
    /** In-app notification when an occurrence becomes overdue. */
    notifyOnOverdue: v.optional(v.boolean()),
    order: v.number(),
  }).index('by_user', ['userId']),

  /** Resolved occurrences (paid or skipped); pending ones are computed. */
  plannedPaymentEntries: defineTable({
    plannedPaymentId: v.id('plannedPayments'),
    /** The occurrence's scheduled due date (epoch millis). */
    dueDate: v.number(),
    status: plannedPaymentEntryStatus,
    /** When it was marked paid (epoch millis). */
    paidDate: v.optional(v.number()),
    transactionId: v.optional(v.id('transactions')),
  })
    .index('by_plannedPaymentId', ['plannedPaymentId'])
    .index('by_transactionId', ['transactionId']),
});
