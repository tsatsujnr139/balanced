import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useAddAccountSubmit } from '@/features/finance/add-account-submit-context';
import { ColorPickerGrid } from '@/features/finance/components/color-picker-grid';
import { useThemeColors } from '@/hooks/use-theme';

export default function AddAccountColorScreen() {
  const colors = useThemeColors();
  const { accountColor, setAccountColor } = useAddAccountSubmit();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingBottom: 40,
      }}
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
          selectedColor={accountColor}
          onSelect={(color) => {
            setAccountColor(color);
            router.back();
          }}
        />
      </View>
    </ScrollView>
  );
}
