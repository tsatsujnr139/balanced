import type { ExpoConfig } from "expo/config";

const BUNDLE_IDENTIFIER = "com.adobees.balanced";

const config: ExpoConfig = {
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      backgroundImage: "./src/assets/logo.png",
      foregroundImage: "./src/assets/logo.png",
      monochromeImage: "./src/assets/logo.png",
    },
    package: BUNDLE_IDENTIFIER,
    predictiveBackGestureEnabled: false,
  },
  developmentClient: {
    silentLaunch: true,
  },
  experiments: {
    autolinkingModuleResolution: true,
    reactCompiler: true,
    tsconfigPaths: true,
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "885d26f8-8dc6-4f2e-a976-a44118ee88a9",
    },
  },
  icon: "./src/assets/logo.png",
  ios: {
    appleTeamId: "FG2VJ5V48K",
    bundleIdentifier: BUNDLE_IDENTIFIER,
    icon: "./src/assets/logo.png",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    supportsTablet: false,
  },
  name: "Balanced",
  orientation: "portrait",
  owner: "creion",
  platforms: ["ios", "android"],
  plugins: [
    "expo-router",
    "expo-dev-client",
    "expo-sqlite",
    "expo-secure-store",
    [
      "expo-local-authentication",
      {
        faceIDPermission:
          "Allow Balanced to use Face ID to keep your financial information private.",
      },
    ],
    "@react-native-community/datetimepicker",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Balanced to access your photos to attach receipts and documents.",
        cameraPermission:
          "Allow Balanced to use the camera to take photos of receipts.",
        microphonePermission: false,
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        android: {
          image: "./src/assets/logo.png",
          imageWidth: 76,
        },
      },
    ],
  ],
  runtimeVersion: {
    policy: "appVersion",
  },
  scheme: "balanced",
  slug: "balanced",
  updates: {
    url: "https://u.expo.dev/885d26f8-8dc6-4f2e-a976-a44118ee88a9",
  },
  userInterfaceStyle: "automatic",
  version: "2026.06.01",
};

export default config;
