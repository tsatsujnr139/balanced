import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@/convex/_generated/api";
import { useThemeColors } from "@/hooks/use-theme";

import {
  DEFAULT_LABEL_COLOR,
  normalizeColorParam,
  pickRandomColor,
} from "../color-utils";
import { ColorPickerGrid } from "./color-picker-grid";
import { FieldGroup, FieldSectionLabel } from "./form-fields";
import { ColorLeading, NameLeading } from "./label-form-leads";
import type { TagPickerItem } from "./tag-picker-screen";

interface Props {
  selectedTags: TagPickerItem[];
  toggleTag: (tag: TagPickerItem) => void;
}

export function NewTagScreen({ selectedTags, toggleTag }: Props) {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ color?: string; name?: string }>();
  const [name, setName] = useState(() =>
    Array.isArray(params.name) ? params.name[0] : (params.name ?? "")
  );
  const [color, setColor] = useState(
    () =>
      normalizeColorParam(params.color) ??
      pickRandomColor() ??
      DEFAULT_LABEL_COLOR
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
          <FieldSectionLabel>General</FieldSectionLabel>
          <FieldGroup>
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                gap: 14,
                minHeight: 62,
                paddingLeft: 16,
              }}
            >
              <NameLeading name={name} />
              <View
                style={{
                  alignItems: "center",
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                  flex: 1,
                  flexDirection: "row",
                  minHeight: 62,
                  paddingRight: 16,
                }}
              >
                <TextInput
                  autoFocus
                  maxLength={50}
                  onChangeText={setName}
                  placeholder="Tag name"
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                  style={{
                    color: colors.foreground,
                    flex: 1,
                    fontSize: 17,
                    minHeight: 62,
                  }}
                  value={name}
                />
                {trimmedName ? null : (
                  <Text style={{ color: colors.negative, fontSize: 17 }}>
                    Required
                  </Text>
                )}
              </View>
            </View>
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                gap: 14,
                minHeight: 62,
                paddingLeft: 16,
              }}
            >
              <ColorLeading color={color} />
              <View
                style={{
                  alignItems: "center",
                  flex: 1,
                  flexDirection: "row",
                  minHeight: 62,
                  paddingRight: 16,
                }}
              >
                <Text
                  style={{ color: colors.foreground, flex: 1, fontSize: 17 }}
                >
                  Color
                </Text>
              </View>
            </View>
          </FieldGroup>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderCurve: "continuous",
            borderRadius: 24,
            paddingHorizontal: 12,
            paddingVertical: 18,
          }}
        >
          <ColorPickerGrid selectedColor={color} onSelect={setColor} />
        </View>
      </ScrollView>
    </>
  );
}
