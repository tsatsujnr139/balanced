import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth } from "@/constants/theme";
import { BudgetList } from "@/features/finance/components/budget-list";
import { CategoryDonut } from "@/features/finance/components/category-donut";
import { CurrencyPicker } from "@/features/finance/components/currency-picker";
import { IncomeExpenseCard } from "@/features/finance/components/income-expense-card";
import { PeriodSelector } from "@/features/finance/components/period-selector";
import { SpendingBreakdownList } from "@/features/finance/components/spending-breakdown-list";
import { SpendingTrend } from "@/features/finance/components/spending-trend";
import {
  formatPeriodLabel,
  isCurrentPeriod,
  periodRange,
  shiftPeriod,
} from "@/features/finance/period";
import type { PeriodType } from "@/features/finance/period";
import type { Budget } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { resolvePrimaryCurrency, useStats } from "@/features/finance/use-stats";
import type { SpendingGroup } from "@/features/finance/use-stats";
import { useThemeColors } from "@/hooks/use-theme";

const DAY_MS = 86_400_000;
const UNTAGGED_KEY = "__untagged__";
const BREAKDOWN_VALUES = ["Category", "Tags"];

function EmptyCard({ message }: { message: string }) {
  return (
    <ThemedView
      variant="card"
      className="items-center rounded-[22px] px-4 py-10"
    >
      <View className="mb-3 size-12 items-center justify-center rounded-full bg-background">
        <SymbolView name="chart.pie" size={24} tintColor="#8E8E93" />
      </View>
      <ThemedText type="smallBold" className="text-[16px]">
        {message}
      </ThemedText>
      <ThemedText type="small" color="muted" className="mt-1 text-center">
        Transactions you add will show up here as insights.
      </ThemedText>
    </ThemedView>
  );
}

interface BreakdownToggleProps {
  selectedIndex: number;
  onChange: (index: number) => void;
}

function BreakdownToggle({ selectedIndex, onChange }: BreakdownToggleProps) {
  const colorScheme = useColorScheme();

  return (
    <SegmentedControl
      appearance={colorScheme === "dark" ? "dark" : "light"}
      onChange={(event) => {
        onChange(event.nativeEvent.selectedSegmentIndex);
      }}
      selectedIndex={selectedIndex}
      style={{ width: "100%" }}
      values={BREAKDOWN_VALUES}
    />
  );
}

/** Units elapsed in the period so far (for average and projection). */
function elapsedUnits(
  periodType: PeriodType,
  anchor: Date,
  totalUnits: number
): number {
  if (!isCurrentPeriod(periodType, anchor)) {
    return totalUnits;
  }
  const { start } = periodRange(periodType, anchor);
  if (periodType === "yearly") {
    return Math.min(totalUnits, new Date().getMonth() + 1);
  }
  return Math.min(totalUnits, Math.floor((Date.now() - start) / DAY_MS) + 1);
}

export default function StatsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { accounts } = useFinance();

  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [anchor, setAnchor] = useState(() => new Date());
  const [pickedCurrency, setPickedCurrency] = useState<string | null>(null);
  const [breakdownIndex, setBreakdownIndex] = useState(0);

  const currencies = useMemo(
    () => [...new Set(accounts.map((account) => account.currency))].sort(),
    [accounts]
  );
  const currency = pickedCurrency ?? resolvePrimaryCurrency(currencies);

  const { stats, isLoading } = useStats(periodType, anchor, currency);

  const showTags = breakdownIndex === 1;
  const breakdownGroups = showTags ? stats.tags : stats.categories;
  const hasSpending = stats.totalSpent > 0;
  const hasActivity = hasSpending || stats.totalIncome > 0;

  const unit = periodType === "yearly" ? "month" : "day";
  const totalUnits = stats.trend.length;
  const elapsed = elapsedUnits(periodType, anchor, totalUnits);
  const average = elapsed > 0 ? Math.round(stats.totalSpent / elapsed) : 0;
  const projected =
    isCurrentPeriod(periodType, anchor) && elapsed > 0
      ? Math.round(average * totalUnits)
      : null;

  const budgetItems: Budget[] = useMemo(
    () =>
      stats.budgets.map((budget) => ({
        category: null,
        color: budget.color,
        currency: budget.currency,
        id: budget.id,
        limit: budget.limit,
        name: budget.name,
        notifyAtThreshold: false,
        notifyOnOverspend: false,
        period: "monthly",
        spent: budget.spent,
        symbol: budget.symbol,
        tagId: null,
        tagIds: [],
        tags: [],
      })),
    [stats.budgets]
  );

  const handlePrev = useCallback(() => {
    setAnchor((current) => shiftPeriod(current, periodType, -1));
  }, [periodType]);

  const handleNext = useCallback(() => {
    setAnchor((current) => shiftPeriod(current, periodType, 1));
  }, [periodType]);

  const handleChangeType = useCallback((type: PeriodType) => {
    setPeriodType(type);
    setAnchor(new Date());
  }, []);

  const handlePressGroup = useCallback((group: SpendingGroup) => {
    if (group.key === UNTAGGED_KEY) {
      return;
    }
    router.push({ params: { q: group.label }, pathname: "/transactions" });
  }, []);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1 bg-background"
      contentContainerClassName="items-center px-5"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: insets.bottom + BottomTabInset + 24,
      }}
    >
      <View className="w-full gap-6 pt-2" style={{ maxWidth: MaxContentWidth }}>
        <PeriodSelector
          isForwardDisabled={isCurrentPeriod(periodType, anchor)}
          label={formatPeriodLabel(periodType, anchor)}
          onChangeType={handleChangeType}
          onNext={handleNext}
          onPrev={handlePrev}
          periodType={periodType}
        />

        <CurrencyPicker
          currencies={currencies}
          onSelect={setPickedCurrency}
          selected={currency}
        />

        {isLoading ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator color={colors.muted} />
          </View>
        ) : null}

        {!isLoading && hasActivity ? (
          <>
            <IncomeExpenseCard
              currency={currency}
              periodType={periodType}
              previousNet={stats.previousTotalIncome - stats.previousTotalSpent}
              totalIncome={stats.totalIncome}
              totalSpent={stats.totalSpent}
            />

            <View className="gap-3">
              <ThemedText type="subtitle" className="text-[22px] leading-7">
                Spending trend
              </ThemedText>
              <SpendingTrend
                average={average}
                currency={currency}
                projected={projected}
                trend={stats.trend}
                unit={unit}
              />
            </View>

            <View className="gap-3">
              <BreakdownToggle
                onChange={setBreakdownIndex}
                selectedIndex={breakdownIndex}
              />
              {hasSpending ? (
                <>
                  <CategoryDonut
                    groups={breakdownGroups}
                    transactionCount={stats.transactionCount}
                  />
                  <SpendingBreakdownList
                    currency={currency}
                    groups={breakdownGroups}
                    onPressGroup={handlePressGroup}
                  />
                </>
              ) : (
                <EmptyCard message="No spending this period" />
              )}
            </View>

            {budgetItems.length > 0 ? (
              <View className="gap-3">
                <ThemedText type="subtitle" className="text-[22px] leading-7">
                  Budgets
                </ThemedText>
                <BudgetList
                  budgets={budgetItems}
                  onPressBudget={(budget) =>
                    router.push(`/budget/${budget.id}`)
                  }
                />
              </View>
            ) : null}
          </>
        ) : null}

        {!(isLoading || hasActivity) ? (
          <EmptyCard message="No activity this period" />
        ) : null}
      </View>
    </ScrollView>
  );
}
