import { useQuery } from "convex/react";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";

export interface FinanceTag {
  color: string;
  id: string;
  name: string;
}

export interface FinanceCategory {
  color: string;
  id: string;
  name: string;
  symbol: string;
}

const TAGS_CACHE_KEY = "finance.tags.v1";
const CATEGORIES_CACHE_KEY = "finance.categories.v1";
const ARCHIVED_CATEGORY_NAMES_CACHE_KEY = "finance.archived-categories.v1";

function isTag(value: unknown): value is FinanceTag {
  if (!value || typeof value !== "object") {
    return false;
  }
  const tag = value as Partial<FinanceTag>;
  return (
    typeof tag.color === "string" &&
    typeof tag.id === "string" &&
    typeof tag.name === "string"
  );
}

function isCategory(value: unknown): value is FinanceCategory {
  if (!value || typeof value !== "object") {
    return false;
  }
  const category = value as Partial<FinanceCategory>;
  return (
    typeof category.color === "string" &&
    typeof category.id === "string" &&
    typeof category.name === "string" &&
    typeof category.symbol === "string"
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function readCachedList<T>(
  key: string,
  predicate: (value: unknown) => value is T
): T[] {
  try {
    const serialized = Storage.getItemSync(key);
    if (!serialized) {
      return [];
    }
    const parsed = JSON.parse(serialized) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(predicate)) {
      Storage.removeItemSync(key);
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

function writeCachedList<T>(key: string, items: T[]) {
  void Storage.setItem(key, JSON.stringify(items)).catch(() => {
    /* empty */
  });
}

export function useCachedTags() {
  const convexTags = useQuery(api.finance.listTags);
  const [cachedTags, setCachedTags] = useState<FinanceTag[]>(() =>
    readCachedList(TAGS_CACHE_KEY, isTag)
  );

  useEffect(() => {
    if (convexTags === undefined) {
      return;
    }
    setCachedTags(convexTags);
    writeCachedList(TAGS_CACHE_KEY, convexTags);
  }, [convexTags]);

  return useMemo(
    () => ({
      isLoading: convexTags === undefined && cachedTags.length === 0,
      tags: convexTags ?? cachedTags,
    }),
    [cachedTags, convexTags]
  );
}

export function useCachedCategories() {
  const convexCategories = useQuery(api.finance.listCategories);
  const [cachedCategories, setCachedCategories] = useState<FinanceCategory[]>(
    () => readCachedList(CATEGORIES_CACHE_KEY, isCategory)
  );

  useEffect(() => {
    if (convexCategories === undefined) {
      return;
    }
    setCachedCategories(convexCategories);
    writeCachedList(CATEGORIES_CACHE_KEY, convexCategories);
  }, [convexCategories]);

  return useMemo(
    () => ({
      categories: convexCategories ?? cachedCategories,
      isLoading:
        convexCategories === undefined && cachedCategories.length === 0,
    }),
    [cachedCategories, convexCategories]
  );
}

export function useArchivedCategoryNames() {
  const convexNames = useQuery(api.finance.listArchivedCategoryNames);
  const [cachedNames, setCachedNames] = useState<string[]>(() =>
    readCachedList(ARCHIVED_CATEGORY_NAMES_CACHE_KEY, isString)
  );

  useEffect(() => {
    if (convexNames === undefined) {
      return;
    }
    setCachedNames(convexNames);
    writeCachedList(ARCHIVED_CATEGORY_NAMES_CACHE_KEY, convexNames);
  }, [convexNames]);

  return useMemo(
    () => ({
      archivedNames: convexNames ?? cachedNames,
      isLoading: convexNames === undefined && cachedNames.length === 0,
    }),
    [cachedNames, convexNames]
  );
}
