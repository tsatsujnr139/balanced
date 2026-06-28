import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { FieldGroup } from "@/features/finance/components/form-fields";
import { useThemeColors } from "@/hooks/use-theme";

export default function LabelNameScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    color?: string;
    name?: string;
    returnPath?: string;
  }>();
  const { labelDraft, setLabelDraft } = useAddTransaction();
  const initialName = Array.isArray(params.name)
    ? params.name[0]
    : (params.name ?? labelDraft.name);
  const [name, setName] = useState(initialName);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        paddingBottom: 40,
        paddingHorizontal: 20,
      }}
      keyboardDismissMode="interactive"
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <Stack.Screen>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Done"
            icon="checkmark"
            onPress={() => {
              setLabelDraft((current) => ({ ...current, name: name.trim() }));
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
            maxLength={80}
            onChangeText={setName}
            placeholder="Name"
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
