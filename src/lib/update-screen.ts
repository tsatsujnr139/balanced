import { Appearance, Image as ReactNativeImage } from "react-native";

const SPLASH_ICON_SIZE = 200;
const SPLASH_ICON = require("@/assets/logo.png");

const getReloadScreenBackgroundColor = () =>
  Appearance.getColorScheme() === "dark" ? "#111111" : "#f9fafa";

export const getReloadScreenOptions = () => {
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
