import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, environment, tint } from '@expo/ui/swift-ui/modifiers';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Pressable,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { useMutation } from 'convex/react';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAddTransaction } from '@/features/finance/add-transaction-context';
import { clearTransactionEditPrefill } from '@/features/finance/edit-transaction-prefill';
import { DEFAULT_CURRENCY, getCurrencySymbol } from '@/features/finance/format';
import { TRANSACTION_CATEGORIES, TRANSFER_CATEGORY } from '@/features/finance/transaction-categories';
import { useFinance } from '@/features/finance/use-finance';
import { useThemeColors } from '@/hooks/use-theme';

const TRANSACTION_TYPES = ['Expense', 'Income', 'Transfer'];
const TRANSACTION_CHARGE_CATEGORY = TRANSACTION_CATEGORIES.find(
  (item) => item.name === 'Transaction charges'
);

function closeAddTransaction() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.replace('/dashboard');
}

function formatDateOnly(date: number): string {
  return new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium' }).format(new Date(date));
}

function formatTimeOnly(date: number): string {
  return new Intl.DateTimeFormat('en-GH', { timeStyle: 'short' }).format(new Date(date));
}

function mergeDatePart(current: number, selectedDate: Date): number {
  const next = new Date(current);
  next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  return next.getTime();
}

function mergeTimePart(current: number, selectedDate: Date): number {
  const next = new Date(current);
  next.setHours(
    selectedDate.getHours(),
    selectedDate.getMinutes(),
    selectedDate.getSeconds(),
    selectedDate.getMilliseconds()
  );
  return next.getTime();
}

function amountAccentColor(
  transactionTypeIndex: number,
  colors: ReturnType<typeof useThemeColors>
): string {
  if (transactionTypeIndex === 0) return colors.negative;
  if (transactionTypeIndex === 1) return colors.positive;
  return colors.foreground;
}

type RowProps = {
  icon: string;
  iconColor: string;
  label: string;
  value?: string;
  required?: boolean;
  last?: boolean;
  onPress?: () => void;
};

function FieldRow({ icon, iconColor, label, value, required = false, last = false, onPress }: RowProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={{
        minHeight: 62,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingLeft: 16,
      }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: iconColor,
        }}>
        <SymbolView name={icon as never} size={17} tintColor="#fff" />
      </View>
      <View
        style={{
          minHeight: 62,
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomColor: colors.border,
          borderBottomWidth: last ? 0 : 1,
          paddingRight: 16,
        }}>
        <Text selectable style={{ flex: 1, color: colors.foreground, fontSize: 17, fontWeight: '400' }}>
          {label}
        </Text>
        <Text
          selectable
          style={{
            color: required ? colors.negative : colors.muted,
            fontSize: 17,
            maxWidth: '48%',
            textAlign: 'right',
          }}>
          {required ? 'Required' : value}
        </Text>
        <SymbolView name="chevron.right" size={12} tintColor={colors.muted} />
      </View>
    </Pressable>
  );
}

function IOSCompactDatePicker({
  date,
  displayedComponents,
  onDateChange,
}: {
  date: number;
  displayedComponents: ('date' | 'hourAndMinute')[];
  onDateChange: (selectedDate: Date) => void;
}) {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();

  return (
    <Host matchContents ignoreSafeArea="all" style={{ flexShrink: 0 }}>
      <DatePicker
        displayedComponents={displayedComponents}
        modifiers={[
          datePickerStyle('compact'),
          tint(colors.primary),
          environment('colorScheme', colorScheme === 'dark' ? 'dark' : 'light'),
        ]}
        onDateChange={onDateChange}
        selection={new Date(date)}
      />
    </Host>
  );
}

