import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform } from "react-native";

import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { AddBudgetContext } from "@/features/finance/add-budget-context";
import type {
  BudgetCategorySelection,
  BudgetTagSelection,
} from "@/features/finance/add-budget-context";
import { DEFAULT_BUDGET_PERIOD } from "@/features/finance/budget-constants";
import { DEFAULT_CURRENCY } from "@/features/finance/format";
import type { BudgetPeriod } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function amountInputToMinorUnits(value: string): number {
  const parsed = Number.parseFloat(value.replaceAll(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function formatAmountInput(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

function closeAddBudget() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.replace("/budgets");
}

export default function AddBudgetLayout() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === "string" ? params.id : null;
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const createBudget = useMutation(api.finance.createBudget);
  const updateBudget = useMutation(api.finance.updateBudget);
  const deleteBudget = useMutation(api.finance.deleteBudget);
  const { accounts, budgets } = useFinance();
  const editingBudget = budgets.find((budget) => budget.id === editingId);
  const initialCategory = editingBudget?.category
    ? {
        color: editingBudget.color,
        name: editingBudget.category,
        symbol: editingBudget.symbol,
      }
    : null;
  const [amount, setAmount] = useState(
    editingBudget ? formatAmountInput(editingBudget.limit) : ""
  );
  const [name, setName] = useState(editingBudget?.name ?? "");
  const [category, setCategory] = useState<BudgetCategorySelection | null>(
    initialCategory
  );
  const [period, setPeriod] = useState<BudgetPeriod>(
    editingBudget?.period ?? DEFAULT_BUDGET_PERIOD
  );
  const [tags, setTags] = useState<BudgetTagSelection[]>(
    editingBudget?.tags ?? []
  );
  const [notifyOnOverspend, setNotifyOnOverspend] = useState(
    editingBudget?.notifyOnOverspend ?? false
  );
  const [notifyAtThreshold, setNotifyAtThreshold] = useState(
    editingBudget?.notifyAtThreshold ?? false
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const submit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const limit = amountInputToMinorUnits(amount);
    if (limit <= 0) {
      Alert.alert("Missing amount", "Enter a budget amount to continue.");
      return;
    }
    if (!category) {
      Alert.alert("Missing category", "Choose a category for this budget.");
      return;
    }

    const trimmedName = name.trim() || category.name;
    const currency = accounts[0]?.currency ?? DEFAULT_CURRENCY;
    const tagIds = tags.map((tag) => tag.id as Id<"tags">);

    setIsSubmitting(true);
    try {
      const payload = {
        category: category.name,
        color: category.color,
        currency,
        limit,
        name: trimmedName,
        notifyAtThreshold,
        notifyOnOverspend,
        period,
        symbol: category.symbol,
        tagIds,
      };
      if (editingId) {
        await updateBudget({ id: editingId as Id<"budgets">, ...payload });
      } else {
        await createBudget(payload);
      }
      closeAddBudget();
    } catch (error) {
      Alert.alert(
        "Could not save budget",
        error instanceof Error ? error.message : "Please try again."
      );
      setIsSubmitting(false);
    }
  }, [
    accounts,
    amount,
    category,
    createBudget,
    editingId,
    isSubmitting,
    name,
    notifyAtThreshold,
    notifyOnOverspend,
    period,
    tags,
    updateBudget,
  ]);

  const toggleTag = useCallback((tag: BudgetTagSelection) => {
    setTags((current) =>
      current.some((item) => item.id === tag.id)
        ? current.filter((item) => item.id !== tag.id)
        : [...current, tag]
    );
  }, []);

  const confirmDelete = useCallback(() => {
    if (!editingId || isDeleting) {
      return;
    }

    const deleteLabel = editingBudget?.name ?? "This budget";
    Alert.alert(
      "Delete budget?",
      `“${deleteLabel}” will be permanently deleted. Transactions stay intact and will still be counted in your accounts.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteBudget({ id: editingId as Id<"budgets"> });
              closeAddBudget();
            } catch (error) {
              Alert.alert(
                "Could not delete budget",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setIsDeleting(false);
            }
          },
          style: "destructive",
          text: "Delete",
        },
      ]
    );
  }, [deleteBudget, editingBudget?.name, editingId, isDeleting]);

  const budgetContext = useMemo(
    () => ({
      amount,
      canDelete: Boolean(editingId),
      category,
      confirmDelete,
      isDeleting,
      isSubmitting,
      name,
      notifyAtThreshold,
      notifyOnOverspend,
      period,
      setAmount,
      setCategory,
      setName,
      setNotifyAtThreshold,
      setNotifyOnOverspend,
      setPeriod,
      submit: () => {
        void submit();
      },
      tags,
      toggleTag,
    }),
    [
      amount,
      category,
      confirmDelete,
      editingId,
      isDeleting,
      isSubmitting,
      name,
      notifyAtThreshold,
      notifyOnOverspend,
      period,
      submit,
      tags,
      toggleTag,
    ]
  );

  return (
    <AddBudgetContext.Provider value={budgetContext}>
      <Stack
        screenOptions={{
          headerBlurEffect:
            Platform.OS === "ios"
              ? disableHeaderBlur
                ? "none"
                : "systemMaterial"
              : undefined,
          headerShadowVisible: false,
          headerTransparent: true,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerLargeTitle: false,
            title: editingId ? "Edit budget" : "New budget",
          }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Close"
              icon="xmark"
              onPress={closeAddBudget}
              separateBackground
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            {isSubmitting ? (
              <Stack.Toolbar.View>
                <ActivityIndicator />
              </Stack.Toolbar.View>
            ) : (
              <Stack.Toolbar.Button
                accessibilityLabel="Save budget"
                icon="checkmark"
                onPress={() => {
                  void submit();
                }}
                tintColor={colors.primary}
                variant="prominent"
              />
            )}
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="category"
          options={{ headerBackVisible: false, title: "Category" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              accessibilityLabel="Add category"
              icon="plus"
              onPress={() => router.push("/add-category" as never)}
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="period"
          options={{ headerBackVisible: false, title: "Period" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="tags"
          options={{ headerBackVisible: false, title: "Tags" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              accessibilityLabel="Add tag"
              icon="plus"
              onPress={() => router.push("/add-budget/tag-new" as never)}
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="tag-new"
          options={{ headerBackVisible: false, title: "Add tag" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
      </Stack>
    </AddBudgetContext.Provider>
  );
}
