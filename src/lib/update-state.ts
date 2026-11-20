import type { CurrentlyRunningInfo, UpdateInfo } from "expo-updates";

/** Native state can outlive a JS reload. An update already running needs no restart. */
export const getUpdateTarget = (
  update: UpdateInfo | undefined,
  running: Pick<CurrentlyRunningInfo, "updateId" | "isEmbeddedLaunch">
): string | null => {
  if (!update) {
    return null;
  }
  if (update.type === "rollback") {
    return running.isEmbeddedLaunch
      ? null
      : `rollback:${update.createdAt.toISOString()}`;
  }
  const id = update.updateId.toLowerCase();
  return id && id !== running.updateId?.toLowerCase() ? id : null;
};
