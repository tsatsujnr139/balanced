import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TransactionList } from "@/features/finance/components/transaction-list";
import {
  budgetUsage,
  budgetUsagePercent,
  formatCurrency,
} from "@/features/finance/format";
import type { Budget, Transaction } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type TabKey = "overview" | "transactions";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isCurrentMonth(date: string): boolean {
  const transactionDate = new Date(date);
  const now = new Date();
  return (
    transactionDate.getFullYear() === now.getFullYear() &&
    transactionDate.getMonth() === now.getMonth()
  );
}

function matchesBudget(transaction: Transaction, budget: Budget): boolean {
  if (transaction.amount >= 0) {
    return false;
  }
  if (budget.category && transaction.category !== budget.category) {
    return false;
  }
  if (
    budget.tagIds.length > 0 &&
    !transaction.tags.some((tag) => budget.tagIds.includes(tag.id))
  ) {
    return false;
  }
  return true;
}

function dailyRecommended(remaining: number): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(lastDay - now.getDate() + 1, 1);
  return Math.max(Math.round(remaining / remainingDays), 0);
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        alignItems: "center",
        borderBottomColor: active ? colors.primary : colors.border,
        borderBottomWidth: active ? 3 : 1,
        flex: 1,
        paddingBottom: 12,
        paddingTop: 10,
      }}
    >
      <Text
        style={{
          color: active ? colors.primary : colors.foreground,
          fontSize: 17,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MonthOverview({ budget, spent }: { budget: Budget; spent: number }) {
  const colors = useThemeColors();
  const percent = budgetUsagePercent(spent, budget.limit);
  const usage = budgetUsage(spent, budget.limit);
  const remaining = budget.limit - spent;
  const overspent = Math.max(spent - budget.limit, 0);
  const riskAmount = Math.max(remaining, 0);
  const dailyAverage = Math.round(spent / Math.max(new Date().getDate(), 1));

  return (
    <View className="gap-4">
      <ThemedView variant="card" className="rounded-[22px] p-4">
        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <ThemedText type="smallBold" color="muted" className="uppercase">
              This month
            </ThemedText>
            <ThemedText type="title" className="text-[34px] leading-[42px]">
              {formatCurrency(budget.limit, budget.currency)}
            </ThemedText>
          </View>
          <View className="rounded-xl bg-background px-3 py-2">
            <ThemedText
              type="smallBold"
              color={percent > 100 ? "negative" : "muted"}
            >
              {100 - percent}%
            </ThemedText>
          </View>
        </View>

        <View className="mt-5 h-3 overflow-hidden rounded-full bg-border">
          <View
            className="h-3 rounded-full"
            style={{
              backgroundColor: overspent > 0 ? colors.negative : budget.color,
              width: `${Math.max(usage, budget.spent > 0 ? 2 : 0)}%`,
            }}
          />
        </View>

        <View className="mt-4 flex-row justify-between gap-3">
          <View className="flex-1">
            <ThemedText type="smallBold" color="muted">
              {formatCurrency(spent, budget.currency)}
            </ThemedText>
            <ThemedText type="smallBold" color="muted">
              Spent
            </ThemedText>
          </View>
          <View className="flex-1 items-center">
            <ThemedText type="smallBold" color="muted">
              {formatCurrency(budget.limit, budget.currency)}
            </ThemedText>
            <ThemedText type="smallBold" color="muted">
              Planned
            </ThemedText>
          </View>
          <View className="flex-1 items-end">
            <ThemedText
              type="smallBold"
              color={overspent > 0 ? "negative" : "foreground"}
            >
              {formatCurrency(
                overspent > 0 ? overspent : riskAmount,
                budget.currency
              )}
            </ThemedText>
            <ThemedText
              type="smallBold"
              color={overspent > 0 ? "negative" : "foreground"}
            >
              {overspent > 0 ? "Overspent" : "Left"}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedView variant="card" className="rounded-[22px] p-4">
        <View className="flex-row items-center gap-3">
          <View
            className="size-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: budget.color }}
          >
            <SymbolView
              name={budget.symbol as never}
              size={24}
              tintColor="#fff"
            />
          </View>
          <View className="min-w-0 flex-1">
            <ThemedText type="smallBold" className="text-[17px]">
              {budget.category ?? budget.name}
            </ThemedText>
            <ThemedText type="small" color="muted">
              Current month category spend
            </ThemedText>
          </View>
        </View>
        <View className="mt-5 flex-row justify-between gap-3">
          <View>
            <ThemedText type="subtitle" color="muted">
              {formatCurrency(dailyAverage, budget.currency)}
            </ThemedText>
            <ThemedText type="smallBold" color="muted">
              Daily Average
            </ThemedText>
          </View>
          <View className="items-end">
            <ThemedText type="subtitle">
              {formatCurrency(dailyRecommended(remaining), budget.currency)}
            </ThemedText>
            <ThemedText type="smallBold">Daily Recommended</ThemedText>
          </View>
        </View>
      </ThemedView>
    </View>
  );
}

export default function BudgetDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);
  const colors = useThemeColors();
  const { budgets, transactions } = useFinance();
  const [tab, setTab] = useState<TabKey>("overview");
  const [isPausing, setIsPausing] = useState(false);
  const pauseBudget = useMutation(api.finance.pauseBudget);
  const resumeBudget = useMutation(api.finance.resumeBudget);
  const endBudget = useMutation(api.finance.endBudget);
  const budget = budgets.find((item) => item.id === id);
  const budgetTransactions = useMemo(() => {
    if (!budget) {
      return [];
    }
    return transactions
      .filter(
        (transaction) =>
          isCurrentMonth(transaction.date) && matchesBudget(transaction, budget)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [budget, transactions]);
  const currentMonthSpent = useMemo(
    () =>
      budgetTransactions.reduce(
        (total, transaction) => total + Math.abs(transaction.amount),
        0
      ),
    [budgetTransactions]
  );

  const confirmPause = useCallback(() => {
    if (!budget || isPausing) {
      return;
    }

    const budgetLabel = budget.name;
    const isPaused = budget.status === "paused";
    Alert.alert(
      isPaused ? "Resume budget?" : "Pause budget?",
      isPaused
        ? `"${budgetLabel}" will be active again and included in your monthly budget calculations.`
        : `"${budgetLabel}" will be excluded from your monthly budget calculations.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsPausing(true);
            try {
              if (isPaused) {
                await resumeBudget({ id: budget._id as Id<"budgets"> });
              } else {
                await pauseBudget({ id: budget._id as Id<"budgets"> });
              }
              router.back();
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
  }, [budget, isPausing, pauseBudget, resumeBudget]);

  const confirmEnd = useCallback(() => {
    if (!budget || isPausing) {
      return;
    }

    const budgetLabel = budget.name;
    Alert.alert(
      "End budget?",
      `"${budgetLabel}" will be permanently ended and excluded from your monthly budget calculations. You can delete it later if needed.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsPausing(true);
            try {
              await endBudget({ id: budget._id as Id<"budgets"> });
              router.back();
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
  }, [budget, isPausing, endBudget]);

  if (!budget) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <Stack.Screen.BackButton displayMode="minimal" />
        <ThemedText type="small" color="muted">
          This budget was not found.
        </ThemedText>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title>{budget.name}</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Edit budget"
          onPress={() => {
            router.push({ params: { id: budget.id }, pathname: "/add-budget" });
          }}
          variant="plain"
        >
          Edit
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: 18,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <View className="flex-row">
          <TabButton
            active={tab === "overview"}
            label="Overview"
            onPress={() => setTab("overview")}
          />
          <TabButton
            active={tab === "transactions"}
            label="Transactions"
            onPress={() => setTab("transactions")}
          />
        </View>
        {tab === "overview" ? (
          <MonthOverview budget={budget} spent={currentMonthSpent} />
        ) : (
          <TransactionList transactions={budgetTransactions} />
        )}

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pause or resume budget"
              disabled={isPausing}
              onPress={confirmPause}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderCurve: "continuous",
                borderRadius: 12,
                borderWidth: 1,
                flex: 1,
                justifyContent: "center",
                minHeight: 56,
                opacity: pressed || isPausing ? 0.6 : 1,
              })}
            >
              {isPausing ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <View
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <SymbolView
                    name="pause.circle"
                    size={18}
                    tintColor={colors.primary}
                  />
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 17,
                      fontWeight: "600",
                    }}
                  >
                    Pause
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End budget"
              disabled={isPausing}
              onPress={confirmEnd}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: colors.card,
                borderColor: colors.negative,
                borderCurve: "continuous",
                borderRadius: 12,
                borderWidth: 1,
                flex: 1,
                justifyContent: "center",
                minHeight: 56,
                opacity: pressed || isPausing ? 0.6 : 1,
              })}
            >
              {isPausing ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <View
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <SymbolView
                    name="stop.circle"
                    size={18}
                    tintColor={colors.negative}
                  />
                  <Text
                    style={{
                      color: colors.negative,
                      fontSize: 17,
                      fontWeight: "600",
                    }}
                  >
                    End
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
