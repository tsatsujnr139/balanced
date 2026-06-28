import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Balanced',
  slug: 'balanced',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/logo.png',
  scheme: 'balanced',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './src/assets/logo.png',
    bundleIdentifier: 'com.adobees.balanced',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './src/assets/logo.png',
      backgroundImage: './src/assets/logo.png',
      monochromeImage: './src/assets/logo.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.adobees.balanced',
  },
  web: {
    output: 'static',
    favicon: './src/assets/logo.png',
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-sqlite',
    'expo-secure-store',
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow Balanced to use Face ID to keep your financial information private.',
      },
    ],
    '@react-native-community/datetimepicker',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Balanced to access your photos to attach receipts and documents.',
        cameraPermission: 'Allow Balanced to use the camera to take photos of receipts.',
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        android: {
          image: './src/assets/logo.png',
          imageWidth: 76,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
