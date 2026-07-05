import { FloatingActionButton, Host, Icon } from "@expo/ui/jetpack-compose";
import { View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "@/hooks/use-theme";

const ADD_ICON =
  require("@expo/material-symbols/add.xml") as ImageSourcePropType;

const FAB_SIZE = 56;
const FAB_MARGIN = 16;

interface Props {
  accessibilityLabel: string;
  bottomOffset?: number;
  onPress: () => void;
}

/**
 * Native Material 3 FAB. The full-screen box-none overlay gives Android a
 * stable parent hit area even when this is rendered above native tabs.
 */
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
      <Host
        matchContents
        style={{
          bottom: insets.bottom + bottomOffset + FAB_MARGIN,
          height: FAB_SIZE,
          position: "absolute",
          right: FAB_MARGIN,
          width: FAB_SIZE,
        }}
      >
        <FloatingActionButton containerColor={colors.primary} onClick={onPress}>
          <FloatingActionButton.Icon>
            <Icon
              contentDescription={accessibilityLabel}
              size={24}
              source={ADD_ICON}
              tint="#fff"
            />
          </FloatingActionButton.Icon>
        </FloatingActionButton>
      </Host>
    </View>
  );
}
