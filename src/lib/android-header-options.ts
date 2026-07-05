import { Platform } from "react-native";

/**
 * Spreads the given native-stack header options (`headerLeft`, `headerRight`,
 * etc.) only on Android, omitting the keys entirely on iOS rather than
 * setting them to `undefined`.
 *
 * `Stack.Toolbar` contributes its own headerLeft/headerRight-equivalent
 * options via a separate composition system that a same-named key present
 * in the screen's static `options` — even set to `undefined` — can
 * interfere with. Since iOS never needs these keys (it keeps using
 * `Stack.Toolbar`), the key must not exist there at all.
 */
export function androidHeaderOptions<T extends Record<string, unknown>>(
  options: T
): Partial<T> {
  return Platform.OS === "android" ? options : {};
}
