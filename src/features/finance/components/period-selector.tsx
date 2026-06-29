import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { SymbolView } from "expo-symbols";
import { Pressable, View, useColorScheme } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColors } from "@/hooks/use-theme";

import type { PeriodType } from "../period";

const SEGMENT_VALUES = ["Week", "Month", "Year"];
const SEGMENT_TYPES: PeriodType[] = ["weekly", "monthly", "yearly"];

interface Props {
  periodType: PeriodType;
  onChangeType: (type: PeriodType) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  isForwardDisabled: boolean;
}

export function PeriodSelector({
  periodType,
  onChangeType,
  label,
  onPrev,
  onNext,
  isForwardDisabled,
}: Props) {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();

  return (
    <View className="gap-3">
      <SegmentedControl
        appearance={colorScheme === "dark" ? "dark" : "light"}
        onChange={(event) => {
          const next = SEGMENT_TYPES[event.nativeEvent.selectedSegmentIndex];
          if (next) {
            onChangeType(next);
          }
        }}
        selectedIndex={SEGMENT_TYPES.indexOf(periodType)}
        style={{ width: "100%" }}
        values={SEGMENT_VALUES}
      />

      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityLabel="Previous period"
          accessibilityRole="button"
          className="size-9 items-center justify-center rounded-full bg-card"
          hitSlop={6}
          onPress={onPrev}
        >
          <SymbolView name="chevron.left" size={15} tintColor={colors.muted} />
        </Pressable>
        <ThemedText type="smallBold" className="text-[16px]">
          {label}
        </ThemedText>
        <Pressable
          accessibilityLabel="Next period"
          accessibilityRole="button"
          className="size-9 items-center justify-center rounded-full bg-card"
          disabled={isForwardDisabled}
          hitSlop={6}
          onPress={onNext}
          style={{ opacity: isForwardDisabled ? 0.35 : 1 }}
        >
          <SymbolView name="chevron.right" size={15} tintColor={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}
