import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPE_SYMBOL,
} from '@/features/finance/account-constants';
import { useAddAccountSubmit } from '@/features/finance/add-account-submit-context';
import { useThemeColors } from '@/hooks/use-theme';

export default function AccountTypeScreen() {
  const colors = useThemeColors();
  const { setType, type: selectedType } = useAddAccountSubmit();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 24,
          borderCurve: 'continuous',
          overflow: 'hidden',
        }}>
        {ACCOUNT_TYPES.map((type, index) => {
          const selected = type === selectedType;

          return (
            <Pressable
              accessibilityRole="button"
              key={type}
              onPress={() => {
                setType(type);
                router.back();
              }}>
              <View
                style={{
                  minHeight: 62,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 18,
                  paddingLeft: 20,
                }}>
                <SymbolView
                  name={ACCOUNT_TYPE_SYMBOL[type] as never}
                  size={24}
                  tintColor={colors.muted}
                />
                <View
                  style={{
                    minHeight: 62,
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomColor: colors.border,
                    borderBottomWidth: index === ACCOUNT_TYPES.length - 1 ? 0 : 1,
                    paddingRight: 20,
                  }}>
                  <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>
                    {ACCOUNT_TYPE_LABEL[type]}
                  </Text>
                  {selected ? (
                    <SymbolView name="checkmark" size={18} tintColor={colors.primary} />
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
