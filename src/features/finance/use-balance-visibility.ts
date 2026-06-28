import { useSyncExternalStore } from "react";

let balancesVisible = true;
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
