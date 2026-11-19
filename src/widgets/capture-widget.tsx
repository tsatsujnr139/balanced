import { Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";

interface CaptureWidgetProps {
  label: string;
}

const CaptureWidgetView = (
  props: CaptureWidgetProps,
  _environment: WidgetEnvironment
) => {
  "widget";

  const primary = "#5e5ce6";
  const onPrimary = "#ffffff";

  return (
    <VStack
      alignment="center"
      spacing={6}
      modifiers={[
        widgetURL("balanced://capture"),
        containerBackground(primary, "widget"),
        padding({ all: 12 }),
      ]}
    >
      <Image color={onPrimary} size={34} systemName="text.viewfinder" />
      <Text
        modifiers={[
          font({ size: 13, weight: "semibold" }),
          foregroundStyle(onPrimary),
        ]}
      >
        {props.label}
      </Text>
    </VStack>
  );
};

const CaptureWidget = createWidget("CaptureWidget", CaptureWidgetView);

export function refreshCaptureWidget() {
  CaptureWidget.updateSnapshot({ label: "Capture" });
}

export default CaptureWidget;
