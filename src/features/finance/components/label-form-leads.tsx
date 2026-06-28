import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme";

export function NameLeading({ name }: { name: string }) {
  const colors = useThemeColors();
  const letter = name.trim().charAt(0).toUpperCase() || "T";

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.border,
        borderRadius: 17,
        height: 34,
        justifyContent: "center",
        width: 34,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 17, fontWeight: "700" }}>
        {letter}
      </Text>
    </View>
  );
}

export function ColorLeading({ color }: { color: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        borderRadius: 10,
        height: 34,
        width: 34,
      }}
    />
  );
}

export function CategoryLeading({
  color,
  symbol,
}: {
  color: string;
  symbol: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: color,
        borderRadius: 10,
        height: 34,
        justifyContent: "center",
        width: 34,
      }}
    >
      <SymbolView name={symbol as never} size={17} tintColor="#fff" />
    </View>
  );
}
