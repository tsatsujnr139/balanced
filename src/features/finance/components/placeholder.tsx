import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColors } from '@/hooks/use-theme';

type Props = {
  title: string;
  systemImage: string;
  description: string;
};

export function ScreenPlaceholder({ title, systemImage, description }: Props) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background p-8">
      <SymbolView name={systemImage as never} size={56} tintColor={colors.muted} />
      <ThemedText type="subtitle" className="text-center">
        {title}
      </ThemedText>
      <ThemedText type="small" color="muted" className="max-w-[280px] text-center">
        {description}
      </ThemedText>
    </View>
  );
}
