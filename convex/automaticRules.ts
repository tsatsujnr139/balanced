import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  MAX_AUTOMATIC_RULES,
  normalizeAutomaticRuleText,
} from "./lib/automaticRuleMatching";
import { automaticRuleType } from "./schema";

const DEFAULT_TAG_COLOR = "#8E8E93";
const MAX_RULE_NAME_LENGTH = 80;
const MAX_MATCH_TEXT_LENGTH = 120;

const categoryValidator = v.object({
  color: v.string(),
  name: v.string(),
  symbol: v.string(),
});

const ruleFields = {
  category: v.optional(categoryValidator),
  matchText: v.string(),
  name: v.string(),
  tagIds: v.array(v.id("tags")),
  type: automaticRuleType,
};

const validateRuleText = (
  nameValue: string,
  matchTextValue: string
): { matchText: string; name: string; normalizedMatchText: string } => {
  const name = nameValue.trim();
  if (!name || name.length > MAX_RULE_NAME_LENGTH) {
    throw new Error(
      `Rule name must contain between 1 and ${MAX_RULE_NAME_LENGTH} characters`
    );
  }

  const matchText = matchTextValue.trim();
  if (!matchText || matchText.length > MAX_MATCH_TEXT_LENGTH) {
    throw new Error(
      `Match text must contain between 1 and ${MAX_MATCH_TEXT_LENGTH} characters`
    );
  }

  return {
    matchText,
    name,
    normalizedMatchText: normalizeAutomaticRuleText(matchText),
  };
};

const validateTagIds = async (
  ctx: MutationCtx,
  tagIds: Id<"tags">[]
): Promise<Id<"tags">[]> => {
  const uniqueTagIds = [...new Set(tagIds)];
  const tags = await Promise.all(
    uniqueTagIds.map((tagId) => ctx.db.get("tags", tagId))
  );
  if (tags.some((tag) => !tag || tag.archived === true)) {
    throw new Error("One or more selected tags are unavailable");
  }
  return uniqueTagIds;
};

const buildCategoryFields = (
  category: { color: string; name: string; symbol: string } | undefined
): Pick<
  Doc<"automaticRules">,
  "category" | "categoryColor" | "categoryNormalizedName" | "categorySymbol"
> => {
  if (!category) {
    return {
      category: undefined,
      categoryColor: undefined,
      categoryNormalizedName: undefined,
      categorySymbol: undefined,
    };
  }

  const name = category.name.trim();
  if (!name) {
    throw new Error("Category name is required");
  }
  return {
    category: name,
    categoryColor: category.color,
    categoryNormalizedName: normalizeAutomaticRuleText(name),
    categorySymbol: category.symbol,
  };
};

const ensureRuleHasAction = (
  category: { name: string } | undefined,
  tagIds: Id<"tags">[]
): void => {
  if (!category && tagIds.length === 0) {
    throw new Error("Choose a category, at least one tag, or both");
  }
};

const enrichRule = async (ctx: QueryCtx, rule: Doc<"automaticRules">) => {
  const tags = await Promise.all(
    rule.tagIds.map((tagId) => ctx.db.get("tags", tagId))
  );
  const category =
    rule.category && rule.categoryColor && rule.categorySymbol
      ? {
          color: rule.categoryColor,
          name: rule.category,
          symbol: rule.categorySymbol,
        }
      : null;

  return {
    category,
    id: rule._id,
    matchText: rule.matchText,
    name: rule.name,
    tags: tags
      .filter(
        (tag): tag is Doc<"tags"> => tag !== null && tag.archived !== true
      )
      .map((tag) => ({
        color: tag.color ?? DEFAULT_TAG_COLOR,
        id: tag._id,
        name: tag.name,
      })),
    type: rule.type,
  };
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rules = await ctx.db
      .query("automaticRules")
      .order("asc")
      .take(MAX_AUTOMATIC_RULES);
    return await Promise.all(rules.map((rule) => enrichRule(ctx, rule)));
  },
});

export const get = query({
  args: { id: v.id("automaticRules") },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get("automaticRules", args.id);
    return rule ? await enrichRule(ctx, rule) : null;
  },
});

export const create = mutation({
  args: ruleFields,
  handler: async (ctx, args) => {
    const existingRules = await ctx.db
      .query("automaticRules")
      .take(MAX_AUTOMATIC_RULES);
    if (existingRules.length >= MAX_AUTOMATIC_RULES) {
      throw new Error(`You can create up to ${MAX_AUTOMATIC_RULES} rules`);
    }

    const tagIds = await validateTagIds(ctx, args.tagIds);
    ensureRuleHasAction(args.category, tagIds);
    const textFields = validateRuleText(args.name, args.matchText);
    const categoryFields = buildCategoryFields(args.category);
    let order = -1;
    for (const rule of existingRules) {
      order = Math.max(order, rule.order);
    }

    return await ctx.db.insert("automaticRules", {
      ...categoryFields,
      ...textFields,
      order: order + 1,
      tagIds,
      type: args.type,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("automaticRules"),
    ...ruleFields,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get("automaticRules", args.id);
    if (!existing) {
      throw new Error("Automatic rule not found");
    }

    const tagIds = await validateTagIds(ctx, args.tagIds);
    ensureRuleHasAction(args.category, tagIds);
    const textFields = validateRuleText(args.name, args.matchText);

    await ctx.db.patch(args.id, {
      ...buildCategoryFields(args.category),
      ...textFields,
      tagIds,
      type: args.type,
    });
    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("automaticRules") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get("automaticRules", args.id);
    if (!existing) {
      throw new Error("Automatic rule not found");
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});
