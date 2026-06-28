import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useAddTransaction } from '@/features/finance/add-transaction-context';
import { ColorPickerGrid } from '@/features/finance/components/color-picker-grid';
import { useThemeColors } from '@/hooks/use-theme';

export default function LabelColorScreen() {
  const colors = useThemeColors();
  const { labelDraft, setLabelDraft } = useAddTransaction();

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
          paddingHorizontal: 12,
          paddingVertical: 18,
        }}>
        <ColorPickerGrid
          selectedColor={labelDraft.color}
          onSelect={(color) => {
            setLabelDraft((current) => ({ ...current, color }));
            router.back();
          }}
        />
      </View>
    </ScrollView>
  );
}
