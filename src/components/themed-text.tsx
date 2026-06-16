import { Platform, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeToken, themeTextClass } from '@/constants/theme';
import { cn } from '@/lib/cn';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  /** Semantic color token from global.css — adapts to light/dark automatically. */
  color?: ThemeToken;
};

const typeClass: Record<NonNullable<ThemedTextProps['type']>, string> = {
  default: 'text-base font-medium',
  title: 'text-5xl font-semibold leading-[52px]',
  small: 'text-sm font-medium leading-5',
  smallBold: 'text-sm font-bold leading-5',
  subtitle: 'text-[32px] font-semibold leading-[44px]',
  link: 'text-sm leading-[30px]',
  linkPrimary: 'text-sm leading-[30px] text-primary',
  code: 'text-xs font-mono',
};

export function ThemedText({
  className,
  type = 'default',
  color = 'foreground',
  style,
  ...rest
}: ThemedTextProps) {
  return (
    <Text
      className={cn(
        themeTextClass[color],
        typeClass[type],
        type === 'code' && Platform.OS === 'android' && 'font-bold',
        className
      )}
      style={[
        type === 'code' ? { fontFamily: Fonts.mono } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}
