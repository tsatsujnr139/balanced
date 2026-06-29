import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import {
  DEFAULT_LABEL_COLOR,
  normalizeColorParam,
  pickRandomColor,
} from "@/features/finance/color-utils";
import {
  FieldGroup,
  FieldRow,
  FieldSectionLabel,
} from "@/features/finance/components/form-fields";
import {
  ColorLeading,
  NameLeading,
} from "@/features/finance/components/label-form-leads";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";

const RETURN_PATH = "/add-transaction/tag-new";

export default function NewTagScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ color?: string; name?: string }>();
  const [initialColor] = useState(() => pickRandomColor());
  const [isSaving, setIsSaving] = useState(false);
  const createTag = useMutation(api.finance.createTag);
  const { labelDraft, setLabelDraft, tags, toggleTag } = useAddTransaction();
  const { color, name } = labelDraft;
  const trimmedName = name.trim();

  useEffect(() => {
    setLabelDraft((current) => ({
      color:
        normalizeColorParam(params.color) ??
        initialColor ??
        DEFAULT_LABEL_COLOR,
      name: Array.isArray(params.name) ? params.name[0] : (params.name ?? ""),
      symbol: current.symbol,
    }));
  }, [initialColor, params.color, params.name, setLabelDraft]);

  const save = useCallback(async () => {
    if (!trimmedName || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const tag = await createTag({ color, name: trimmedName });
      if (!tags.some((item) => item.id === tag.id)) {
        toggleTag(tag);
      }
      router.back();
    } catch {
      Alert.alert("Could not add tag", "Please try again.");
      setIsSaving(false);
    }
  }, [color, createTag, isSaving, tags, toggleTag, trimmedName]);

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
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <View>
          <FieldSectionLabel>General</FieldSectionLabel>
          <FieldGroup>
            <FieldRow
              label="Tag name"
              leading={<NameLeading name={name} />}
              onPress={() => {
                router.push({
                  params: { returnPath: RETURN_PATH },
                  pathname: "/add-transaction/label-name",
                });
              }}
              valueNode={
                trimmedName ? (
                  <Text style={{ color: colors.muted, fontSize: 17 }}>
                    {trimmedName}
                  </Text>
                ) : (
                  <Text style={{ color: colors.negative, fontSize: 17 }}>
                    Required
                  </Text>
                )
              }
            />
            <FieldRow
              label="Color"
              last
              leading={<ColorLeading color={color} />}
              onPress={() => {
                router.push({
                  params: { returnPath: RETURN_PATH },
                  pathname: "/add-transaction/color",
                });
              }}
            />
          </FieldGroup>
        </View>
      </ScrollView>
    </>
  );
}
