import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";

import { useAddCategory } from "@/features/finance/add-category-context";
import { FieldGroup } from "@/features/finance/components/form-fields";
import { useThemeColors } from "@/hooks/use-theme";

export default function AddCategoryNameScreen() {
  const colors = useThemeColors();
  const { draft, setDraft } = useAddCategory();
  const [name, setName] = useState(draft.name);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
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
              setDraft((current) => ({ ...current, name: name.trim() }));
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
