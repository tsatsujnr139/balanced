import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { ThemedView } from "@/components/themed-view";
import { useThemeColors } from "@/hooks/use-theme";

import { CategoryLeading, ColorLeading } from "./label-form-leads";

export interface ManagedLabelItem {
  color: string;
  deletable: boolean;
  id: string;
  kind: "category" | "tag";
  name: string;
  symbol?: string;
}

interface Props {
  emptyText: string;
  isLoading: boolean;
  items: ManagedLabelItem[];
  onDelete: (item: ManagedLabelItem) => void;
}

function ManagedLabelRow({
  item,
  last,
  onDelete,
}: {
  item: ManagedLabelItem;
  last: boolean;
  onDelete: (item: ManagedLabelItem) => void;
}) {
  const colors = useThemeColors();
  const content = (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.card,
        flexDirection: "row",
        gap: 14,
        minHeight: 62,
        paddingLeft: 16,
      }}
    >
      {item.kind === "category" ? (
        <CategoryLeading
          color={item.color}
          symbol={item.symbol ?? "square.grid.2x2.fill"}
        />
      ) : (
        <ColorLeading color={item.color} />
      )}
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
        {item.deletable ? null : (
          <Text style={{ color: colors.muted, fontSize: 13 }}>Built-in</Text>
        )}
      </View>
    </View>
  );

  if (!item.deletable) {
    return content;
  }

  return (
    <ReanimatedSwipeable
      friction={1.5}
      overshootRight={false}
      rightThreshold={28}
      renderRightActions={() => (
        <Pressable
          accessibilityLabel={`Delete ${item.name}`}
          accessibilityRole="button"
          onPress={() => onDelete(item)}
          style={{
            alignItems: "center",
            backgroundColor: colors.negative,
            justifyContent: "center",
            minHeight: 62,
            width: 96,
          }}
        >
          <SymbolView name="trash" size={20} tintColor="#fff" />
          <Text
            style={{
              color: "#fff",
              fontSize: 12,
              fontWeight: "600",
              marginTop: 3,
            }}
          >
            Delete
          </Text>
        </Pressable>
      )}
    >
      {content}
    </ReanimatedSwipeable>
  );
}

export function LabelManagementList({
  emptyText,
  isLoading,
  items,
  onDelete,
}: Props) {
  const colors = useThemeColors();

  if (isLoading) {
    return (
      <View
        style={{
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
          padding: 32,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View
        style={{
          alignItems: "center",
          flex: 1,
          gap: 14,
          justifyContent: "center",
          padding: 32,
        }}
      >
        <SymbolView name="tray" size={32} tintColor={colors.muted} />
        <Text style={{ color: colors.muted, fontSize: 17 }}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <ThemedView variant="card" className="overflow-hidden rounded-[22px]">
      {items.map((item, index) => (
        <ManagedLabelRow
          key={item.id}
          item={item}
          last={index === items.length - 1}
          onDelete={onDelete}
        />
      ))}
    </ThemedView>
  );
}
