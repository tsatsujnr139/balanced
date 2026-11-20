import * as Updates from "expo-updates";
import { useEffect } from "react";
import { AppState } from "react-native";

import { createUpdateController } from "./update-controller";
import { getReloadScreenOptions } from "./update-screen";
import { getUpdateTarget } from "./update-state";

const controller = createUpdateController({
  check: async () => {
    const result = await Updates.checkForUpdateAsync();
    if (result.isRollBackToEmbedded) {
      return { rollback: true };
    }
    return result.isAvailable
      ? { id: result.manifest.id, rollback: false }
      : null;
  },
  download: async () => await Updates.fetchUpdateAsync(),
  reload: async () =>
    await Updates.reloadAsync({
      reloadScreenOptions: getReloadScreenOptions(),
    }),
  isBusy: () =>
    Boolean(
      Updates.latestContext.isStartupProcedureRunning ||
      Updates.latestContext.isChecking ||
      Updates.latestContext.isDownloading ||
      Updates.latestContext.isRestarting
    ),
  running: () => ({ id: Updates.updateId, embedded: Updates.isEmbeddedLaunch }),
});

// Module-level callbacks stay stable when native update events rerender the hook.
const checkForUpdates = async (): Promise<void> => {
  if (__DEV__ || !Updates.isEnabled) {
    return;
  }
  try {
    await controller.check();
  } catch {
    // Network errors are retried on the next foreground event, never in a render loop.
    console.warn("Could not check for app updates");
  }
};
const reloadApp = async (): Promise<void> => {
  await controller.restart();
};

export const useRemoteUpdate = () => {
  const state = Updates.useUpdates();
  const { isStartupProcedureRunning } = state;

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled || isStartupProcedureRunning) {
      return;
    }
    void checkForUpdates();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void checkForUpdates();
      }
    });
    return () => subscription.remove();
  }, [isStartupProcedureRunning]);

  const pendingTarget = state.isUpdatePending
    ? getUpdateTarget(state.downloadedUpdate, state.currentlyRunning)
    : null;
  return { ...state, canRestart: pendingTarget !== null, reloadApp };
};
