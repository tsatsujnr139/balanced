import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { cn } from "@/lib/cn";

interface Props {
  currencies: string[];
  selected: string;
  onSelect: (currency: string) => void;
}

export function CurrencyPicker({ currencies, selected, onSelect }: Props) {
  if (currencies.length <= 1) {
    return null;
  }

  return (
    <View className="flex-row gap-2">
      {currencies.map((currency) => {
        const active = currency === selected;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={cn(
              "rounded-full px-3.5 py-1.5",
              active ? "bg-selected" : "bg-card"
            )}
            key={currency}
            onPress={() => onSelect(currency)}
          >
            <ThemedText
              type="smallBold"
              color={active ? "foreground" : "muted"}
            >
              {currency}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
