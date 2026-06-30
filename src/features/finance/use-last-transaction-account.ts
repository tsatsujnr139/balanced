import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

const LAST_TRANSACTION_ACCOUNT_KEY = "finance.lastTransactionAccountId.v1";

function readPersistedAccountId(): string | null {
  try {
    return Storage.getItemSync(LAST_TRANSACTION_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

let lastTransactionAccountId = readPersistedAccountId();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return lastTransactionAccountId;
}

export function setLastTransactionAccountId(accountId: string) {
  if (lastTransactionAccountId === accountId) {
    return;
  }

  lastTransactionAccountId = accountId;

  try {
    Storage.setItemSync(LAST_TRANSACTION_ACCOUNT_KEY, accountId);
  } catch {
    /* Persisting the default account is best-effort. */
  }

  listeners.forEach((listener) => {
    listener();
  });
}

export function useLastTransactionAccountId() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
