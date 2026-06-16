import { ContentUnavailableView, Host } from '@expo/ui/swift-ui';
import { useColorScheme } from 'react-native';

type Props = {
  title: string;
  systemImage: string;
  description: string;
};

export function ScreenPlaceholder({ title, systemImage, description }: Props) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <Host style={{ flex: 1, backgroundColor: scheme === 'dark' ? '#0A0A0C' : '#F6F7FB' }}>
      <ContentUnavailableView
        title={title}
        systemImage={systemImage as never}
        description={description}
      />
    </Host>
  );
}
