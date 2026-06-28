import { Platform, Text } from "react-native";
import type { TextProps } from "react-native";

import { Fonts, themeTextClass } from "@/constants/theme";
import type { ThemeToken } from "@/constants/theme";
import { cn } from "@/lib/cn";

export type ThemedTextProps = TextProps & {
  type?:
    | "default"
    | "title"
    | "small"
    | "smallBold"
    | "subtitle"
    | "link"
    | "linkPrimary"
    | "code";
  /** Semantic color token from global.css — adapts to light/dark automatically. */
  color?: ThemeToken;
};

const typeClass: Record<NonNullable<ThemedTextProps["type"]>, string> = {
  code: "text-xs font-mono",
  default: "text-base font-medium",
  link: "text-sm leading-[30px]",
  linkPrimary: "text-sm leading-[30px] text-primary",
  small: "text-sm font-medium leading-5",
  smallBold: "text-sm font-bold leading-5",
  subtitle: "text-[32px] font-semibold leading-[44px]",
  title: "text-5xl font-semibold leading-[52px]",
};

export function ThemedText({
  className,
  type = "default",
  color = "foreground",
  style,
  ...rest
}: ThemedTextProps) {
  return (
    <Text
      className={cn(
        themeTextClass[color],
        typeClass[type],
        type === "code" && Platform.OS === "android" && "font-bold",
        className
      )}
      style={[type === "code" ? { fontFamily: Fonts.mono } : undefined, style]}
      {...rest}
    />
  );
}
