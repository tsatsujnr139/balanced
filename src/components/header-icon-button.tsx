import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useThemeColors } from "@/hooks/use-theme";

interface Props {
  accessibilityLabel: string;
  badge?: string;
  disabled?: boolean;
  icon: {
    ios: SFSymbol;
    android: AndroidSymbol;
    offsetY?: number;
    size?: number;
  };
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
}

const TOUCH_TARGET = 48;
const ICON_SIZE = 24;
const HIT_SLOP = 8;

/**
 * Android replacement for `Stack.Toolbar.Button`/`Stack.Toolbar.Icon`, whose
 * icon prop only accepts an `ImageSourcePropType` on Android (never a symbol
 * name). iOS keeps using `Stack.Toolbar` unchanged; this component is only
 * ever rendered on Android.
 *
 * Uses `expo-symbols`' `SymbolView` rather than `@expo/ui`'s Compose-hosted
 * `Icon` (unlike the FAB) — `headerLeft`/`headerRight` content is portaled
 * into `react-native-screens`' native `ScreenStackHeaderSubview` container on
 * Android, which doesn't reliably forward touches to (or settle layout for) a
 * Compose-hosted "island" view.
 */
export function HeaderIconButton({
  accessibilityLabel,
  badge,
  disabled = false,
  icon,
  onPress,
  style,
  tintColor,
}: Props) {
  const colors = useThemeColors();
  const iconSize = icon.size ?? ICON_SIZE;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={[
        {
          alignItems: "center",
          alignSelf: "center",
          height: TOUCH_TARGET,
          justifyContent: "center",
          opacity: disabled ? 0.4 : 1,
          width: TOUCH_TARGET,
        },
        style,
      ]}
    >
      <View
        style={{
          alignItems: "center",
          height: iconSize,
          justifyContent: "center",
          transform: [{ translateY: icon.offsetY ?? 0 }],
          width: iconSize,
        }}
      >
        <SymbolView
          name={icon}
          size={iconSize}
          tintColor={tintColor ?? colors.foreground}
        />
      </View>
      {badge ? (
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.negative,
            borderRadius: 8,
            justifyContent: "center",
            minWidth: 16,
            paddingHorizontal: 3,
            position: "absolute",
            right: 4,
            top: 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
