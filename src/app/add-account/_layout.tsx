import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';

import { shouldDisableHeaderBlur } from '@/components/tab-stack-layout';
import { AddAccountSubmitContext } from '@/features/finance/add-account-submit-context';
import {
  DEFAULT_ACCOUNT_COLOR,
} from '@/features/finance/account-constants';
import { DEFAULT_CURRENCY } from '@/features/finance/format';
import type { AccountType } from '@/features/finance/types';
import { useFinance } from '@/features/finance/use-finance';
import { useThemeColors } from '@/hooks/use-theme';

const DEFAULT_ACCOUNT_NAME = 'My Account';
const DEFAULT_BALANCE_INPUT = '0.00';
const DEFAULT_ACCOUNT_TYPE: AccountType = 'cash';

function closeAddAccount() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.replace('/dashboard');
}

export default function AddAccountLayout() {
  const colors = useThemeColors();
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const submitRef = useRef<(() => Promise<void>) | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { accounts } = useFinance();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    balance?: string;
    currency?: string;
    type?: AccountType;
    color?: string;
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const existingAccount = useMemo(
    () => (id ? accounts.find((account) => account.id === id) : undefined),
    [accounts, id]
  );
  const isEditing = Boolean(id);
  const title = isEditing ? 'Edit account' : 'Add account';
  const [name, setName] = useState(
    (Array.isArray(params.name) ? params.name[0] : params.name) ?? DEFAULT_ACCOUNT_NAME
  );
  const [balanceInput, setBalanceInput] = useState(
    (Array.isArray(params.balance) ? params.balance[0] : params.balance) ?? DEFAULT_BALANCE_INPUT
  );
  const [currency, setCurrency] = useState(
    (Array.isArray(params.currency) ? params.currency[0] : params.currency) ?? DEFAULT_CURRENCY
  );
  const [type, setType] = useState<AccountType>(
    ((Array.isArray(params.type) ? params.type[0] : params.type) as AccountType | undefined) ??
      DEFAULT_ACCOUNT_TYPE
  );
  const [accountColor, setAccountColor] = useState(
    (Array.isArray(params.color) ? params.color[0] : params.color) ?? DEFAULT_ACCOUNT_COLOR
  );
  const [balanceUpdateMode, setBalanceUpdateMode] = useState<'record' | 'initial'>('record');
  const hasHydratedExistingRef = useRef(false);

  useEffect(() => {
    if (!existingAccount || hasHydratedExistingRef.current) {
      return;
    }

    hasHydratedExistingRef.current = true;
    setName(existingAccount.name);
    setBalanceInput((existingAccount.balance / 100).toFixed(2));
    setCurrency(existingAccount.currency);
    setType(existingAccount.type);
    setAccountColor(existingAccount.color);
  }, [existingAccount]);

  const registerSubmit = useCallback((submit: (() => Promise<void>) | null) => {
    submitRef.current = submit;
  }, []);
  const submit = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    const currentSubmit = submitRef.current;
    if (!currentSubmit) {
      return;
    }

    setIsSubmitting(true);
    currentSubmit().finally(() => {
      setIsSubmitting(false);
    });
  }, [isSubmitting]);
  const submitContext = useMemo(
    () => ({
      accountColor,
      balanceInput,
      balanceUpdateMode,
      currency,
      isSubmitting,
      name,
      registerSubmit,
      setAccountColor,
      setBalanceInput,
      setBalanceUpdateMode,
      setCurrency,
      setName,
      setType,
      submit,
      type,
    }),
    [
      accountColor,
      balanceInput,
      balanceUpdateMode,
      currency,
      isSubmitting,
      name,
      registerSubmit,
      submit,
      type,
    ]
  );

  return (
    <AddAccountSubmitContext.Provider value={submitContext}>
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerBlurEffect:
            Platform.OS === 'ios' ? (disableHeaderBlur ? 'none' : 'systemMaterial') : undefined,
          headerShadowVisible: false,
        }}>
        <Stack.Screen
          name="index"
          options={{
            headerLargeTitle: false,
            title,
          }}>
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Close"
              icon="xmark"
              onPress={closeAddAccount}
              separateBackground
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            {isSubmitting ? (
              <Stack.Toolbar.View>
                <ActivityIndicator />
              </Stack.Toolbar.View>
            ) : (
              <Stack.Toolbar.Button
                accessibilityLabel={isEditing ? 'Save account' : 'Add account'}
                icon="checkmark"
                onPress={submit}
                tintColor={colors.primary}
                variant="prominent"
              />
            )}
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="name"
          options={{
            headerBackVisible: false,
            headerLargeTitle: false,
            title: 'Account name',
          }}>
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => {
                router.back();
              }}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="balance"
          options={{
            headerBackVisible: false,
            headerLargeTitle: false,
            title: isEditing ? 'Current balance' : 'Amount',
          }}>
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => {
                router.back();
              }}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="currency"
          options={{
            headerBackVisible: false,
            headerLargeTitle: false,
            title: 'Currency',
          }}>
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => {
                router.back();
              }}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="type"
          options={{
            headerBackVisible: false,
            headerLargeTitle: false,
            title: 'Type',
          }}>
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => {
                router.back();
              }}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="color"
          options={{
            headerBackVisible: false,
            headerLargeTitle: false,
            title: 'Color',
          }}>
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => {
                router.back();
              }}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
      </Stack>
    </AddAccountSubmitContext.Provider>
  );
}
