import { requireNativeView } from "expo";
import type { ComponentType } from "react";
import { View } from "react-native";
import type { NativeSyntheticEvent, ViewProps } from "react-native";

export interface DroppedImage {
  mimeType: string;
  name: string;
  /** A copy in the app's caches directory. */
  uri: string;
}

interface NativeProps extends ViewProps {
  onDropActiveChange?: (
    event: NativeSyntheticEvent<{ active: boolean }>
  ) => void;
  onDropImages?: (
    event: NativeSyntheticEvent<{ images: DroppedImage[] }>
  ) => void;
}

export interface CaptureDropZoneProps extends ViewProps {
  /** True while an image is dragged over the zone. */
  onDropActiveChange?: (active: boolean) => void;
  onDropImages: (images: DroppedImage[]) => void;
}

const MODULE_NAME = "BalancedCapture";
const VIEW_NAME = "CaptureDropView";

// Builds made before the drop view existed fall back to a plain View.
const hasNativeView = Boolean(
  (
    globalThis as {
      expo?: { getViewConfig?: (module: string, view: string) => unknown };
    }
  ).expo?.getViewConfig?.(MODULE_NAME, VIEW_NAME)
);

const NativeDropView: ComponentType<NativeProps> | null = hasNativeView
  ? requireNativeView<NativeProps>(MODULE_NAME, VIEW_NAME)
  : null;

/** Whether screenshots can be dragged in on this build. */
export const supportsImageDrop = NativeDropView !== null;

/** Accepts images dragged in from Photos or another app. */
export function CaptureDropZone({
  onDropActiveChange,
  onDropImages,
  ...props
}: CaptureDropZoneProps) {
  if (!NativeDropView) {
    return <View {...props} />;
  }
  return (
    <NativeDropView
      {...props}
      onDropActiveChange={(event) =>
        onDropActiveChange?.(event.nativeEvent.active)
      }
      onDropImages={(event) => onDropImages(event.nativeEvent.images)}
    />
  );
}
