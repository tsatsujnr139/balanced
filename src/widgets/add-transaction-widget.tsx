import { Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";

interface AddTransactionWidgetProps {
  label: string;
}

const AddTransactionWidgetView = (
  props: AddTransactionWidgetProps,
  _environment: WidgetEnvironment
) => {
  "widget";

  const primary = "#2f6bff";
  const onPrimary = "#ffffff";

  return (
    <VStack
      alignment="center"
      spacing={6}
      modifiers={[
        widgetURL("balanced://add-transaction"),
        containerBackground(primary, "widget"),
        padding({ all: 12 }),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 36, weight: "semibold" }),
          foregroundStyle(onPrimary),
        ]}
      >
        +
      </Text>
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

const AddTransactionWidget = createWidget(
  "AddTransactionWidget",
  AddTransactionWidgetView
);

export function refreshAddTransactionWidget() {
  AddTransactionWidget.updateSnapshot({ label: "Add transaction" });
}

export default AddTransactionWidget;
