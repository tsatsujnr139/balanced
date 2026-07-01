import { useMutation } from "convex/react";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  DEFAULT_LABEL_COLOR,
  pickRandomColor,
} from "@/features/finance/color-utils";
import { ColorPickerGrid } from "@/features/finance/components/color-picker-grid";
import {
  FieldGroup,
  FieldSectionLabel,
} from "@/features/finance/components/form-fields";
import {
  CategoryLeading,
  ColorLeading,
  NameLeading,
} from "@/features/finance/components/label-form-leads";
import { CUSTOM_CATEGORY_SYMBOLS } from "@/features/finance/transaction-categories";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../convex/_generated/api";

const DEFAULT_CATEGORY_SYMBOL = "square.grid.2x2.fill";

export default function AddCategoryScreen() {
  const colors = useThemeColors();
  const createCategory = useMutation(api.finance.createCategory);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState(DEFAULT_CATEGORY_SYMBOL);
  const [color, setColor] = useState(
    () => pickRandomColor() ?? DEFAULT_LABEL_COLOR
  );
  const [isSaving, setIsSaving] = useState(false);
  const trimmedName = name.trim();

  const save = useCallback(async () => {
    if (!trimmedName || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await createCategory({ color, name: trimmedName, symbol });
      router.back();
    } catch (error) {
      Alert.alert(
        "Could not add category",
        error instanceof Error ? error.message : "Please try again."
      );
      setIsSaving(false);
    }
  }, [color, createCategory, isSaving, symbol, trimmedName]);

  return (
    <>
      <Stack.Screen>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            accessibilityLabel="Close"
            icon="xmark"
            onPress={() => router.back()}
            separateBackground
          />
        </Stack.Toolbar>
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
                  maxLength={80}
                  onChangeText={setName}
                  placeholder="Category name"
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
              <CategoryLeading color={color} symbol={symbol} />
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
                <Text
                  style={{ color: colors.foreground, flex: 1, fontSize: 17 }}
                >
                  Icon
                </Text>
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
              <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>
                Color
              </Text>
            </View>
          </FieldGroup>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderCurve: "continuous",
            borderRadius: 24,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 14,
            paddingHorizontal: 12,
            paddingVertical: 18,
          }}
        >
          {CUSTOM_CATEGORY_SYMBOLS.map((option) => {
            const selected = option === symbol;
            return (
              <View key={option} style={{ alignItems: "center", width: "18%" }}>
                <Pressable
                  accessibilityLabel={`Select ${option}`}
                  accessibilityRole="button"
                  onPress={() => setSymbol(option)}
                  style={{
                    alignItems: "center",
                    backgroundColor: color,
                    borderColor: selected ? colors.foreground : "transparent",
                    borderRadius: 14,
                    borderWidth: selected ? 2 : 0,
                    height: 52,
                    justifyContent: "center",
                    width: 52,
                  }}
                >
                  <SymbolView
                    name={option as never}
                    size={22}
                    tintColor="#fff"
                  />
                </Pressable>
              </View>
            );
          })}
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
