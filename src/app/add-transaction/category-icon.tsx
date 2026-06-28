import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, View } from 'react-native';

import { useAddTransaction } from '@/features/finance/add-transaction-context';
import { CUSTOM_CATEGORY_SYMBOLS } from '@/features/finance/transaction-categories';
import { useThemeColors } from '@/hooks/use-theme';

export default function CategoryIconScreen() {
  const colors = useThemeColors();
  const { labelDraft, setLabelDraft } = useAddTransaction();
  const selectedColor = labelDraft.color;
  const selectedSymbol = labelDraft.symbol;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingBottom: 40 }}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 24,
          borderCurve: 'continuous',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 14,
          paddingHorizontal: 12,
          paddingVertical: 18,
        }}>
        {CUSTOM_CATEGORY_SYMBOLS.map((symbol) => {
          const selected = symbol === selectedSymbol;

          return (
            <View key={symbol} style={{ width: '18%', alignItems: 'center' }}>
              <Pressable
                accessibilityLabel={`Select ${symbol}`}
                accessibilityRole="button"
                onPress={() => {
                  setLabelDraft((current) => ({ ...current, symbol }));
                  router.back();
                }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selectedColor,
                  borderColor: selected ? colors.foreground : 'transparent',
                  borderWidth: selected ? 2 : 0,
                }}>
                <SymbolView name={symbol as never} size={22} tintColor="#fff" />
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
