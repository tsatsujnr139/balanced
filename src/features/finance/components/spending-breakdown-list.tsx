import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColors } from "@/hooks/use-theme";
import { cn } from "@/lib/cn";

import { formatCurrency } from "../format";
import type { SpendingGroup } from "../use-stats";

interface RowProps {
  group: SpendingGroup;
  currency: string;
  total: number;
  onPress?: () => void;
}

function GroupRow({ group, currency, total, onPress }: RowProps) {
  const colors = useThemeColors();
  const percent = total > 0 ? Math.round((group.amount / total) * 100) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-3"
      disabled={!onPress}
      onPress={onPress}
    >
      <View
        className="size-[34px] items-center justify-center rounded-[10px]"
        style={{ backgroundColor: group.color }}
      >
        <SymbolView name={group.symbol as never} size={17} tintColor="#fff" />
      </View>
      <View className="flex-1 gap-2">
        <View className="flex-row items-center gap-2">
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            className="flex-1 text-[16px]"
          >
            {group.label}
          </ThemedText>
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            className="text-[15px]"
          >
            {formatCurrency(group.amount, currency)}
          </ThemedText>
          <ThemedText
            type="small"
            color="muted"
            className="w-[44px] text-right"
          >
            {percent}%
          </ThemedText>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-border">
          <View
            className="h-2 rounded-full"
            style={{
              backgroundColor: group.color,
              width: `${Math.max(percent, 2)}%`,
            }}
          />
        </View>
      </View>
      {onPress ? (
        <SymbolView name="chevron.right" size={12} tintColor={colors.muted} />
      ) : null}
    </Pressable>
  );
}

interface Props {
  groups: SpendingGroup[];
  currency: string;
  onPressGroup?: (group: SpendingGroup) => void;
}

export function SpendingBreakdownList({
  groups,
  currency,
  onPressGroup,
}: Props) {
  const total = groups.reduce((sum, group) => sum + group.amount, 0);

  return (
    <ThemedView variant="card" className="rounded-[22px] p-4">
      {groups.map((group, index) => (
        <View
          key={group.key}
          className={cn(index < groups.length - 1 && "mb-5")}
        >
          <GroupRow
            currency={currency}
            group={group}
            onPress={onPressGroup ? () => onPressGroup(group) : undefined}
            total={total}
          />
        </View>
      ))}
    </ThemedView>
  );
}
