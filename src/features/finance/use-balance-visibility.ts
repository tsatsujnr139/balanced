import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

const BALANCE_VISIBILITY_KEY = "finance.balanceVisible.v1";

function readPersistedVisibility(): boolean {
  try {
    // Default to visible when nothing has been persisted yet.
    return Storage.getItemSync(BALANCE_VISIBILITY_KEY) !== "false";
  } catch {
    return true;
  }
}

let balancesVisible = readPersistedVisibility();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return balancesVisible;
}

function setBalancesVisible(nextVisible: boolean) {
  if (balancesVisible === nextVisible) {
    return;
  }

  balancesVisible = nextVisible;

  try {
    Storage.setItemSync(BALANCE_VISIBILITY_KEY, nextVisible ? "true" : "false");
  } catch {
    /* Persisting visibility is best-effort. */
  }

  listeners.forEach((listener) => {
    listener();
  });
}

export function maskCurrencyValue(value: string): string {
  return value.replaceAll(/[^\s]/g, "*");
}

export function useBalanceVisibility() {
  const isBalanceVisible = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  return {
    isBalanceVisible,
    setBalanceVisible: setBalancesVisible,
    toggleBalanceVisibility: () => {
      setBalancesVisible(!balancesVisible);
    },
  };
}
