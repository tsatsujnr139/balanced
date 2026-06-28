import * as Haptics from "expo-haptics";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PropsWithChildren } from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import {
  authenticateForAppLock,
  getAppLockEnabled,
  getBiometricCapability,
  setAppLockEnabled,
} from "@/features/security/app-lock";
import type {
  AppLockAuthResult,
  BiometricCapability,
} from "@/features/security/app-lock";

const RELOCK_AFTER_MS = 60_000;

interface AppLockContextValue {
  isHydrating: boolean;
  isEnabled: boolean;
  isUnlocked: boolean;
  capability: BiometricCapability | null;
  lastBackgroundedAt: number | null;
  isAuthenticating: boolean;
  errorMessage: string | null;
  refreshCapability: () => Promise<BiometricCapability>;
  setEnabled: (enabled: boolean) => Promise<void>;
  unlock: (reason?: string) => Promise<AppLockAuthResult>;
  clearError: () => void;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

function getMessageForAuthResult(
  result: AppLockAuthResult,
  capability?: BiometricCapability | null
) {
  if (result.ok) {
    return null;
  }

  switch (result.reason) {
    case "cancelled": {
      return "Authentication was cancelled.";
    }
    case "not_available": {
      return "Device authentication is not available on this device.";
    }
    case "not_enrolled": {
      return `Set up ${capability?.label ?? "device authentication"} in system settings to use App Lock.`;
    }
    case "failed": {
      return "Authentication failed. Try again.";
    }
    default: {
      return "Balanced could not verify your identity. Try again.";
    }
  }
}

async function notify(type: Haptics.NotificationFeedbackType) {
  if (process.env.EXPO_OS !== "ios") {
    return;
  }

  try {
    await Haptics.notificationAsync(type);
  } catch {
    // Haptics should never block authentication state updates.
  }
}

export function AppLockProvider({ children }: PropsWithChildren) {
  const [isHydrating, setIsHydrating] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [capability, setCapability] = useState<BiometricCapability | null>(
    null
  );
  const [lastBackgroundedAt, setLastBackgroundedAt] = useState<number | null>(
    null
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshCapability = useCallback(async () => {
    const nextCapability = await getBiometricCapability();
    setCapability(nextCapability);
    return nextCapability;
  }, []);

  const unlock = useCallback(
    async (reason = "Unlock Balanced") => {
      setIsAuthenticating(true);
      setErrorMessage(null);

      const nextCapability = await refreshCapability();
      const result = await authenticateForAppLock(reason);

      setIsAuthenticating(false);

      if (result.ok) {
        setIsUnlocked(true);
        await notify(Haptics.NotificationFeedbackType.Success);
        return result;
      }

      setErrorMessage(getMessageForAuthResult(result, nextCapability));
      await notify(Haptics.NotificationFeedbackType.Warning);
      return result;
    },
    [refreshCapability]
  );

  const setEnabled = useCallback(async (enabled: boolean) => {
    await setAppLockEnabled(enabled);
    setIsEnabled(enabled);
    setIsUnlocked(true);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      const [enabled, nextCapability] = await Promise.all([
        getAppLockEnabled(),
        getBiometricCapability(),
      ]);

      if (!isMounted) {
        return;
      }

      setIsEnabled(enabled);
      setCapability(nextCapability);
      setIsUnlocked(!enabled || process.env.EXPO_OS === "web");
      setIsHydrating(false);
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (isAuthenticating) {
        return;
      }

      if (nextState === "background" || nextState === "inactive") {
        setLastBackgroundedAt(Date.now());
        return;
      }

      if (
        nextState !== "active" ||
        !isEnabled ||
        process.env.EXPO_OS === "web"
      ) {
        return;
      }

      setLastBackgroundedAt((previousBackgroundedAt) => {
        if (
          previousBackgroundedAt &&
          Date.now() - previousBackgroundedAt >= RELOCK_AFTER_MS
        ) {
          setIsUnlocked(false);
        }

        return previousBackgroundedAt;
      });
    }

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
  }, [isAuthenticating, isEnabled]);

  const value = useMemo<AppLockContextValue>(
    () => ({
      capability,
      clearError: () => {
        setErrorMessage(null);
      },
      errorMessage,
      isAuthenticating,
      isEnabled,
      isHydrating,
      isUnlocked,
      lastBackgroundedAt,
      refreshCapability,
      setEnabled,
      unlock,
    }),
    [
      capability,
      errorMessage,
      isAuthenticating,
      isEnabled,
      isHydrating,
      isUnlocked,
      lastBackgroundedAt,
      refreshCapability,
      setEnabled,
      unlock,
    ]
  );

  return <AppLockContext value={value}>{children}</AppLockContext>;
}

export function useAppLock() {
  const value = use(AppLockContext);

  if (!value) {
    throw new Error("useAppLock must be used within AppLockProvider");
  }

  return value;
}
