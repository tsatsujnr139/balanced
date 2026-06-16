import { SymbolView } from 'expo-symbols';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme';

type RowProps = {
  icon: string;
  iconColor: string;
  label: string;
  value?: string;
  required?: boolean;
  last?: boolean;
};

function FieldRow({ icon, iconColor, label, value, required = false, last = false }: RowProps) {
  const colors = useThemeColors();

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
        <Text selectable style={{ flex: 1, color: colors.foreground, fontSize: 17, fontWeight: '600' }}>
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
    </View>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 24,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}>
      {children}
    </View>
  );
}

export default function AddTransactionScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 22,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 18,
      }}
      keyboardDismissMode="interactive"
      style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ gap: 18 }}>
        <Text selectable style={{ color: colors.foreground, fontSize: 38, fontWeight: '800' }}>
          New Transaction
        </Text>
        <FieldGroup>
          <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={{
                color: colors.foreground,
                fontSize: 52,
                fontWeight: '700',
                minHeight: 74,
              }}
            />
          </View>
          <View style={{ borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: 18 }}>
            <TextInput
              placeholder="Notes"
              placeholderTextColor={colors.muted}
              multiline
              style={{
                color: colors.foreground,
                fontSize: 18,
                minHeight: 96,
                paddingTop: 18,
                textAlignVertical: 'top',
              }}
            />
          </View>
        </FieldGroup>
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          borderCurve: 'continuous',
          flexDirection: 'row',
          padding: 4,
        }}>
        {['Expense', 'Income', 'Transfer'].map((type, index) => (
          <View
            key={type}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 42,
              borderRadius: 14,
              backgroundColor: index === 0 ? colors.selected : 'transparent',
            }}>
            <Text
              selectable
              style={{ color: colors.foreground, fontSize: 16, fontWeight: index === 0 ? '700' : '600' }}>
              {type}
            </Text>
          </View>
        ))}
      </View>

      <FieldGroup>
        <FieldRow icon="calendar" iconColor="#0A84FF" label="Date and time" value="Today, 21:52" />
        <FieldRow icon="building.columns.fill" iconColor="#34A853" label="Account" value="Everyday" />
        <FieldRow icon="tag.fill" iconColor="#FF9F0A" label="Category" required />
        <FieldRow icon="number" iconColor="#5856D6" label="Tags / labels" value="None" />
        <FieldRow
          icon="paperclip"
          iconColor="#8E8E93"
          label="Attachments"
          last
          value="Add"
        />
      </FieldGroup>
    </ScrollView>
  );
}
