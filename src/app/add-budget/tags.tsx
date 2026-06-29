import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { useAddBudget } from "@/features/finance/add-budget-context";
import { ColorLeading } from "@/features/finance/components/label-form-leads";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";

interface TagItem {
  id: string;
  name: string;
  color: string;
}

export default function BudgetTagsScreen() {
  const colors = useThemeColors();
  const availableTags = useQuery(api.finance.listTags);
  const { tag: selectedTag, setTag } = useAddBudget();
  const [search, setSearch] = useState("");
  const tags = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (availableTags ?? [])
      .filter((tag) => !query || tag.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableTags, search]);

  const renderRow = (
    item: TagItem,
    {
      selected,
      last,
      onPress,
    }: { selected: boolean; last: boolean; onPress: () => void }
  ) => (
    <Pressable accessibilityRole="checkbox" onPress={onPress}>
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: 14,
          minHeight: 62,
          paddingLeft: 16,
        }}
      >
        <ColorLeading color={item.color} />
        <View
          style={{
            alignItems: "center",
            borderBottomColor: colors.border,
            borderBottomWidth: last ? 0 : 1,
            flex: 1,
            flexDirection: "row",
            minHeight: 62,
            paddingRight: 16,
          }}
        >
          <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>
            {item.name}
          </Text>
          {selected ? (
            <SymbolView name="checkmark" size={18} tintColor={colors.primary} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => setSearch("")}
        onChangeText={(event) => setSearch(event.nativeEvent.text)}
        placeholder="Search tags"
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        data={tags}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          search.trim()
            ? null
            : renderRow(
                { color: colors.border, id: "__none__", name: "None" },
                {
                  last: false,
                  onPress: () => {
                    setTag(null);
                    router.back();
                  },
                  selected: selectedTag === null,
                }
              )
        }
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              flex: 1,
              gap: 14,
              justifyContent: "center",
              padding: 32,
            }}
          >
            <SymbolView name="tag" size={32} tintColor={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 17 }}>
              {(availableTags ?? []).length === 0 && !search.trim()
                ? "No tags yet"
                : "No tags found"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) =>
          renderRow(item, {
            last: index === tags.length - 1,
            onPress: () => {
              setTag(selectedTag?.id === item.id ? null : item);
              router.back();
            },
            selected: selectedTag?.id === item.id,
          })
        }
        style={{ backgroundColor: colors.background, flex: 1 }}
      />
    </>
  );
}
