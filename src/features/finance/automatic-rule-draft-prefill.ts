import type { TransactionCategory } from "./transaction-categories";
import type { AutomaticRuleType, TransactionTag } from "./types";

export interface AutomaticRuleDraftPrefill {
  category: TransactionCategory | null;
  matchTexts: string[];
  name: string;
  tags: TransactionTag[];
  type: AutomaticRuleType;
}

const automaticRuleDraftPrefillById = new Map<
  string,
  AutomaticRuleDraftPrefill
>();

export const setAutomaticRuleDraftPrefill = (
  id: string,
  prefill: AutomaticRuleDraftPrefill
): void => {
  automaticRuleDraftPrefillById.set(id, prefill);
};

export const getAutomaticRuleDraftPrefill = (
  id: string
): AutomaticRuleDraftPrefill | undefined =>
  automaticRuleDraftPrefillById.get(id);

export const clearAutomaticRuleDraftPrefill = (id: string): void => {
  automaticRuleDraftPrefillById.delete(id);
};
