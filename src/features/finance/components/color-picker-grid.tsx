import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { ACCOUNT_COLOR_GROUPS } from "@/features/finance/account-constants";
import { useThemeColors } from "@/hooks/use-theme";

const COLUMNS = 6;

interface Props {
  onSelect: (color: string) => void;
  selectedColor: string;
}

function isLightSwatch(color: string): boolean {
  const hex = color.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.72;
}

export function ColorPickerGrid({ onSelect, selectedColor }: Props) {
  const colors = useThemeColors();

  const allColors = ACCOUNT_COLOR_GROUPS.flatMap((group) => group.colors);
  const rows: string[][] = [];
  for (let i = 0; i < allColors.length; i += COLUMNS) {
    rows.push(allColors.slice(i, i + COLUMNS));
  }

  return (
    <View style={{ gap: 12 }}>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={{ flexDirection: "row", gap: 8 }}
        >
          {row.map((color) => {
            const selected = color === selectedColor;
            const checkmarkColor = isLightSwatch(color)
              ? colors.foreground
              : "#fff";

            return (
              <Pressable
                key={color}
                accessibilityLabel={`Select ${color}`}
                accessibilityRole="button"
                onPress={() => {
                  onSelect(color);
                }}
                style={{
                  alignItems: "center",
                  aspectRatio: 1,
                  backgroundColor: color,
                  borderColor: selected ? colors.foreground : "transparent",
                  borderRadius: 999,
                  borderWidth: selected ? 2 : 0,
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                {selected ? (
                  <SymbolView
                    name="checkmark"
                    size={18}
                    tintColor={checkmarkColor}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
