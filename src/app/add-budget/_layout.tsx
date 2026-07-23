import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { MaterialIcons } from "@/constants/material-icons";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AddBudgetContext } from "@/features/finance/add-budget-context";
import type {
  BudgetCategorySelection,
  BudgetTagSelection,
} from "@/features/finance/add-budget-context";
import {
  DEFAULT_BUDGET_PERIOD,
  DEFAULT_BUDGET_PERIOD_INTERVAL,
} from "@/features/finance/budget-constants";
import { DEFAULT_LABEL_COLOR } from "@/features/finance/color-utils";
import { DEFAULT_CURRENCY } from "@/features/finance/format";
import type { BudgetPeriod } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

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
  const pauseBudget = useMutation(api.finance.pauseBudget);
  const resumeBudget = useMutation(api.finance.resumeBudget);
  const endBudget = useMutation(api.finance.endBudget);
  const { budgets } = useFinance();
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
  const [currency, setCurrency] = useState(
    editingBudget?.currency ?? DEFAULT_CURRENCY
  );
  const [category, setCategory] = useState<BudgetCategorySelection | null>(
    initialCategory
  );
  const [period, setPeriod] = useState<BudgetPeriod>(
    editingBudget?.period ?? DEFAULT_BUDGET_PERIOD
  );
  const [periodInterval, setPeriodInterval] = useState(
    String(editingBudget?.periodInterval ?? DEFAULT_BUDGET_PERIOD_INTERVAL)
  );
  const [tags, setTags] = useState<BudgetTagSelection[]>(
    editingBudget?.tags ?? []
  );
  const [tagColorDraft, setTagColorDraft] = useState(DEFAULT_LABEL_COLOR);
  const [notifyOnOverspend, setNotifyOnOverspend] = useState(
    editingBudget?.notifyOnOverspend ?? false
  );
  const [notifyAtThreshold, setNotifyAtThreshold] = useState(
    editingBudget?.notifyAtThreshold ?? false
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

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
    const parsedPeriodInterval = Number.parseInt(periodInterval, 10);
    if (
      period !== "one_time" &&
      (!Number.isSafeInteger(parsedPeriodInterval) || parsedPeriodInterval < 1)
    ) {
      Alert.alert(
        "Invalid period length",
        "Enter a whole number greater than zero."
      );
      return;
    }

    const trimmedName = name.trim() || category.name;
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
        periodInterval:
          period === "one_time"
            ? DEFAULT_BUDGET_PERIOD_INTERVAL
            : parsedPeriodInterval,
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
    amount,
    category,
    createBudget,
    currency,
    editingId,
    isSubmitting,
    name,
    notifyAtThreshold,
    notifyOnOverspend,
    period,
    periodInterval,
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
      `"${deleteLabel}" will be permanently deleted. Transactions stay intact and will still be counted in your accounts.`,
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

  const confirmPause = useCallback(() => {
    if (!editingId || isPausing) {
      return;
    }

    const budgetLabel = editingBudget?.name ?? "This budget";
    const isPaused = editingBudget?.status === "paused";
    Alert.alert(
      isPaused ? "Resume budget?" : "Pause budget?",
      isPaused
        ? `"${budgetLabel}" will be active again and included in your budget calculations.`
        : `"${budgetLabel}" will be excluded from your budget calculations.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsPausing(true);
            try {
              if (isPaused) {
                await resumeBudget({ id: editingId as Id<"budgets"> });
              } else {
                await pauseBudget({ id: editingId as Id<"budgets"> });
              }
              closeAddBudget();
            } catch (error) {
              Alert.alert(
                isPaused ? "Could not resume budget" : "Could not pause budget",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setIsPausing(false);
            }
          },
          style: isPaused ? "default" : "destructive",
          text: isPaused ? "Resume" : "Pause",
        },
      ]
    );
  }, [
    editingBudget?.name,
    editingBudget?.status,
    editingId,
    isPausing,
    pauseBudget,
    resumeBudget,
  ]);

  const confirmEnd = useCallback(() => {
    if (!editingId || isPausing) {
      return;
    }

    const budgetLabel = editingBudget?.name ?? "This budget";
    Alert.alert(
      "End budget?",
      `"${budgetLabel}" will be permanently ended and excluded from your budget calculations. You can delete it later if needed.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsPausing(true);
            try {
              await endBudget({ id: editingId as Id<"budgets"> });
              closeAddBudget();
            } catch (error) {
              Alert.alert(
                "Could not end budget",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setIsPausing(false);
            }
          },
          style: "destructive",
          text: "End",
        },
      ]
    );
  }, [editingBudget?.name, editingId, isPausing, endBudget]);

  const budgetContext = useMemo(
    () => ({
      amount,
      canDelete: Boolean(editingId),
      category,
      confirmDelete,
      confirmEnd,
      confirmPause,
      currency,
      isDeleting,
      isPausing,
      isSubmitting,
      name,
      notifyAtThreshold,
      notifyOnOverspend,
      period,
      periodInterval,
      setAmount,
      setCategory,
      setCurrency,
      setName,
      setNotifyAtThreshold,
      setNotifyOnOverspend,
      setPeriod,
      setPeriodInterval,
      setTagColorDraft,
      submit: () => {
        void submit();
      },
      tagColorDraft,
      tags,
      toggleTag,
    }),
    [
      amount,
      category,
      confirmDelete,
      confirmEnd,
      confirmPause,
      currency,
      editingId,
      isDeleting,
      isPausing,
      isSubmitting,
      name,
      notifyAtThreshold,
      notifyOnOverspend,
      period,
      periodInterval,
      submit,
      tagColorDraft,
      tags,
      toggleTag,
    ]
  );

  const renderBackButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Back"
        icon={MaterialIcons.chevronLeft}
        onPress={() => router.back()}
      />
    ),
    []
  );

  const renderCloseButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Close"
        icon={MaterialIcons.close}
        onPress={closeAddBudget}
      />
    ),
    []
  );

  const renderSaveButton = useCallback(
    () =>
      isSubmitting ? (
        <ActivityIndicator />
      ) : (
        <HeaderIconButton
          accessibilityLabel="Save budget"
          icon={MaterialIcons.check}
          onPress={() => {
            void submit();
          }}
          tintColor={colors.primary}
        />
      ),
    [isSubmitting, submit, colors.primary]
  );

  const renderAddCategoryButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Add category"
        icon={MaterialIcons.add}
        onPress={() => router.push("/add-category" as never)}
      />
    ),
    []
  );

  const renderAddTagButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Add tag"
        icon={MaterialIcons.add}
        onPress={() => router.push("/add-budget/tag-new" as never)}
      />
    ),
    []
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
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: colors.background }
              : undefined,
          headerTransparent: Platform.OS === "ios",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerLargeTitle: false,
            ...androidHeaderOptions({
              headerLeft: renderCloseButton,
              headerRight: renderSaveButton,
            }),
            title: editingId ? "Edit budget" : "New budget",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Close"
                icon="xmark"
                onPress={closeAddBudget}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" ? (
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
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="category"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({
              headerLeft: renderBackButton,
              headerRight: renderAddCategoryButton,
            }),
            title: "Category",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="right">
              <Stack.Toolbar.Button
                accessibilityLabel="Add category"
                icon="plus"
                onPress={() => router.push("/add-category" as never)}
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="period"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Period",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="currency"
          options={{
            headerBackVisible: false,
            headerLargeTitle: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Currency",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="tags"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({
              headerLeft: renderBackButton,
              headerRight: renderAddTagButton,
            }),
            title: "Tags",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="right">
              <Stack.Toolbar.Button
                accessibilityLabel="Add tag"
                onPress={() => router.push("/add-budget/tag-new" as never)}
              >
                Add
              </Stack.Toolbar.Button>
              <Stack.Toolbar.Button
                accessibilityLabel="Done"
                onPress={() => router.back()}
                variant="done"
              >
                Done
              </Stack.Toolbar.Button>
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="tag-new"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Add tag",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="tag-color"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Color",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
      </Stack>
    </AddBudgetContext.Provider>
  );
}