function DateTimeFieldRow({
  date,
  setDate,
}: {
  date: number;
  setDate: (date: number) => void;
}) {
  const colors = useThemeColors();
  const [activePicker, setActivePicker] = useState<'date' | 'time' | null>(null);

  return (
    <View
      style={{
        minHeight: 62,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingLeft: 16,
      }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A84FF',
        }}>
        <SymbolView name="calendar" size={17} tintColor="#fff" />
      </View>
      <View
        style={{
          minHeight: 62,
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          paddingRight: 16,
        }}>
        <Text style={{ flex: 1, color: colors.foreground, fontSize: 17, fontWeight: '400' }}>
          Date
        </Text>
        {Platform.OS === 'ios' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}>
            <IOSCompactDatePicker
              date={date}
              displayedComponents={['date']}
              onDateChange={(selectedDate) => {
                setDate(mergeDatePart(date, selectedDate));
              }}
            />
            <IOSCompactDatePicker
              date={date}
              displayedComponents={['hourAndMinute']}
              onDateChange={(selectedDate) => {
                setDate(mergeTimePart(date, selectedDate));
              }}
            />
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
            }}>
            <Pressable accessibilityRole="button" onPress={() => setActivePicker('date')}>
              <Text style={{ color: colors.primary, fontSize: 17 }}>{formatDateOnly(date)}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setActivePicker('time')}>
              <Text style={{ color: colors.primary, fontSize: 17 }}>{formatTimeOnly(date)}</Text>
            </Pressable>
            {activePicker === 'date' ? (
              <DateTimePicker
                accentColor={colors.primary}
                mode="date"
                onDismiss={() => setActivePicker(null)}
                onValueChange={(_event, selectedDate) => {
                  setDate(mergeDatePart(date, selectedDate));
                  setActivePicker(null);
                }}
                presentation="dialog"
                value={new Date(date)}
              />
            ) : null}
            {activePicker === 'time' ? (
              <DateTimePicker
                accentColor={colors.primary}
                mode="time"
                onDismiss={() => setActivePicker(null)}
                onValueChange={(_event, selectedDate) => {
                  setDate(mergeTimePart(date, selectedDate));
                  setActivePicker(null);
                }}
                presentation="dialog"
                value={new Date(date)}
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

function FieldGroup({
  children,
  clip = true,
}: {
  children: React.ReactNode;
  clip?: boolean;
}) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 24,
        borderCurve: 'continuous',
        overflow: clip ? 'hidden' : 'visible',
      }}>
      {children}
    </View>
  );
}

