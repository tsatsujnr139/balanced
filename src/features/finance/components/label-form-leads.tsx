import { SymbolView } from 'expo-symbols';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme';

export function NameLeading({ name }: { name: string }) {
  const colors = useThemeColors();
  const letter = name.trim().charAt(0).toUpperCase() || 'T';

  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.border,
      }}>
      <Text style={{ color: colors.muted, fontSize: 17, fontWeight: '700' }}>{letter}</Text>
    </View>
  );
}

export function ColorLeading({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: color,
      }}
    />
  );
}

export function CategoryLeading({ color, symbol }: { color: string; symbol: string }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
      }}>
      <SymbolView name={symbol as never} size={17} tintColor="#fff" />
    </View>
  );
}
