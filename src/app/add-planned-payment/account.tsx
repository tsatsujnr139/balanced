import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, Text, View } from 'react-native';

import { useAddPlannedPayment } from '@/features/finance/add-planned-payment-context';
import { useFinance } from '@/features/finance/use-finance';
import { useThemeColors } from '@/hooks/use-theme';

export default function PlannedPaymentAccountScreen() {
  const colors = useThemeColors();
  const { accounts } = useFinance();
  const { accountId, setAccountId } = useAddPlannedPayment();

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      data={accounts}
      keyExtractor={(account) => account.id}
      renderItem={({ item, index }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setAccountId(item.id);
            router.back();
          }}>
          <View style={{ minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 34,
                height: 34,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                backgroundColor: item.color,
              }}>
              <SymbolView name={item.symbol as never} size={17} tintColor="#fff" />
            </View>
            <View
              style={{
                minHeight: 62,
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomColor: colors.border,
                borderBottomWidth: index === accounts.length - 1 ? 0 : 1,
              }}>
              <Text style={{ flex: 1, color: colors.foreground, fontSize: 17 }}>{item.name}</Text>
              {item.id === accountId ? (
                <SymbolView name="checkmark" size={18} tintColor={colors.primary} />
              ) : null}
            </View>
          </View>
        </Pressable>
      )}
      style={{ flex: 1, backgroundColor: colors.background }}
    />
  );
}
