import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { ACCOUNT_COLOR_GROUPS } from '@/features/finance/account-constants';
import { useThemeColors } from '@/hooks/use-theme';

type Props = {
  onSelect: (color: string) => void;
  selectedColor: string;
};

function isLightSwatch(color: string): boolean {
  const hex = color.replace('#', '');
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.72;
}

export function ColorPickerGrid({ onSelect, selectedColor }: Props) {
  const colors = useThemeColors();

  return (
    <View style={{ gap: 14 }}>
      {ACCOUNT_COLOR_GROUPS.map((group) => (
        <View key={group.id} style={{ flexDirection: 'row', gap: 10 }}>
          {group.colors.map((color) => {
            const selected = color === selectedColor;
            const checkmarkColor = isLightSwatch(color) ? colors.foreground : '#fff';

            return (
              <View key={color} style={{ flex: 1, alignItems: 'center' }}>
                <Pressable
                  accessibilityLabel={`Select ${color}`}
                  accessibilityRole="button"
                  onPress={() => {
                    onSelect(color);
                  }}
                  style={{
                    width: '100%',
                    maxWidth: 56,
                    aspectRatio: 1,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: color,
                    borderColor: selected ? colors.foreground : 'transparent',
                    borderWidth: selected ? 2 : 0,
                  }}>
                  {selected ? (
                    <SymbolView name="checkmark" size={22} tintColor={checkmarkColor} />
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
