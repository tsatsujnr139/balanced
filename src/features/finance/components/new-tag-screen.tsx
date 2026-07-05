import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";

import { api } from "@/convex/_generated/api";
import { useThemeColors } from "@/hooks/use-theme";

import { TagFormRows } from "./tag-form-rows";
import type { TagPickerItem } from "./tag-picker-screen";

interface Props {
  color: string;
  onColorPress: () => void;
  selectedTags: TagPickerItem[];
  toggleTag: (tag: TagPickerItem) => void;
}

export function NewTagScreen({
  color,
  onColorPress,
  selectedTags,
  toggleTag,
}: Props) {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ name?: string }>();
  const [name, setName] = useState(() =>
    Array.isArray(params.name) ? params.name[0] : (params.name ?? "")
  );
  const [isSaving, setIsSaving] = useState(false);
  const createTag = useMutation(api.finance.createTag);
  const trimmedName = name.trim();

  const save = useCallback(async () => {
    if (!trimmedName || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const tag = await createTag({ color, name: trimmedName });
      if (!selectedTags.some((item) => item.id === tag.id)) {
        toggleTag(tag);
      }
      router.back();
    } catch {
      Alert.alert("Could not add tag", "Please try again.");
      setIsSaving(false);
    }
  }, [color, createTag, isSaving, selectedTags, toggleTag, trimmedName]);

  return (
    <>
      <Stack.Screen>
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
            color={color}
            name={name}
            onColorPress={onColorPress}
            onNameChange={setName}
          />
        </View>
      </ScrollView>
    </>
  );
}
