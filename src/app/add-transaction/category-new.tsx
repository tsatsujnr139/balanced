import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

import { api } from "@/convex/_generated/api";
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
  CategoryLeading,
  NameLeading,
} from "@/features/finance/components/label-form-leads";
import { useThemeColors } from "@/hooks/use-theme";

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
              label="Category name"
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
              label="Icon"
              leading={<CategoryLeading color={color} symbol={symbol} />}
              onPress={() => {
                router.push({
                  params: { returnPath: RETURN_PATH },
                  pathname: "/add-transaction/category-icon",
                });
              }}
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
