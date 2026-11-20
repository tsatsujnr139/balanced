/** The share extension opens `balanced://expo-sharing`. */
const SHARE_LINK = /^[a-z][\w+.-]*:\/\/expo-sharing(?:[/?#]|$)/i;

/** Sends items shared from the share sheet to the capture screen. */
export function redirectSystemPath({
  path,
}: {
  initial: boolean;
  path: string;
}) {
  return SHARE_LINK.test(path) ? "/capture" : path;
}