export default function AddTransactionScreen() {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const { transactionId } = useLocalSearchParams<{ transactionId?: string | string[] }>();
  const editingTransactionId = Array.isArray(transactionId) ? transactionId[0] : transactionId;
  const deleteTransaction = useMutation(api.finance.deleteTransaction);
  const [isDeleting, setIsDeleting] = useState(false);
  const { accounts } = useFinance();
  const {
    accountId,
    amount,
    attachments,
    category,
    customCategories,
    date,
    narration,
    setAmount,
    setDate,
    setNarration,
    setTransactionCharge,
    setTransactionTypeIndex,
    toAccountId,
    transactionCharge,
    transactionTypeIndex,
    tags,
  } = useAddTransaction();
  const isTransfer = transactionTypeIndex === 2;
  const selectedCategory = isTransfer
    ? TRANSFER_CATEGORY
    : [...TRANSACTION_CATEGORIES, ...customCategories].find((item) => item.name === category);
  const fromAccount = accounts.find((account) => account.id === accountId);
  const toAccount = accounts.find((account) => account.id === toAccountId);
  const selectedAccount = isTransfer ? fromAccount : fromAccount;
  const amountColor = amountAccentColor(transactionTypeIndex, colors);
  const currencySymbol = getCurrencySymbol(
    (isTransfer ? fromAccount : selectedAccount)?.currency ?? DEFAULT_CURRENCY
  );
  const deleteLabel =
    narration.trim() ||
    selectedCategory?.name ||
    (isTransfer ? 'Transfer' : 'This transaction');

  const confirmDeleteTransaction = useCallback(() => {
    if (!editingTransactionId || isDeleting) {
      return;
    }

    Alert.alert(
      'Delete transaction?',
      `“${deleteLabel}” will be permanently deleted. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteTransaction({ id: editingTransactionId as Id<'transactions'> });
              clearTransactionEditPrefill(editingTransactionId);
              closeAddTransaction();
            } catch (error) {
              Alert.alert(
                'Could not delete transaction',
                error instanceof Error ? error.message : 'Please try again.'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [deleteLabel, deleteTransaction, editingTransactionId, isDeleting]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingBottom: 40,
      }}
      keyboardDismissMode="interactive"
      style={{ flex: 1, backgroundColor: colors.background }}>
      <SegmentedControl
        appearance={colorScheme === 'dark' ? 'dark' : 'light'}
        onChange={(event) => {
          setTransactionTypeIndex(event.nativeEvent.selectedSegmentIndex);
        }}
        selectedIndex={transactionTypeIndex}
        style={{ width: '100%' }}
        values={TRANSACTION_TYPES}
      />

      <FieldGroup>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 10,
            paddingHorizontal: 18,
            paddingTop: 18,
          }}>
          <Text
            style={{
              color: amountColor,
              fontSize: 34,
              fontWeight: '700',
            }}>
            {currencySymbol}
          </Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            style={{
              color: amountColor,
              flex: 1,
              fontSize: 52,
              fontWeight: '700',
              minHeight: 74,
              textAlign: 'right',
            }}
            value={amount}
          />
        </View>
        {transactionTypeIndex === 0 ? (
          <View
            style={{
              minHeight: 62,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              paddingHorizontal: 18,
            }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: TRANSACTION_CHARGE_CATEGORY?.color ?? '#8E8E93',
              }}>
              <SymbolView
                name={(TRANSACTION_CHARGE_CATEGORY?.symbol ?? 'creditcard.fill') as never}
                size={16}
                tintColor="#fff"
              />
            </View>
            <Text
              selectable
              style={{
                color: colors.foreground,
                fontSize: 14,
                fontStyle: 'italic',
                fontWeight: '500',
              }}>
              Transaction charge
            </Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setTransactionCharge}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={{
                color: colors.foreground,
                flex: 1,
                fontSize: 18,
                fontStyle: 'italic',
                minHeight: 62,
                textAlign: 'right',
              }}
              value={transactionCharge}
            />
          </View>
        ) : null}
        <View style={{ borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: 18 }}>
          <TextInput
            onChangeText={setNarration}
            placeholder="Description (optional)"
            placeholderTextColor={colors.muted}
            multiline
            style={{
              color: colors.foreground,
              fontSize: 18,
              minHeight: 96,
              paddingTop: 18,
              textAlignVertical: 'top',
            }}
            value={narration}
          />
        </View>
      </FieldGroup>

      <FieldGroup clip={false}>
        <DateTimeFieldRow date={date} setDate={setDate} />
        {isTransfer ? (
          <>
            <FieldRow
              icon={fromAccount?.symbol ?? 'building.columns.fill'}
              iconColor={fromAccount?.color ?? '#34A853'}
              label="From Account"
              onPress={() =>
                router.push({ pathname: '/add-transaction/account', params: { field: 'from' } })
              }
              required={!fromAccount}
              value={fromAccount?.name}
            />
            <FieldRow
              icon={toAccount?.symbol ?? 'tray.full.fill'}
              iconColor={toAccount?.color ?? '#5856D6'}
              label="To Account"
              onPress={() =>
                router.push({ pathname: '/add-transaction/account', params: { field: 'to' } })
              }
              required={!toAccount}
              value={toAccount?.name}
            />
          </>
        ) : (
          <FieldRow
            icon={selectedAccount?.symbol ?? 'building.columns.fill'}
            iconColor={selectedAccount?.color ?? '#34A853'}
            label="Account"
            onPress={() => router.push('/add-transaction/account')}
            required={!selectedAccount}
            value={selectedAccount?.name}
          />
        )}
        {!isTransfer ? (
          <FieldRow
            icon={selectedCategory?.symbol ?? 'square.grid.2x2.fill'}
            iconColor={selectedCategory?.color ?? '#FF9F0A'}
            label="Category"
            onPress={() => {
              router.push('/add-transaction/category');
            }}
            required={!category}
            value={category ?? undefined}
          />
        ) : null}
        <FieldRow
          icon="tag"
          iconColor="#5856D6"
          label="Tags"
          onPress={() => router.push('/add-transaction/tags')}
          value={tags.length > 0 ? tags.map((tag) => tag.name).join(', ') : 'None'}
        />
        <FieldRow
          icon="paperclip"
          iconColor="#8E8E93"
          label="Attachments"
          last
          onPress={() => router.push('/add-transaction/attachments')}
          value={attachments.length > 0 ? `${attachments.length} selected` : 'Add'}
        />
      </FieldGroup>

      {editingTransactionId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete transaction"
          disabled={isDeleting}
          onPress={confirmDeleteTransaction}
          style={({ pressed }) => ({
            minHeight: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 18,
            borderCurve: 'continuous',
            backgroundColor: 'transparent',
            opacity: pressed || isDeleting ? 0.6 : 1,
          })}>
          {isDeleting ? (
            <ActivityIndicator color={colors.negative} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SymbolView name="trash" size={18} tintColor={colors.negative} />
              <Text style={{ color: colors.negative, fontSize: 17, fontWeight: '600' }}>
                Delete transaction
              </Text>
            </View>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
