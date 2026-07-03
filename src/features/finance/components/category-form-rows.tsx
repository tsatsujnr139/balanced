import { Text } from "react-native";

import {
  FieldGroup,
  FieldRow,
  FieldSectionLabel,
} from "@/features/finance/components/form-fields";
import {
  CategoryLeading,
  ColorLeading,
  NameLeading,
} from "@/features/finance/components/label-form-leads";
import { useThemeColors } from "@/hooks/use-theme";

interface Props {
  color: string;
  name: string;
  onColorPress: () => void;
  onIconPress: () => void;
  onNamePress: () => void;
  symbol: string;
}

export function CategoryFormRows({
  color,
  name,
  onColorPress,
  onIconPress,
  onNamePress,
  symbol,
}: Props) {
  const colors = useThemeColors();
  const trimmedName = name.trim();

  return (
    <>
      <FieldSectionLabel>General</FieldSectionLabel>
      <FieldGroup>
        <FieldRow
          label="Category name"
          leading={<NameLeading name={name} />}
          onPress={onNamePress}
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
          onPress={onIconPress}
        />
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
