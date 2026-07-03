import { router } from "expo-router";
import { ScrollView } from "react-native";

import { useAddCategory } from "@/features/finance/add-category-context";
import { CategoryIconPickerGrid } from "@/features/finance/components/category-icon-picker-grid";
import { useThemeColors } from "@/hooks/use-theme";

export default function AddCategoryIconScreen() {
  const colors = useThemeColors();
  const { draft, setDraft } = useAddCategory();

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
      <CategoryIconPickerGrid
        color={draft.color}
        selectedSymbol={draft.symbol}
        onSelect={(symbol) => {
          setDraft((current) => ({ ...current, symbol }));
          router.back();
        }}
      />
    </ScrollView>
  );
}
