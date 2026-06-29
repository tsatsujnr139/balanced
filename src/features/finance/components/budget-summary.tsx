import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColors } from "@/hooks/use-theme";

import { formatCurrency } from "../format";

interface Props {
  totalBudgeted: number;
  totalSpent: number;
  currency: string;
}

export function BudgetSummary({ totalBudgeted, totalSpent, currency }: Props) {
  const colors = useThemeColors();
  const remaining = totalBudgeted - totalSpent;
  const isPositive = remaining >= 0;
  const deltaColor = isPositive ? colors.positive : colors.negative;

  return (
    <View className="gap-2">
      <View className="flex-row">
        <View className="flex-1 gap-1">
          <ThemedText type="smallBold" color="muted" className="text-[15px]">
            Budgeted
          </ThemedText>
          <ThemedText
            type="title"
            numberOfLines={1}
            adjustsFontSizeToFit
            className="text-[28px] leading-[34px]"
          >
            {formatCurrency(totalBudgeted, currency)}
          </ThemedText>
        </View>
        <View
          className="mx-5 w-px self-stretch"
          style={{ backgroundColor: colors.border }}
        />
        <View className="flex-1 gap-1">
          <ThemedText type="smallBold" color="muted" className="text-[15px]">
            Spent
          </ThemedText>
          <ThemedText
            type="title"
            numberOfLines={1}
            adjustsFontSizeToFit
            className="text-[28px] leading-[34px]"
          >
            {formatCurrency(totalSpent, currency)}
          </ThemedText>
        </View>
      </View>
      <View className="flex-row items-center gap-1.5">
        <SymbolView
          name={(isPositive ? "arrow.up.right" : "arrow.down.right") as never}
          size={13}
          tintColor={deltaColor}
        />
        <ThemedText type="small" style={{ color: deltaColor }}>
          {formatCurrency(Math.abs(remaining), currency)}
        </ThemedText>
        <ThemedText type="small" color="muted">
          {isPositive ? "remaining" : "over budget"}
        </ThemedText>
      </View>
    </View>
  );
}
