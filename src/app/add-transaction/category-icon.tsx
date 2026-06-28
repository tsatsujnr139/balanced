import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, View } from "react-native";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { CUSTOM_CATEGORY_SYMBOLS } from "@/features/finance/transaction-categories";
import { useThemeColors } from "@/hooks/use-theme";

export default function CategoryIconScreen() {
  const colors = useThemeColors();
  const { labelDraft, setLabelDraft } = useAddTransaction();
  const selectedColor = labelDraft.color;
  const selectedSymbol = labelDraft.symbol;

  return (
    <ScrollView
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
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 14,
          paddingHorizontal: 12,
          paddingVertical: 18,
        }}
      >
        {CUSTOM_CATEGORY_SYMBOLS.map((symbol) => {
          const selected = symbol === selectedSymbol;

          return (
            <View key={symbol} style={{ alignItems: "center", width: "18%" }}>
              <Pressable
                accessibilityLabel={`Select ${symbol}`}
                accessibilityRole="button"
                onPress={() => {
                  setLabelDraft((current) => ({ ...current, symbol }));
                  router.back();
                }}
                style={{
                  alignItems: "center",
                  backgroundColor: selectedColor,
                  borderColor: selected ? colors.foreground : "transparent",
                  borderRadius: 14,
                  borderWidth: selected ? 2 : 0,
                  height: 52,
                  justifyContent: "center",
                  width: 52,
                }}
              >
                <SymbolView name={symbol as never} size={22} tintColor="#fff" />
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
