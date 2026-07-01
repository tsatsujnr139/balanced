import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColors } from "@/hooks/use-theme";
import { cn } from "@/lib/cn";

import { budgetUsage, formatCurrency } from "../format";
import type { Budget } from "../types";

interface RowProps {
  budget: Budget;
  showLeading?: boolean;
  onPress?: () => void;
}

export function BudgetProgressRow({
  budget,
  showLeading = false,
  onPress,
}: RowProps) {
  const colors = useThemeColors();
  const usage = budgetUsage(budget.spent, budget.limit);
  const remaining = budget.limit - budget.spent;
  const isOverspent = remaining < 0;
  const remainingLabel = isOverspent
    ? `${formatCurrency(Math.abs(remaining), budget.currency)} overspent`
    : `${formatCurrency(remaining, budget.currency)} left`;

  const content = (
    <View className="flex-row items-center gap-3">
      {showLeading ? (
        <View
          className="size-[34px] items-center justify-center rounded-[10px]"
          style={{ backgroundColor: budget.color }}
        >
          <SymbolView
            name={budget.symbol as never}
            size={17}
            tintColor="#fff"
          />
        </View>
      ) : null}
      <View className="flex-1 gap-2">
        <View className="flex-row items-center gap-2">
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            className="min-w-0 flex-1 text-[16px]"
          >
            {budget.name}
          </ThemedText>
          <View className="shrink-0 flex-row items-baseline">
            <ThemedText
              type="smallBold"
              numberOfLines={1}
              className="text-[15px]"
            >
              {formatCurrency(budget.spent, budget.currency)}
            </ThemedText>
            <ThemedText type="small" numberOfLines={1} className="text-[15px]">
              {" / "}
              {formatCurrency(budget.limit, budget.currency)}
            </ThemedText>
          </View>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-border">
          <View
            className="h-2 rounded-full"
            style={{
              backgroundColor: budget.color,
              width: `${Math.max(usage, 2)}%`,
            }}
          />
        </View>
        <ThemedText
          type="small"
          color={isOverspent ? "negative" : "muted"}
          numberOfLines={1}
          className="text-right"
        >
          {remainingLabel}
        </ThemedText>
      </View>
      {onPress ? (
        <SymbolView name="chevron.right" size={12} tintColor={colors.muted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}

interface Props {
  budgets: Budget[];
  onPressBudget?: (budget: Budget) => void;
}

export function BudgetList({ budgets, onPressBudget }: Props) {
  if (budgets.length === 0) {
    return (
      <ThemedView
        variant="card"
        className="items-center rounded-[22px] px-4 py-7"
      >
        <View className="mb-3 size-11 items-center justify-center rounded-full bg-background">
          <SymbolView name="chart.pie" size={22} tintColor="#8E8E93" />
        </View>
        <ThemedText type="small" color="muted" className="text-center">
          No budgets found
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="card" className="rounded-[22px] p-4">
      {budgets.map((budget, index) => (
        <View
          key={budget.id}
          className={cn(index < budgets.length - 1 && "mb-5")}
        >
          <BudgetProgressRow
            budget={budget}
            onPress={onPressBudget ? () => onPressBudget(budget) : undefined}
          />
        </View>
      ))}
    </ThemedView>
  );
}
