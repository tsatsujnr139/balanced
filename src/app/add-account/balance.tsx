import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  type AccountBalanceUpdateMode,
  useAddAccountSubmit,
} from '@/features/finance/add-account-submit-context';
import { FieldGroup } from '@/features/finance/components/form-fields';
import { getCurrencySymbol } from '@/features/finance/format';
import { useThemeColors } from '@/hooks/use-theme';

const BALANCE_UPDATE_OPTIONS: {
  description: string;
  label: string;
  mode: AccountBalanceUpdateMode;
}[] = [
  {
    description: 'Creates an income or expense transaction for the difference.',
    label: 'Adjust by record',
    mode: 'record',
  },
  {
    description: 'Changes the stored balance without adding a transaction.',
    label: 'Edit initial balance',
    mode: 'initial',
  },
];

export default function AccountBalanceScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const isEditing = Boolean(Array.isArray(params.id) ? params.id[0] : params.id);
  const {
    balanceInput,
    balanceUpdateMode,
    currency,
    setBalanceInput,
    setBalanceUpdateMode,
  } = useAddAccountSubmit();
  const currencySymbol = getCurrencySymbol(currency);
  const [balance, setBalance] = useState(balanceInput === '0.00' ? '' : balanceInput);
  const [mode, setMode] = useState<AccountBalanceUpdateMode>(balanceUpdateMode);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingBottom: 40 }}
      keyboardDismissMode="interactive"
      style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Done"
            icon="checkmark"
            onPress={() => {
              setBalanceInput(balance.trim() || '0.00');
              setBalanceUpdateMode(mode);
              router.back();
            }}
            tintColor={colors.primary}
            variant="prominent"
          />
        </Stack.Toolbar>
      </Stack.Screen>
      <View>
        <FieldGroup>
          <View
            style={{
              minHeight: 72,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 18,
            }}>
            <Text style={{ color: colors.muted, fontSize: currencySymbol.length > 2 ? 22 : 28, fontWeight: '600' }}>
              {currencySymbol}
            </Text>
            <TextInput
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={setBalance}
              placeholder=""
              placeholderTextColor={colors.muted}
              style={{
                color: colors.foreground,
                flex: 1,
                fontSize: 34,
                fontWeight: '700',
              }}
              value={balance}
            />
          </View>
        </FieldGroup>
      </View>
      {isEditing ? (
        <View>
          <FieldGroup>
            {BALANCE_UPDATE_OPTIONS.map((option, index) => {
              const selected = option.mode === mode;

              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option.mode}
                  onPress={() => setMode(option.mode)}>
                  <View
                    style={{
                      minHeight: 72,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingLeft: 18,
                    }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 11,
                        borderColor: selected ? colors.primary : colors.border,
                        borderWidth: 2,
                      }}>
                      {selected ? (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: colors.primary,
                          }}
                        />
                      ) : null}
                    </View>
                    <View
                      style={{
                        minHeight: 72,
                        flex: 1,
                        justifyContent: 'center',
                        borderBottomColor: colors.border,
                        borderBottomWidth:
                          index === BALANCE_UPDATE_OPTIONS.length - 1 ? 0 : 1,
                        paddingRight: 18,
                      }}>
                      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '500' }}>
                        {option.label}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </FieldGroup>
        </View>
      ) : null}
    </ScrollView>
  );
}
