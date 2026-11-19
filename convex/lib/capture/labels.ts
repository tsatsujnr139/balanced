/**
 * Category and tag suggestions from the user's own labelling history.
 * Pure functions so they can be unit-tested and reused by Convex actions.
 */

export type LabelDirection = "credit" | "debit";

export interface LabelExample {
  category: string;
  description: string;
  direction: LabelDirection;
  tagNames: string[];
}

export interface LabelDraftInput {
  counterparty?: string;
  description: string;
  direction: LabelDirection;
  key: string;
  reference?: string;
}

export interface HistorySuggestion {
  category: string;
  /** 0–1: how strongly past transactions agree on this category. */
  confidence: number;
  /** How many past transactions matched. */
  matches: number;
  tagNames: string[];
}

const WORD = /[\p{L}\p{N}]+/gu;
const DIGITS_ONLY = /^\d+$/;
const MIN_TOKEN_LENGTH = 3;
/** Minimum token overlap for a past transaction to count as similar. */
const MIN_SIMILARITY = 0.5;
/** Tags must appear on at least this share of the matching weight. */
const TAG_SHARE = 0.5;

const STOP_WORDS = new Set([
  "and",
  "for",
  "from",
  "ghs",
  "mobile",
  "money",
  "mtn",
  "payment",
  "received",
  "sent",
  "the",
  "transfer",
  "via",
  "with",
  "your",
]);

/** Distinctive lower-case words: no numbers, short words, or boilerplate. */
export const labelTokens = (text: string): Set<string> =>
  new Set(
    (text.toLocaleLowerCase().match(WORD) ?? []).filter(
      (word) =>
        word.length >= MIN_TOKEN_LENGTH &&
        !DIGITS_ONLY.test(word) &&
        !STOP_WORDS.has(word)
    )
  );

const similarity = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) {
      shared += 1;
    }
  }
  // Overlap relative to the smaller set, so "boba" matches "boba delivery".
  return shared / Math.min(a.size, b.size);
};

export const draftLabelText = (draft: LabelDraftInput): string =>
  [draft.description, draft.counterparty, draft.reference]
    .filter(Boolean)
    .join(" ");

/**
 * Suggests the category most often used for similar past transactions in
 * the same direction, with tags that most of them shared.
 */
export const suggestFromHistory = (
  draft: LabelDraftInput,
  examples: LabelExample[]
): HistorySuggestion | null => {
  const draftTokens = labelTokens(draftLabelText(draft));
  const categoryWeight = new Map<string, number>();
  const tagWeight = new Map<string, number>();
  let totalWeight = 0;
  let matches = 0;

  for (const example of examples) {
    if (example.direction !== draft.direction) {
      continue;
    }
    const score = similarity(draftTokens, labelTokens(example.description));
    if (score < MIN_SIMILARITY) {
      continue;
    }
    matches += 1;
    totalWeight += score;
    categoryWeight.set(
      example.category,
      (categoryWeight.get(example.category) ?? 0) + score
    );
    for (const tag of new Set(example.tagNames)) {
      tagWeight.set(tag, (tagWeight.get(tag) ?? 0) + score);
    }
  }

  if (matches === 0) {
    return null;
  }

  let category = "";
  let best = 0;
  for (const [name, weight] of categoryWeight) {
    if (weight > best) {
      best = weight;
      category = name;
    }
  }
  const tagNames = [...tagWeight]
    .filter(([, weight]) => weight / totalWeight >= TAG_SHARE)
    .map(([name]) => name)
    .sort();

  return { category, confidence: best / totalWeight, matches, tagNames };
};

/** A history suggestion strong enough to pre-fill without asking the AI. */
export const isConfidentHistory = (suggestion: HistorySuggestion): boolean =>
  suggestion.confidence >= 0.6 && suggestion.matches >= 1;
