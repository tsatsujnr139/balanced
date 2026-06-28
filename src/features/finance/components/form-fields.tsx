import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme';

type FieldRowProps = {
  label: string;
  value?: string;
  valueNode?: ReactNode;
  last?: boolean;
  leading?: ReactNode;
  icon?: string;
  iconColor?: string;
  onPress?: () => void;
};

export function FieldSectionLabel({ children }: { children: string }) {
  const colors = useThemeColors();

  return (
    <Text
      style={{
        color: colors.muted,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.4,
        marginBottom: 8,
        paddingLeft: 4,
        textTransform: 'uppercase',
      }}>
      {children}
    </Text>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 24,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}>
      {children}
    </View>
  );
}

export function FieldRow({
  label,
  value,
  valueNode,
  last = false,
  leading,
  icon,
  iconColor,
  onPress,
}: FieldRowProps) {
  const colors = useThemeColors();
  const trailing = valueNode ?? (value ? (
          <Text
            allowFontScaling={false}
            ellipsizeMode="tail"
            numberOfLines={1}
            selectable
            style={{
              color: colors.muted,
              fontSize: 17,
              textAlign: 'right',
            }}>
      {value}
    </Text>
  ) : null);

  const row = (
    <View
      style={{
        minHeight: 62,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingLeft: 16,
      }}>
      {leading ??
        (icon && iconColor ? (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: iconColor,
            }}>
            <SymbolView name={icon as never} size={17} tintColor="#fff" />
          </View>
        ) : null)}
      <View
        style={{
          minHeight: 62,
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomColor: colors.border,
          borderBottomWidth: last ? 0 : 1,
          paddingRight: 16,
        }}>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          selectable
          style={{
            flex: 1,
            flexShrink: 1,
            color: colors.foreground,
            fontSize: 17,
            fontWeight: '400',
          }}>
          {label}
        </Text>
        {trailing ? (
          <View style={{ flexShrink: 0, marginRight: 12, maxWidth: '52%' }}>{trailing}</View>
        ) : null}
        <SymbolView name="chevron.right" size={12} tintColor={colors.muted} />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        {row}
      </Pressable>
    );
  }

  return row;
}
