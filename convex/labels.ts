import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalQuery } from "./_generated/server";
import {
  MAX_AUTOMATIC_RULES,
  normalizeAutomaticRuleText,
} from "./lib/automaticRuleMatching";
import {
  isCloudModelConfigured,
  isRecord,
  requestStructured,
} from "./lib/capture/chat";
import {
  draftLabelText,
  isConfidentHistory,
  suggestFromHistory,
} from "./lib/capture/labels";
import type { LabelDraftInput, LabelExample } from "./lib/capture/labels";

/**
 * Category and tag suggestions for captured drafts, in priority order:
 * the user's automatic rules, then their labelling history, then (for
 * drafts neither can place) the cloud model, restricted to the user's own
 * category and tag names.
 */

const HISTORY_WINDOW = 400;
const MAX_MODEL_EXAMPLES = 40;
const MAX_DRAFTS = 50;
/** Categories that describe bookkeeping, not what money was spent on. */
const UNLEARNABLE_CATEGORIES = new Set([
  "balance adjustment",
  "transaction charges",
  "transfer",
  "uncategorized",
]);

const ruleValidator = v.object({
  category: v.optional(v.string()),
  matchTexts: v.array(v.string()),
  tagNames: v.array(v.string()),
  type: v.union(v.literal("expense"), v.literal("income")),
});

export const labelContext = internalQuery({
  args: {},
  returns: v.object({
    examples: v.array(
      v.object({
        category: v.string(),
        description: v.string(),
        direction: v.union(v.literal("credit"), v.literal("debit")),
        tagNames: v.array(v.string()),
      })
    ),
    rules: v.array(ruleValidator),
    tags: v.array(v.object({ id: v.id("tags"), name: v.string() })),
  }),
  handler: async (ctx) => {
    const tagDocs = await ctx.db.query("tags").take(500);
    const tags = tagDocs
      .filter((tag) => tag.archived !== true)
      .map((tag) => ({ id: tag._id, name: tag.name }));
    const tagNameById = new Map<Id<"tags">, string>(
      tagDocs.map((tag) => [tag._id, tag.name])
    );

    const ruleDocs = await ctx.db
      .query("automaticRules")
      .take(MAX_AUTOMATIC_RULES);
    const rules = ruleDocs.map((rule) => ({
      category: rule.category,
      matchTexts: rule.normalizedMatchTexts,
      tagNames: rule.tagIds.flatMap((id) => tagNameById.get(id) ?? []),
      type: rule.type,
    }));

    const recent = await ctx.db
      .query("transactions")
      .withIndex("by_date")
      .order("desc")
      .take(HISTORY_WINDOW);
    const examples: LabelExample[] = [];
    for (const transaction of recent) {
      const kind = transaction.transactionKind;
      if (
        (kind !== undefined && kind !== "expense" && kind !== "income") ||
        UNLEARNABLE_CATEGORIES.has(transaction.category.toLocaleLowerCase())
      ) {
        continue;
      }
      const links = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) =>
          q.eq("transactionId", transaction._id)
        )
        .take(20);
      examples.push({
        category: transaction.category,
        description: transaction.merchant,
        direction: transaction.amount < 0 ? "debit" : "credit",
        tagNames: links.flatMap((link) => tagNameById.get(link.tagId) ?? []),
      });
    }

    return { examples, rules, tags };
  },
});

type LabelSource = "ai" | "history" | "rule";

interface Suggestion {
  category: string | null;
  confidence: number;
  key: string;
  source: LabelSource;
  tagNames: string[];
}

const matchRule = (
  draft: LabelDraftInput,
  rules: {
    category?: string;
    matchTexts: string[];
    tagNames: string[];
    type: "expense" | "income";
  }[]
): Suggestion | null => {
  const text = normalizeAutomaticRuleText(draftLabelText(draft));
  const type = draft.direction === "debit" ? "expense" : "income";
  const matching = rules.filter(
    (rule) =>
      rule.type === type &&
      rule.matchTexts.some((matchText) => text.includes(matchText))
  );
  if (matching.length === 0) {
    return null;
  }
  return {
    category: matching.find((rule) => rule.category)?.category ?? null,
    confidence: 1,
    key: draft.key,
    source: "rule",
    tagNames: [...new Set(matching.flatMap((rule) => rule.tagNames))],
  };
};

const NON_LETTERS = /[^\p{L}\p{N}]+/gu;

/** Compares label names ignoring case, emoji, spaces, and punctuation. */
const sameLabel = (a: string, b: string): boolean =>
  a.toLocaleLowerCase().replace(NON_LETTERS, "") ===
  b.toLocaleLowerCase().replace(NON_LETTERS, "");

const SYSTEM_PROMPT = `You label personal finance transactions for a household in Ghana.
For each draft, pick the single best category from the allowed list and any tags from the allowed list that clearly apply.
Follow how this household labelled similar past transactions. Never pick a tag that just repeats the chosen category's name. Use null for category, and an empty tag list, when nothing fits well.
confidence is 0 to 1: how sure you are about the category.`;

const buildSchema = (
  keys: string[],
  categoryNames: string[],
  tagNames: string[]
): Record<string, unknown> => ({
  additionalProperties: false,
  properties: {
    suggestions: {
      items: {
        additionalProperties: false,
        properties: {
          category: {
            enum: [...categoryNames, null],
            type: ["string", "null"],
          },
          confidence: { type: "number" },
          key: { enum: keys, type: "string" },
          tags:
            tagNames.length > 0
              ? { items: { enum: tagNames, type: "string" }, type: "array" }
              : { maxItems: 0, type: "array" },
        },
        required: ["category", "confidence", "key", "tags"],
        type: "object",
      },
      type: "array",
    },
  },
  required: ["suggestions"],
  type: "object",
});

