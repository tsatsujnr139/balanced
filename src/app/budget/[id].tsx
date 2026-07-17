import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { Icon as SymbolView } from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatBudgetPeriodLabel } from "@/features/finance/budget-constants";
import { PeriodSelector } from "@/features/finance/components/period-selector";
import { TransactionList } from "@/features/finance/components/transaction-list";
import {
  budgetUsage,
  budgetUsagePercent,
  formatCurrency,
} from "@/features/finance/format";
import {
  formatPeriodLabel,
  isCurrentPeriod,
  periodRange,
  shiftPeriod,
} from "@/features/finance/period";
import type { PeriodRange, PeriodType } from "@/features/finance/period";
import type { Budget } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

const TAB_VALUES = ["Overview", "Transactions"];
const DAY_MS = 86_400_000;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function periodSettingsForBudget(budget: Budget | undefined): {
  interval: number;
  type: PeriodType;
} {
  const interval = budget?.periodInterval ?? 1;
  if (budget?.period === "weekly" || budget?.period === "yearly") {
    return { interval, type: budget.period };
  }
  if (budget?.period === "quarterly") {
    return { interval: interval * 3, type: "monthly" };
  }
  return { interval, type: "monthly" };
}

function BudgetOverview({
  budget,
  periodLabel,
  range,
  spent,
}: {
  budget: Budget;
  periodLabel: string;
  range: PeriodRange | null;
  spent: number;
}) {
  const colors = useThemeColors();
  const percent = budgetUsagePercent(spent, budget.limit);
  const usage = budgetUsage(spent, budget.limit);
  const remaining = budget.limit - spent;
  const overspent = Math.max(spent - budget.limit, 0);
  const riskAmount = Math.max(remaining, 0);
  const totalDays = range
    ? Math.max(Math.round((range.end - range.start) / DAY_MS), 1)
    : null;
  const elapsedDays = range
    ? Math.max(
        Math.min(
          Math.floor((Date.now() - range.start) / DAY_MS) + 1,
          totalDays ?? 1
        ),
        1
      )
    : null;
  const dailyAverage = elapsedDays ? Math.round(spent / elapsedDays) : null;
  const dailyBudget = totalDays ? Math.round(budget.limit / totalDays) : null;

  return (
    <View className="gap-4">
      <ThemedView variant="card" className="rounded-[22px] p-4">
        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <ThemedText type="smallBold" color="muted" className="uppercase">
              {formatBudgetPeriodLabel(budget.period, budget.periodInterval)}
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
              width: `${Math.max(usage, spent > 0 ? 2 : 0)}%`,
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
              {periodLabel} net category usage
            </ThemedText>
          </View>
        </View>
        {dailyAverage !== null && dailyBudget !== null ? (
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
                {formatCurrency(dailyBudget, budget.currency)}
              </ThemedText>
              <ThemedText type="smallBold">Daily Budget</ThemedText>
            </View>
          </View>
        ) : null}
      </ThemedView>
    </View>
  );
}

export default function BudgetDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const { budgets } = useFinance();
  const [tabIndex, setTabIndex] = useState(0);
  const [anchor, setAnchor] = useState(() => new Date());
  const [isPausing, setIsPausing] = useState(false);
  const pauseBudget = useMutation(api.finance.pauseBudget);
  const resumeBudget = useMutation(api.finance.resumeBudget);
  const endBudget = useMutation(api.finance.endBudget);
  const budget = budgets.find((item) => item.id === id);
  const periodSettings = periodSettingsForBudget(budget);
  const periodType = periodSettings.type;
  const periodInterval = periodSettings.interval;
  const isOneTime = budget?.period === "one_time";
  const selectedRange = useMemo(
    () =>
      isOneTime
        ? { end: Number.MAX_SAFE_INTEGER, start: 0 }
        : periodRange(periodType, anchor, periodInterval),
    [anchor, isOneTime, periodInterval, periodType]
  );
  const selectedPeriodLabel = isOneTime
    ? "All time"
    : formatPeriodLabel(periodType, anchor, periodInterval);
  const budgetTransactions = useQuery(
    api.finance.listBudgetTransactions,
    budget
      ? {
          end: selectedRange.end,
          id: budget.id as Id<"budgets">,
          start: selectedRange.start,
        }
      : "skip"
  );
  const selectedSpent = useMemo(
    () =>
      budgetTransactions?.reduce(
        (total, transaction) => total - transaction.amount,
        0
      ) ?? 0,
    [budgetTransactions]
  );

  const showPreviousPeriod = useCallback(() => {
    setAnchor((current) =>
      shiftPeriod(current, periodType, -1, periodInterval)
    );
  }, [periodInterval, periodType]);

  const showNextPeriod = useCallback(() => {
    setAnchor((current) => shiftPeriod(current, periodType, 1, periodInterval));
  }, [periodInterval, periodType]);

  const confirmPause = useCallback(() => {
    if (!budget || isPausing || !budget._id) {
      return;
    }

    const budgetLabel = budget.name;
    const isPaused = budget.status === "paused";
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
    if (!budget || isPausing || !budget._id) {
      return;
    }

    const budgetLabel = budget.name;
    Alert.alert(
      "End budget?",
      `"${budgetLabel}" will be permanently ended and excluded from your budget calculations. You can delete it later if needed.`,
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
        <SegmentedControl
          appearance={colorScheme === "dark" ? "dark" : "light"}
          onChange={(event) => {
            setTabIndex(event.nativeEvent.selectedSegmentIndex);
          }}
          selectedIndex={tabIndex}
          style={{ width: "100%" }}
          values={TAB_VALUES}
        />

        {isOneTime ? (
          <ThemedText type="smallBold" className="text-center text-[16px]">
            All time
          </ThemedText>
        ) : (
          <PeriodSelector
            isForwardDisabled={isCurrentPeriod(
              periodType,
              anchor,
              periodInterval
            )}
            label={selectedPeriodLabel}
            onNext={showNextPeriod}
            onPrev={showPreviousPeriod}
            periodType={periodType}
          />
        )}

        {budgetTransactions === undefined ? (
          <ActivityIndicator color={colors.foreground} />
        ) : tabIndex === 0 ? (
          <BudgetOverview
            budget={budget}
            periodLabel={selectedPeriodLabel}
            range={isOneTime ? null : selectedRange}
            spent={selectedSpent}
          />
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
                borderColor: colors.primary,
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
