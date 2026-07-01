import type { Budget } from "./types";

export function filterBudgets(budgets: Budget[], query: string): Budget[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return budgets;
  }

  return budgets.filter((budget) =>
    [
      budget.name,
      budget.category ?? "",
      ...budget.tags.map((tag) => tag.name),
    ].some((value) => value.toLowerCase().includes(normalized))
  );
}