/** Keeps only suggestions whose key, category, and tags are allowed. */
const parseModelSuggestions =
  (keys: Set<string>, categories: Set<string>, tags: Set<string>) =>
  (json: unknown): Suggestion[] => {
    if (!(isRecord(json) && Array.isArray(json.suggestions))) {
      throw new Error("Response is missing a suggestions array");
    }
    const suggestions: Suggestion[] = [];
    for (const item of json.suggestions) {
      if (
        !(isRecord(item) && typeof item.key === "string" && keys.has(item.key))
      ) {
        continue;
      }
      const category =
        typeof item.category === "string" && categories.has(item.category)
          ? item.category
          : null;
      const tagNames = Array.isArray(item.tags)
        ? item.tags.filter(
            (tag): tag is string => typeof tag === "string" && tags.has(tag)
          )
        : [];
      const confidence =
        typeof item.confidence === "number"
          ? Math.min(Math.max(item.confidence, 0), 1)
          : 0;
      suggestions.push({
        category,
        confidence,
        key: item.key,
        source: "ai",
        tagNames: [...new Set(tagNames)],
      });
    }
    return suggestions;
  };

const pickExamples = (examples: LabelExample[]): LabelExample[] => {
  const seen = new Set<string>();
  const picked: LabelExample[] = [];
  for (const example of examples) {
    const key = `${example.direction}:${example.description.toLocaleLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    picked.push(example);
    if (picked.length >= MAX_MODEL_EXAMPLES) {
      break;
    }
  }
  return picked;
};

const draftValidator = v.object({
  counterparty: v.optional(v.string()),
  description: v.string(),
  direction: v.union(v.literal("credit"), v.literal("debit")),
  key: v.string(),
  reference: v.optional(v.string()),
});

export const suggest = action({
  args: {
    /** The app's full category list (built-in and custom). */
    categoryNames: v.array(v.string()),
    drafts: v.array(draftValidator),
  },
  handler: async (ctx, args) => {
    if (args.drafts.length > MAX_DRAFTS) {
      throw new Error(`At most ${MAX_DRAFTS} drafts can be labelled at once`);
    }
    const context: {
      examples: LabelExample[];
      rules: {
        category?: string;
        matchTexts: string[];
        tagNames: string[];
        type: "expense" | "income";
      }[];
      tags: { id: Id<"tags">; name: string }[];
    } = await ctx.runQuery(internal.labels.labelContext, {});

    const suggestions = new Map<string, Suggestion>();
    const unresolved: LabelDraftInput[] = [];
    for (const draft of args.drafts) {
      const rule = matchRule(draft, context.rules);
      if (rule?.category) {
        suggestions.set(draft.key, rule);
        continue;
      }
      const history = suggestFromHistory(draft, context.examples);
      if (history && isConfidentHistory(history)) {
        suggestions.set(draft.key, {
          category: history.category,
          confidence: history.confidence,
          key: draft.key,
          source: "history",
          tagNames: [
            ...new Set([...(rule?.tagNames ?? []), ...history.tagNames]),
          ],
        });
        continue;
      }
      if (rule) {
        suggestions.set(draft.key, rule);
      }
      unresolved.push(draft);
    }

    let model: string | null = null;
    const categoryNames = [
      ...new Set(
        args.categoryNames.filter(
          (name) => !UNLEARNABLE_CATEGORIES.has(name.toLocaleLowerCase())
        )
      ),
    ];
    if (
      unresolved.length > 0 &&
      categoryNames.length > 0 &&
      isCloudModelConfigured()
    ) {
      const tagNames = context.tags.map((tag) => tag.name);
      const keys = unresolved.map((draft) => draft.key);
      try {
        const response = await requestStructured(ctx, {
          parse: parseModelSuggestions(
            new Set(keys),
            new Set(categoryNames),
            new Set(tagNames)
          ),
          schema: buildSchema(keys, categoryNames, tagNames),
          schemaName: "label_suggestions",
          system: SYSTEM_PROMPT,
          user: JSON.stringify({
            allowedCategories: categoryNames,
            allowedTags: tagNames,
            drafts: unresolved.map((draft) => ({
              counterparty: draft.counterparty,
              description: draft.description,
              direction: draft.direction,
              key: draft.key,
              reference: draft.reference,
            })),
            pastExamples: pickExamples(context.examples),
          }),
        });
        ({ model } = response);
        for (const suggestion of response.result) {
          const ruleTags = suggestions.get(suggestion.key)?.tagNames ?? [];
          suggestions.set(suggestion.key, {
            ...suggestion,
            tagNames: [...new Set([...ruleTags, ...suggestion.tagNames])],
          });
        }
      } catch {
        // Suggestions are best-effort: drafts stay unlabelled if the model fails.
      }
    }

    const tagIdByName = new Map(context.tags.map((tag) => [tag.name, tag.id]));
    return {
      model,
      suggestions: [...suggestions.values()].map((suggestion) => ({
        category: suggestion.category,
        confidence: suggestion.confidence,
        key: suggestion.key,
        source: suggestion.source,
        // A tag named like the category ("Home Maintenance" on a Home
        // Maintenance transaction) adds nothing, so it's never suggested.
        tagIds: suggestion.tagNames
          .filter(
            (name) =>
              !(suggestion.category && sameLabel(name, suggestion.category))
          )
          .flatMap((name) => tagIdByName.get(name) ?? []),
      })),
    };
  },
});
