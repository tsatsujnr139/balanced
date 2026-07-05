import { Text, TextInput, View } from "react-native";

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

interface Props {
  color: string;
  name: string;
  onColorPress: () => void;
  onNameChange: (name: string) => void;
}

export function TagFormRows({
  color,
  name,
  onColorPress,
  onNameChange,
}: Props) {
  const colors = useThemeColors();
  const trimmedName = name.trim();

  return (
    <>
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
              onChangeText={onNameChange}
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
        <FieldRow
          label="Color"
          last
          leading={<ColorLeading color={color} />}
          onPress={onColorPress}
        />
      </FieldGroup>
    </>
  );
}
