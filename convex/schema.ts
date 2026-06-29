import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const accountType = v.union(
  v.literal("general"),
  v.literal("cash"),
  v.literal("mobile_money"),
  v.literal("crypto"),
  v.literal("current"),
  v.literal("savings"),
  v.literal("investment")
);

export const transactionKind = v.union(
  v.literal("expense"),
  v.literal("income"),
  v.literal("transfer_out"),
  v.literal("transfer_in"),
  v.literal("charge")
);

export const budgetPeriod = v.union(
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("yearly"),
  v.literal("one_time")
);

export const plannedPaymentFrequency = v.union(
  v.literal("once"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("yearly")
);

export const plannedPaymentType = v.union(
  v.literal("expense"),
  v.literal("income")
);

export const plannedPaymentEntryStatus = v.union(
  v.literal("paid"),
  v.literal("skipped")
);

export default defineSchema({
  accounts: defineTable({
    /** Available balance in minor units (cents). */
    balance: v.number(),
    /** Accent hex color. */
    color: v.string(),
    currency: v.string(),
    institution: v.string(),
    name: v.string(),
    /** Display order in the dashboard carousel. */
    order: v.number(),
    /** SF Symbol name. */
    symbol: v.string(),
    type: accountType,
    userId: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  budgets: defineTable({
    /** Category whose transactions count against this budget. */
    category: v.optional(v.string()),
    color: v.string(),
    currency: v.string(),
    /** Budget limit in minor units (cents). */
    limit: v.number(),
    name: v.string(),
    /** In-app notification when spending crosses 75% of the limit. */
    notifyAtThreshold: v.optional(v.boolean()),
    /** In-app notification when spending exceeds the limit. */
    notifyOnOverspend: v.optional(v.boolean()),
    order: v.number(),
    /** How often the budget resets. Defaults to monthly when absent. */
    period: v.optional(budgetPeriod),
    /**
     * Fallback spent amount in minor units (cents). When `category` is set the
     * spend is computed live from matching transactions instead.
     */
    spent: v.optional(v.number()),
    symbol: v.string(),
    /** Optional tag association (no effect on spend calculation). */
    tagId: v.optional(v.id("tags")),
    userId: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  categories: defineTable({
    color: v.string(),
    name: v.string(),
    normalizedName: v.string(),
    symbol: v.string(),
  }).index("by_normalizedName", ["normalizedName"]),

  /** Resolved occurrences (paid or skipped); pending ones are computed. */
  plannedPaymentEntries: defineTable({
    /** The occurrence's scheduled due date (epoch millis). */
    dueDate: v.number(),
    /** When it was marked paid (epoch millis). */
    paidDate: v.optional(v.number()),
    plannedPaymentId: v.id("plannedPayments"),
    status: plannedPaymentEntryStatus,
    transactionId: v.optional(v.id("transactions")),
  })
    .index("by_plannedPaymentId", ["plannedPaymentId"])
    .index("by_transactionId", ["transactionId"]),

  plannedPayments: defineTable({
    accountId: v.id("accounts"),
    /** Positive amount in minor units (cents); sign derived from `type`. */
    amount: v.number(),
    category: v.string(),
    categoryColor: v.string(),
    categorySymbol: v.string(),
    currency: v.string(),
    /** Becomes the transaction description when an occurrence is confirmed. */
    description: v.string(),
    frequency: plannedPaymentFrequency,
    /** Repeat every N periods. */
    interval: v.number(),
    name: v.string(),
    /** In-app notification when an occurrence becomes due. */
    notifyOnDue: v.optional(v.boolean()),
    /** In-app notification when an occurrence becomes overdue. */
    notifyOnOverdue: v.optional(v.boolean()),
    order: v.number(),
    /** First due date (epoch millis). */
    startDate: v.number(),
    tagIds: v.array(v.id("tags")),
    type: plannedPaymentType,
    userId: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  profiles: defineTable({
    firstName: v.string(),
    key: v.string(),
  }).index("by_key", ["key"]),

  tags: defineTable({
    color: v.optional(v.string()),
    name: v.string(),
    normalizedName: v.string(),
  }).index("by_normalizedName", ["normalizedName"]),

  transactionAttachments: defineTable({
    mimeType: v.optional(v.string()),
    name: v.string(),
    size: v.optional(v.number()),
    storageId: v.id("_storage"),
    transactionId: v.id("transactions"),
  }).index("by_transactionId", ["transactionId"]),

  transactionTags: defineTable({
    tagId: v.id("tags"),
    transactionId: v.id("transactions"),
  })
    .index("by_transactionId", ["transactionId"])
    .index("by_tagId", ["tagId"]),

  transactionTemplates: defineTable({
    accountId: v.id("accounts"),
    /** Positive amount in minor units (cents); sign derived from type. */
    amount: v.number(),
    category: v.string(),
    color: v.string(),
    currency: v.string(),
    merchant: v.string(),
    name: v.string(),
    order: v.number(),
    symbol: v.string(),
    tagIds: v.array(v.id("tags")),
    toAccountId: v.optional(v.id("accounts")),
    transactionCharge: v.optional(v.number()),
    type: v.union(
      v.literal("expense"),
      v.literal("income"),
      v.literal("transfer")
    ),
    userId: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  transactions: defineTable({
    accountId: v.id("accounts"),
    /** Signed amount in minor units (cents). Negative = outflow. */
    amount: v.number(),
    category: v.string(),
    color: v.string(),
    /** Name snapshot of the local profile when this transaction was created. */
    createdByName: v.optional(v.string()),
    currency: v.string(),
    /** Epoch millis the transaction posted. */
    date: v.number(),
    merchant: v.string(),
    /** Linked leg: charge, transfer pair, etc. */
    pairTransactionId: v.optional(v.id("transactions")),
    /** Parent transaction for charge rows. */
    parentTransactionId: v.optional(v.id("transactions")),
    symbol: v.string(),
    /** Destination account for transfer_out rows. */
    toAccountId: v.optional(v.id("accounts")),
    transactionKind: v.optional(transactionKind),
    userId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_account", ["accountId"])
    .index("by_accountId_and_date", ["accountId", "date"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_currency_and_date", ["currency", "date"])
    .index("by_parentTransactionId", ["parentTransactionId"]),
});
