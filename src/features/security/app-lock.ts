import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const APP_LOCK_ENABLED_KEY = "balanced.appLock.enabled";

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  label:
    | "Face ID"
    | "Touch ID"
    | "Fingerprint"
    | "Biometrics"
    | "Device authentication";
  canAuthenticate: boolean;
}

export type AppLockAuthResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "cancelled"
        | "not_available"
        | "not_enrolled"
        | "failed"
        | "unknown";
    };

function getCapabilityLabel(
  supportedTypes: LocalAuthentication.AuthenticationType[]
): BiometricCapability["label"] {
  if (
    supportedTypes.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    )
  ) {
    return process.env.EXPO_OS === "ios" ? "Face ID" : "Biometrics";
  }

  if (
    supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
  ) {
    return process.env.EXPO_OS === "ios" ? "Touch ID" : "Fingerprint";
  }

  return supportedTypes.length > 0 ? "Biometrics" : "Device authentication";
}

function mapAuthenticationError(
  error: LocalAuthentication.LocalAuthenticationError
): AppLockAuthResult {
  switch (error) {
    case "user_cancel":
    case "app_cancel":
    case "system_cancel":
    case "user_fallback": {
      return { ok: false, reason: "cancelled" };
    }
    case "not_available":
    case "passcode_not_set": {
      return { ok: false, reason: "not_available" };
    }
    case "not_enrolled": {
      return { ok: false, reason: "not_enrolled" };
    }
    case "authentication_failed":
    case "lockout":
    case "timeout":
    case "unable_to_process": {
      return { ok: false, reason: "failed" };
    }
    default: {
      return { ok: false, reason: "unknown" };
    }
  }
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (process.env.EXPO_OS === "web") {
    return {
      canAuthenticate: false,
      hasHardware: false,
      isEnrolled: false,
      label: "Device authentication",
      supportedTypes: [],
    };
  }

  try {
    const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    return {
      canAuthenticate: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      label: getCapabilityLabel(supportedTypes),
      supportedTypes,
    };
  } catch {
    return {
      canAuthenticate: false,
      hasHardware: false,
      isEnrolled: false,
      label: "Device authentication",
      supportedTypes: [],
    };
  }
}

export async function getAppLockEnabled(): Promise<boolean> {
  if (process.env.EXPO_OS === "web") {
    return false;
  }

  try {
    const isAvailable = await SecureStore.isAvailableAsync();

    if (!isAvailable) {
      return false;
    }

    return (await SecureStore.getItemAsync(APP_LOCK_ENABLED_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (process.env.EXPO_OS === "web") {
    return;
  }

  const isAvailable = await SecureStore.isAvailableAsync();

  if (!isAvailable) {
    return;
  }

  await SecureStore.setItemAsync(
    APP_LOCK_ENABLED_KEY,
    enabled ? "true" : "false",
    {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }
  );
}

export async function authenticateForAppLock(
  reason = "Unlock Balanced"
): Promise<AppLockAuthResult> {
  const capability = await getBiometricCapability();

  if (!capability.hasHardware) {
    return { ok: false, reason: "not_available" };
  }

  if (!capability.isEnrolled) {
    return { ok: false, reason: "not_enrolled" };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      fallbackLabel: process.env.EXPO_OS === "ios" ? "Use Passcode" : undefined,
      promptMessage: reason,
      promptSubtitle: "Keep your financial information private.",
    });

    return result.success ? { ok: true } : mapAuthenticationError(result.error);
  } catch {
    return { ok: false, reason: "unknown" };
  }
}
