import { Host, Icon as ExpoUIIcon } from "@expo/ui";
import type { SFSymbol, SymbolViewProps } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { Platform } from "react-native";

import { CONTENT_ICON_MAP } from "@/constants/content-icon-map";

/**
 * Drop-in replacement for `expo-symbols`' `SymbolView`, same props. On iOS,
 * forwards straight to the real `SymbolView` — unchanged from today. On
 * Android, `SymbolView` renders the glyph as `Text` off a downloaded icon
 * font (a known centering quirk), so this renders a real Jetpack Compose
 * vector icon instead, looked up from `CONTENT_ICON_MAP`. Not used inside
 * `headerLeft`/`headerRight` (see `header-icon-button.tsx` for why).
 */
export function Icon(props: SymbolViewProps) {
  if (Platform.OS !== "android") {
    return <SymbolView {...props} />;
  }

  const name = typeof props.name === "string" ? props.name : props.name.ios;
  const source = name ? CONTENT_ICON_MAP[name as SFSymbol] : undefined;

  if (!source) {
    return props.fallback ?? null;
  }

  return (
    <Host matchContents>
      <ExpoUIIcon
        color={props.tintColor}
        name={source}
        size={props.size ?? 24}
      />
    </Host>
  );
}
