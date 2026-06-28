import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, Text, View } from 'react-native';

import { useAddTransaction } from '@/features/finance/add-transaction-context';
import { useFinance } from '@/features/finance/use-finance';
import { useThemeColors } from '@/hooks/use-theme';

export default function TransactionAccountScreen() {
  const colors = useThemeColors();
  const { field } = useLocalSearchParams<{ field?: 'from' | 'to' | string | string[] }>();
  const accountField = Array.isArray(field) ? field[0] : field;
  const { accounts } = useFinance();
  const { accountId, setAccountId, setToAccountId, toAccountId } = useAddTransaction();
  const selectedAccountId = accountField === 'to' ? toAccountId : accountId;
  const accountOptions =
    accountField === 'to' ? accounts.filter((account) => account.id !== accountId) : accounts;
  const title =
    accountField === 'to' ? 'To Account' : accountField === 'from' ? 'From Account' : 'Account';

  return (
    <>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        data={accountOptions}
        keyExtractor={(account) => account.id}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (accountField === 'to') {
                setToAccountId(item.id);
              } else {
                setAccountId(item.id);
              }
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
                  borderBottomWidth: index === accountOptions.length - 1 ? 0 : 1,
                }}>
                <Text style={{ flex: 1, color: colors.foreground, fontSize: 17 }}>{item.name}</Text>
                {item.id === selectedAccountId ? (
                  <SymbolView name="checkmark" size={18} tintColor={colors.primary} />
                ) : null}
              </View>
            </View>
          </Pressable>
        )}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
      <Stack.Screen.Title>{title}</Stack.Screen.Title>
    </>
  );
}
