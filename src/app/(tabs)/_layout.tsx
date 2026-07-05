import { Platform } from "react-native";

import { AndroidFab } from "@/components/android-fab";
import AppTabs from "@/components/app-tabs";

export default function TabsLayout() {
  return (
    <>
      <AppTabs />
      {Platform.OS === "android" ? <AndroidFab /> : null}
    </>
  );
}
