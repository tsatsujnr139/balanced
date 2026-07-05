import { useMutation } from "convex/react";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  View,
} from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { MaterialIcons } from "@/constants/material-icons";
import { api } from "@/convex/_generated/api";
import { useAddTag } from "@/features/finance/add-tag-context";
import { TagFormRows } from "@/features/finance/components/tag-form-rows";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

export default function AddTagScreen() {
  const colors = useThemeColors();
  const createTag = useMutation(api.finance.createTag);
  const { draft, setDraft } = useAddTag();
  const [isSaving, setIsSaving] = useState(false);
  const trimmedName = draft.name.trim();

  const save = useCallback(async () => {
    if (!trimmedName || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await createTag({ color: draft.color, name: trimmedName });
      router.back();
    } catch (error) {
      Alert.alert(
        "Could not add tag",
        error instanceof Error ? error.message : "Please try again."
      );
      setIsSaving(false);
    }
  }, [createTag, draft.color, isSaving, trimmedName]);

  const renderSaveButton = useCallback(
    () =>
      isSaving ? (
        <ActivityIndicator />
      ) : (
        <HeaderIconButton
          accessibilityLabel="Save tag"
          icon={MaterialIcons.check}
          onPress={() => {
            void save();
          }}
          tintColor={colors.primary}
        />
      ),
    [isSaving, save, colors.primary]
  );

  return (
    <>
      <Stack.Screen
        options={{
          ...androidHeaderOptions({ headerRight: renderSaveButton }),
        }}
      >
        {Platform.OS === "ios" ? (
          <Stack.Toolbar placement="right">
            {isSaving ? (
              <Stack.Toolbar.View>
                <ActivityIndicator />
              </Stack.Toolbar.View>
            ) : (
              <Stack.Toolbar.Button
                accessibilityLabel="Save tag"
                icon="checkmark"
                onPress={() => {
                  void save();
                }}
                tintColor={colors.primary}
                variant="prominent"
              />
            )}
          </Stack.Toolbar>
        ) : null}
      </Stack.Screen>
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
        <View>
          <TagFormRows
            color={draft.color}
            name={draft.name}
            onColorPress={() => router.push("/add-tag/color" as never)}
            onNameChange={(name) =>
              setDraft((current) => ({ ...current, name }))
            }
          />
        </View>
      </ScrollView>
    </>
  );
}
