import { router } from "expo-router";
import { ScrollView, View } from "react-native";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { ColorPickerGrid } from "@/features/finance/components/color-picker-grid";
import { useThemeColors } from "@/hooks/use-theme";

export default function LabelColorScreen() {
  const colors = useThemeColors();
  const { labelDraft, setLabelDraft } = useAddTransaction();

  return (
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
      <View
        style={{
          backgroundColor: colors.card,
          borderCurve: "continuous",
          borderRadius: 24,
          paddingHorizontal: 12,
          paddingVertical: 18,
        }}
      >
        <ColorPickerGrid
          selectedColor={labelDraft.color}
          onSelect={(color) => {
            setLabelDraft((current) => ({ ...current, color }));
            router.back();
          }}
        />
      </View>
    </ScrollView>
  );
}
