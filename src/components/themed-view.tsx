import { View } from "react-native";
import type { ViewProps } from "react-native";

import { themeClass } from "@/constants/theme";
import type { ThemeToken } from "@/constants/theme";
import { cn } from "@/lib/cn";

export type ThemedViewProps = ViewProps & {
  /** Semantic background token from global.css — adapts to light/dark automatically. */
  variant?: ThemeToken;
};

export function ThemedView({
  className,
  variant = "background",
  style,
  ...otherProps
}: ThemedViewProps) {
  return (
    <View
      className={cn(themeClass[variant], className)}
      style={style}
      {...otherProps}
    />
  );
}
