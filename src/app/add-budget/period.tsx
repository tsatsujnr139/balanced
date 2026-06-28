import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAddBudget } from '@/features/finance/add-budget-context';
import { BUDGET_PERIODS, BUDGET_PERIOD_LABEL } from '@/features/finance/budget-constants';
import { useThemeColors } from '@/hooks/use-theme';

export default function BudgetPeriodScreen() {
  const colors = useThemeColors();
  const { period, setPeriod } = useAddBudget();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 24,
          borderCurve: 'continuous',
          overflow: 'hidden',
          paddingLeft: 16,
        }}>
        {BUDGET_PERIODS.map((item, index) => (
          <Pressable
            accessibilityRole="button"
            key={item}
            onPress={() => {
              setPeriod(item);
              router.back();
            }}>
            <View
              style={{
                minHeight: 56,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomColor: colors.border,
                borderBottomWidth: index === BUDGET_PERIODS.length - 1 ? 0 : 1,
                paddingRight: 16,
              }}>
              <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>
                {BUDGET_PERIOD_LABEL[item]}
              </Text>
              {item === period ? (
                <SymbolView name="checkmark" size={18} tintColor={colors.primary} />
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
