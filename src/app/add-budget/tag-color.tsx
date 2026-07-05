import { router } from "expo-router";
import { ScrollView, View } from "react-native";

import { useAddBudget } from "@/features/finance/add-budget-context";
import { ColorPickerGrid } from "@/features/finance/components/color-picker-grid";
import { useThemeColors } from "@/hooks/use-theme";

export default function TagColorScreen() {
  const colors = useThemeColors();
  const { setTagColorDraft, tagColorDraft } = useAddBudget();

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
          selectedColor={tagColorDraft}
          onSelect={(color) => {
            setTagColorDraft(color);
            router.back();
          }}
        />
      </View>
    </ScrollView>
  );
}
