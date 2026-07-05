import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "@/hooks/use-theme";

const FAB_SIZE = 56;
const FAB_MARGIN = 16;
const FAB_RADIUS = 16;
const FAB_TOUCH_OUTSET = 8;

interface Props {
  accessibilityLabel: string;
  bottomOffset?: number;
  onPress: () => void;
}

export function ScreenFab({
  accessibilityLabel,
  bottomOffset = 0,
  onPress,
}: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        bottom: 0,
        elevation: 24,
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
        zIndex: 1000,
      }}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        hitSlop={FAB_TOUCH_OUTSET}
        onPress={onPress}
        pressRetentionOffset={FAB_TOUCH_OUTSET}
        style={{
          alignItems: "center",
          backgroundColor: colors.primary,
          borderCurve: "continuous",
          borderRadius: FAB_RADIUS,
          boxShadow: "0 6px 14px rgba(0, 0, 0, 0.28)",
          bottom: insets.bottom + bottomOffset + FAB_MARGIN,
          height: FAB_SIZE,
          justifyContent: "center",
          position: "absolute",
          right: FAB_MARGIN,
          width: FAB_SIZE,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 32,
            lineHeight: 36,
          }}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
}
