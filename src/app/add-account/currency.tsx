import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  ACCOUNT_CURRENCIES,
  ACCOUNT_CURRENCY_LABEL,
  type AccountCurrency,
} from '@/features/finance/account-constants';
import { useAddAccountSubmit } from '@/features/finance/add-account-submit-context';
import { getCurrencySymbol } from '@/features/finance/format';
import { useThemeColors } from '@/hooks/use-theme';

export default function AccountCurrencyScreen() {
  const colors = useThemeColors();
  const { currency: draftCurrency, setCurrency } = useAddAccountSubmit();
  const selectedCurrency: AccountCurrency = ACCOUNT_CURRENCIES.includes(draftCurrency as AccountCurrency)
    ? (draftCurrency as AccountCurrency)
    : 'GHS';

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
        {ACCOUNT_CURRENCIES.map((currency, index) => {
          const selected = currency === selectedCurrency;
          const symbol = getCurrencySymbol(currency);

          return (
            <Pressable
              accessibilityRole="button"
              key={currency}
              onPress={() => {
                setCurrency(currency);
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
                <View
                  style={{
                    width: 34,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: symbol.length > 2 ? 12 : 20,
                      fontWeight: '600',
                    }}>
                    {symbol}
                  </Text>
                </View>
                <View
                  style={{
                    minHeight: 62,
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomColor: colors.border,
                    borderBottomWidth: index === ACCOUNT_CURRENCIES.length - 1 ? 0 : 1,
                    paddingRight: 20,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 17 }}>
                      {ACCOUNT_CURRENCY_LABEL[currency]}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      {currency === 'GHS' ? symbol : currency}
                    </Text>
                  </View>
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
