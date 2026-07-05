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
import { useAddCategory } from "@/features/finance/add-category-context";
import { CategoryFormRows } from "@/features/finance/components/category-form-rows";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

export default function AddCategoryScreen() {
  const colors = useThemeColors();
  const createCategory = useMutation(api.finance.createCategory);
  const { draft } = useAddCategory();
  const [isSaving, setIsSaving] = useState(false);
  const trimmedName = draft.name.trim();

  const save = useCallback(async () => {
    if (!trimmedName || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await createCategory({
        color: draft.color,
        name: trimmedName,
        symbol: draft.symbol,
      });
      router.back();
    } catch (error) {
      Alert.alert(
        "Could not add category",
        error instanceof Error ? error.message : "Please try again."
      );
      setIsSaving(false);
    }
  }, [createCategory, draft.color, draft.symbol, isSaving, trimmedName]);

  const renderSaveButton = useCallback(
    () =>
      isSaving ? (
        <ActivityIndicator />
      ) : (
        <HeaderIconButton
          accessibilityLabel="Save category"
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
                accessibilityLabel="Save category"
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
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <View>
          <CategoryFormRows
            color={draft.color}
            name={draft.name}
            onColorPress={() => router.push("/add-category/color" as never)}
            onIconPress={() => router.push("/add-category/icon" as never)}
            onNamePress={() => router.push("/add-category/name" as never)}
            symbol={draft.symbol}
          />
        </View>
      </ScrollView>
    </>
  );
}
