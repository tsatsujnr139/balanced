import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useEffect, useState } from "react";
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
import { useAddTransaction } from "@/features/finance/add-transaction-context";
import {
  DEFAULT_LABEL_COLOR,
  normalizeColorParam,
  pickRandomColor,
} from "@/features/finance/color-utils";
import { CategoryFormRows } from "@/features/finance/components/category-form-rows";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

const RETURN_PATH = "/add-transaction/category-new";
const DEFAULT_CATEGORY_SYMBOL = "square.grid.2x2.fill";

function normalizeSymbolParam(symbol: string | string[] | undefined) {
  const value = Array.isArray(symbol) ? symbol[0] : symbol;
  return value ? decodeURIComponent(value) : DEFAULT_CATEGORY_SYMBOL;
}

export default function NewCategoryScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    color?: string;
    name?: string;
    symbol?: string;
  }>();
  const [initialColor] = useState(() => pickRandomColor());
  const [isSaving, setIsSaving] = useState(false);
  const createCategory = useMutation(api.finance.createCategory);
  const { addCustomCategory, labelDraft, setCategory, setLabelDraft } =
    useAddTransaction();
  const { color, name, symbol } = labelDraft;
  const trimmedName = name.trim();

  useEffect(() => {
    setLabelDraft({
      color:
        normalizeColorParam(params.color) ??
        initialColor ??
        DEFAULT_LABEL_COLOR,
      name: Array.isArray(params.name) ? params.name[0] : (params.name ?? ""),
      symbol: normalizeSymbolParam(params.symbol),
    });
  }, [initialColor, params.color, params.name, params.symbol, setLabelDraft]);

  const save = useCallback(async () => {
    if (!trimmedName || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const category = await createCategory({
        color,
        name: trimmedName,
        symbol,
      });
      addCustomCategory({
        color: category.color,
        keywords: [],
        name: category.name,
        symbol: category.symbol,
      });
      setCategory(category.name);
      router.back();
    } catch {
      Alert.alert("Could not add category", "Please try again.");
      setIsSaving(false);
    }
  }, [
    addCustomCategory,
    color,
    createCategory,
    isSaving,
    setCategory,
    symbol,
    trimmedName,
  ]);

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
            color={color}
            name={name}
            onColorPress={() => {
              router.push({
                params: { returnPath: RETURN_PATH },
                pathname: "/add-transaction/color",
              });
            }}
            onIconPress={() => {
              router.push({
                params: { returnPath: RETURN_PATH },
                pathname: "/add-transaction/category-icon",
              });
            }}
            onNamePress={() => {
              router.push({
                params: { returnPath: RETURN_PATH },
                pathname: "/add-transaction/label-name",
              });
            }}
            symbol={symbol}
          />
        </View>
      </ScrollView>
    </>
  );
}
