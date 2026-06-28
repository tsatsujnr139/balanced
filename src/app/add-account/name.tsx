import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { useAddAccountSubmit } from '@/features/finance/add-account-submit-context';
import { FieldGroup } from '@/features/finance/components/form-fields';
import { useThemeColors } from '@/hooks/use-theme';

export default function AccountNameScreen() {
  const colors = useThemeColors();
  const { name: currentName, setName: setDraftName } = useAddAccountSubmit();
  const [name, setName] = useState(currentName);

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
              setDraftName(name.trim() || currentName || 'My Account');
              router.back();
            }}
            tintColor={colors.primary}
            variant="prominent"
          />
        </Stack.Toolbar>
      </Stack.Screen>
      <View>
        <FieldGroup>
          <TextInput
            autoFocus
            onChangeText={setName}
            placeholder="My Account"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={{
              color: colors.foreground,
              fontSize: 20,
              minHeight: 64,
              paddingHorizontal: 18,
            }}
            value={name}
          />
        </FieldGroup>
      </View>
    </ScrollView>
  );
}
