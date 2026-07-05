import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useState } from "react";
import { Platform, ScrollView, TextInput, View } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { MaterialIcons } from "@/constants/material-icons";
import { useAddCategory } from "@/features/finance/add-category-context";
import { FieldGroup } from "@/features/finance/components/form-fields";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

export default function AddCategoryNameScreen() {
  const colors = useThemeColors();
  const { draft, setDraft } = useAddCategory();
  const [name, setName] = useState(draft.name);

  const confirmName = useCallback(() => {
    setDraft((current) => ({ ...current, name: name.trim() }));
    router.back();
  }, [name, setDraft]);

  const renderDoneButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Done"
        icon={MaterialIcons.check}
        onPress={confirmName}
        tintColor={colors.primary}
      />
    ),
    [confirmName, colors.primary]
  );

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
      <Stack.Screen
        options={{
          ...androidHeaderOptions({ headerRight: renderDoneButton }),
        }}
      >
        {Platform.OS === "ios" ? (
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              accessibilityLabel="Done"
              icon="checkmark"
              onPress={confirmName}
              tintColor={colors.primary}
              variant="prominent"
            />
          </Stack.Toolbar>
        ) : null}
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
