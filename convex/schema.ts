import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const accountType = v.union(
  v.literal('checking'),
  v.literal('savings'),
  v.literal('credit'),
  v.literal('investment'),
  v.literal('cash')
);

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
  })
    .index('by_user', ['userId'])
    .index('by_account', ['accountId'])
    .index('by_user_and_date', ['userId', 'date']),

  budgets: defineTable({
    userId: v.optional(v.string()),
    name: v.string(),
    /** Spent so far in minor units (cents). */
    spent: v.number(),
    /** Budget limit in minor units (cents). */
    limit: v.number(),
    currency: v.string(),
    symbol: v.string(),
    color: v.string(),
    order: v.number(),
  }).index('by_user', ['userId']),
});
