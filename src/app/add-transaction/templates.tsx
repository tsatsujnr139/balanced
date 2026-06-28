import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import { useAddTransaction } from '@/features/finance/add-transaction-context';
import { TransactionTemplateList } from '@/features/finance/components/transaction-template-list';
import { useThemeColors } from '@/hooks/use-theme';

export default function AddTransactionTemplatesScreen() {
  const colors = useThemeColors();
  const templates = useQuery(api.finance.listTransactionTemplates);
  const { applyTemplate } = useAddTransaction();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingBottom: 40 }}
      style={{ flex: 1, backgroundColor: colors.background }}>
      {templates === undefined ? (
        <View style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <TransactionTemplateList
          emptyText="No templates yet"
          templates={templates}
          onPressTemplate={(template) => {
            applyTemplate(template);
            router.back();
          }}
        />
      )}
    </ScrollView>
  );
}
