import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const MAX_AUTOMATIC_RULES = 100;

export const UNCATEGORIZED_CATEGORY = {
  color: "#8E8E93",
  name: "Uncategorized",
  symbol: "square.grid.2x2",
} as const;

export type AutomaticRuleTransactionType = "expense" | "income";

export interface AutomaticRuleCategorySnapshot {
  color: string;
  name: string;
  symbol: string;
}

export interface AutomaticRuleActions {
  category: AutomaticRuleCategorySnapshot | null;
  tagIds: Id<"tags">[];
}

export const normalizeAutomaticRuleText = (value: string): string =>
  value.trim().toLocaleLowerCase();

const getCategorySnapshot = (
  rule: Doc<"automaticRules">
): AutomaticRuleCategorySnapshot | null => {
  if (!(rule.category && rule.categoryColor && rule.categorySymbol)) {
    return null;
  }

  return {
    color: rule.categoryColor,
    name: rule.category,
    symbol: rule.categorySymbol,
  };
};

export const resolveAutomaticRuleActions = async (
  ctx: MutationCtx,
  options: {
    description: string;
    hasManualCategory: boolean;
    hasManualTags: boolean;
    type: AutomaticRuleTransactionType;
  }
): Promise<AutomaticRuleActions> => {
  if (options.hasManualCategory && options.hasManualTags) {
    return { category: null, tagIds: [] };
  }

  const normalizedDescription = normalizeAutomaticRuleText(options.description);
  if (!normalizedDescription) {
    return { category: null, tagIds: [] };
  }

  const rules = await ctx.db
    .query("automaticRules")
    .withIndex("by_type_and_order", (query) => query.eq("type", options.type))
    .order("asc")
    .take(MAX_AUTOMATIC_RULES);
  const matchingRules = rules.filter((rule) =>
    normalizedDescription.includes(rule.normalizedMatchText)
  );

  let category: AutomaticRuleCategorySnapshot | null = null;
  if (!options.hasManualCategory) {
    for (const rule of matchingRules) {
      category = getCategorySnapshot(rule);
      if (category) {
        break;
      }
    }
  }

  const tagIds = new Set<Id<"tags">>();
  if (!options.hasManualTags) {
    for (const rule of matchingRules) {
      for (const tagId of rule.tagIds) {
        tagIds.add(tagId);
      }
    }
  }

  return { category, tagIds: [...tagIds] };
};

export const removeCategoryFromAutomaticRules = async (
  ctx: MutationCtx,
  categoryName: string
): Promise<void> => {
  const categoryNormalizedName = normalizeAutomaticRuleText(categoryName);
  const rules = await ctx.db
    .query("automaticRules")
    .withIndex("by_categoryNormalizedName", (query) =>
      query.eq("categoryNormalizedName", categoryNormalizedName)
    )
    .take(MAX_AUTOMATIC_RULES);

  for (const rule of rules) {
    if (rule.tagIds.length === 0) {
      await ctx.db.delete(rule._id);
      continue;
    }
    await ctx.db.patch(rule._id, {
      category: undefined,
      categoryColor: undefined,
      categoryNormalizedName: undefined,
      categorySymbol: undefined,
    });
  }
};

export const removeTagFromAutomaticRules = async (
  ctx: MutationCtx,
  tagId: Id<"tags">
): Promise<void> => {
  const rules = await ctx.db.query("automaticRules").take(MAX_AUTOMATIC_RULES);

  for (const rule of rules) {
    if (!rule.tagIds.includes(tagId)) {
      continue;
    }
    const tagIds = rule.tagIds.filter((ruleTagId) => ruleTagId !== tagId);
    if (!rule.category && tagIds.length === 0) {
      await ctx.db.delete(rule._id);
      continue;
    }
    await ctx.db.patch(rule._id, { tagIds });
  }
};
