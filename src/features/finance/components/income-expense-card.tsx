import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColors } from "@/hooks/use-theme";

import { formatCurrency } from "../format";
import type { PeriodType } from "../period";

const PREVIOUS_LABEL: Record<PeriodType, string> = {
  monthly: "vs last month",
  weekly: "vs last week",
  yearly: "vs last year",
};

interface Props {
  totalIncome: number;
  totalSpent: number;
  previousNet: number;
  currency: string;
  periodType: PeriodType;
}

export function IncomeExpenseCard({
  totalIncome,
  totalSpent,
  previousNet,
  currency,
  periodType,
}: Props) {
  const colors = useThemeColors();
  const net = totalIncome - totalSpent;
  const netColor = net >= 0 ? colors.positive : colors.negative;

  const hasComparison = previousNet !== 0;
  const deltaPercent = hasComparison
    ? Math.round(((net - previousNet) / Math.abs(previousNet)) * 100)
    : 0;
  const improved = net >= previousNet;
  const deltaColor = improved ? colors.positive : colors.negative;

  return (
    <ThemedView variant="card" className="gap-4 rounded-[22px] p-5">
      <View className="flex-row">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-1.5">
            <SymbolView
              name="arrow.down.left"
              size={13}
              tintColor={colors.positive}
            />
            <ThemedText type="small" color="muted">
              Money in
            </ThemedText>
          </View>
          <ThemedText type="smallBold" className="text-[18px]">
            {formatCurrency(totalIncome, currency)}
          </ThemedText>
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-1.5">
            <SymbolView
              name="arrow.up.right"
              size={13}
              tintColor={colors.negative}
            />
            <ThemedText type="small" color="muted">
              Money out
            </ThemedText>
          </View>
          <ThemedText type="smallBold" className="text-[18px]">
            {formatCurrency(totalSpent, currency)}
          </ThemedText>
        </View>
      </View>

      <View className="h-px bg-border" />

      <View className="flex-row items-end justify-between">
        <View className="gap-1">
          <ThemedText type="small" color="muted">
            {net >= 0 ? "Net saved" : "Net overspent"}
          </ThemedText>
          <ThemedText
            type="subtitle"
            className="text-[26px] leading-[30px]"
            style={{ color: netColor }}
          >
            {formatCurrency(Math.abs(net), currency)}
          </ThemedText>
        </View>
        {hasComparison && deltaPercent !== 0 ? (
          <View className="flex-row items-center gap-1 pb-1">
            <SymbolView
              name={(improved ? "arrow.up.right" : "arrow.down.right") as never}
              size={12}
              tintColor={deltaColor}
            />
            <ThemedText type="small" style={{ color: deltaColor }}>
              {Math.abs(deltaPercent)}%
            </ThemedText>
            <ThemedText type="small" color="muted">
              {PREVIOUS_LABEL[periodType]}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}
