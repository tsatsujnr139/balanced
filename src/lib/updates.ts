import * as Updates from "expo-updates";
import { Appearance, Image as ReactNativeImage } from "react-native";

const STARTUP_UPDATE_TIMEOUT_MS = 8000;
const SPLASH_ICON_SIZE = 200;
const SPLASH_ICON = require("@/assets/logo.png");

const getReloadScreenBackgroundColor = () =>
  Appearance.getColorScheme() === "dark" ? "#111111" : "#f9fafa";

const getReloadScreenOptions = () => {
  const splashIcon = ReactNativeImage.resolveAssetSource(SPLASH_ICON);

  return {
    backgroundColor: getReloadScreenBackgroundColor(),
    image: {
      url: splashIcon.uri,
      width: SPLASH_ICON_SIZE,
      height: SPLASH_ICON_SIZE,
      scale: 1,
    },
    imageResizeMode: "contain" as const,
    imageFullScreen: false,
    fade: true,
  };
};

export const applyStartupUpdate = async (): Promise<boolean> => {
  if (__DEV__) {
    return false;
  }

  try {
    const checkResult = await Updates.checkForUpdateAsync();
    if (!checkResult.isAvailable) {
      return false;
    }

    const fetchPromise = Updates.fetchUpdateAsync();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Startup update timed out")),
        STARTUP_UPDATE_TIMEOUT_MS
      )
    );

    await Promise.race([fetchPromise, timeoutPromise]);

    await Updates.reloadAsync({
      reloadScreenOptions: getReloadScreenOptions(),
    });
    return true;
  } catch {
    return false;
  }
};

export const useRemoteUpdate = () => {
  const {
    isChecking,
    isUpdateAvailable,
    isUpdatePending,
    isDownloading,
    availableUpdate,
    downloadedUpdate,
    downloadError,
    checkError,
  } = Updates.useUpdates();

  const reloadApp = async () => {
    await Updates.reloadAsync({
      reloadScreenOptions: getReloadScreenOptions(),
    });
  };

  const checkForUpdateAsync = async () => {
    await Updates.checkForUpdateAsync();
  };

  const fetchUpdateAsync = async () => {
    await Updates.fetchUpdateAsync();
  };

  return {
    isChecking,
    isUpdateAvailable,
    isUpdatePending,
    isDownloading,
    availableUpdate,
    downloadedUpdate,
    downloadError,
    checkError,
    reloadApp,
    checkForUpdateAsync,
    fetchUpdateAsync,
  };
};
