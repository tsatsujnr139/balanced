import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { CUSTOM_CATEGORY_SYMBOLS } from "@/features/finance/transaction-categories";
import { useThemeColors } from "@/hooks/use-theme";

const COLUMNS = 5;

interface Props {
  color: string;
  onSelect: (symbol: (typeof CUSTOM_CATEGORY_SYMBOLS)[number]) => void;
  selectedSymbol: string;
}

export function CategoryIconPickerGrid({
  color,
  onSelect,
  selectedSymbol,
}: Props) {
  const colors = useThemeColors();
  const rows: (typeof CUSTOM_CATEGORY_SYMBOLS)[number][][] = [];

  for (let i = 0; i < CUSTOM_CATEGORY_SYMBOLS.length; i += COLUMNS) {
    rows.push(CUSTOM_CATEGORY_SYMBOLS.slice(i, i + COLUMNS));
  }

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderCurve: "continuous",
        borderRadius: 24,
        gap: 14,
        paddingHorizontal: 12,
        paddingVertical: 18,
      }}
    >
      {rows.map((row) => (
        <View
          key={row.join("-")}
          style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}
        >
          {row.map((symbol) => {
            const selected = symbol === selectedSymbol;

            return (
              <Pressable
                key={symbol}
                accessibilityLabel={`Select ${symbol}`}
                accessibilityRole="button"
                onPress={() => {
                  onSelect(symbol);
                }}
                style={{
                  alignItems: "center",
                  aspectRatio: 1,
                  backgroundColor: color,
                  borderColor: selected ? colors.foreground : "transparent",
                  borderRadius: 14,
                  borderWidth: selected ? 2 : 0,
                  flex: 1,
                  justifyContent: "center",
                  maxWidth: 56,
                }}
              >
                <SymbolView name={symbol as never} size={22} tintColor="#fff" />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
