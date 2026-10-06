import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const DOUBLE_TAP_SCALE = 2.5;

interface Props {
  uri: string;
}

export function ZoomableImage({ uri }: Props) {
  const scale = useSharedValue(MIN_SCALE);
  const savedScale = useSharedValue(MIN_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = () => {
    "worklet";
    scale.value = withTiming(MIN_SCALE);
    savedScale.value = MIN_SCALE;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(
        Math.max(savedScale.value * event.scale, MIN_SCALE),
        MAX_SCALE
      );
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        reset();
        return;
      }
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((event) => {
      if (scale.value <= MIN_SCALE) {
        return;
      }
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        reset();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ flex: 1, overflow: "hidden" }, animatedStyle]}>
        <Image contentFit="contain" source={{ uri }} style={{ flex: 1 }} />
      </Animated.View>
    </GestureDetector>
  );
}
