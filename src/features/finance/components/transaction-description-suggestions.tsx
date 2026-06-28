import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme';

type Props = {
  onSelect: (description: string) => void;
  suggestions: string[];
};

export function TransactionDescriptionSuggestions({ onSelect, suggestions }: Props) {
  const colors = useThemeColors();

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={{ borderTopColor: colors.border, borderTopWidth: 1 }}>
      {suggestions.map((suggestion, index) => (
        <Pressable
          accessibilityLabel={`Use ${suggestion} as description`}
          accessibilityRole="button"
          key={suggestion}
          onPressIn={() => {
            onSelect(suggestion);
          }}
          onPress={() => {
            onSelect(suggestion);
          }}
          style={({ pressed }) => ({
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            borderTopColor: colors.border,
            borderTopWidth: index === 0 ? 0 : 1,
            opacity: pressed ? 0.6 : 1,
            paddingHorizontal: 18,
          })}>
          <SymbolView name="clock.arrow.circlepath" size={15} tintColor={colors.muted} />
          <Text
            numberOfLines={1}
            style={{
              color: colors.foreground,
              flex: 1,
              fontSize: 16,
            }}>
            {suggestion}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
