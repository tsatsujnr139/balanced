import { useQuery } from "convex/react";
import Storage from "expo-sqlite/kv-store";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../../../convex/_generated/api";
import { buildFinanceNotifications } from "./notifications";
import { useFinance } from "./use-finance";

const DISMISSED_NOTIFICATIONS_KEY = "finance.dismissed-notifications.v1";

function readDismissedIds(): string[] {
  try {
    const serialized = Storage.getItemSync(DISMISSED_NOTIFICATIONS_KEY);
    if (!serialized) {
      return [];
    }
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function saveDismissedIds(ids: string[]) {
  void Storage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(ids)).catch(
    () => {
      /* empty */
    }
  );
}

export function useAppNotifications() {
  const { budgets } = useFinance();
  const plannedPayments = useQuery(api.finance.listPlannedPayments);
  const [dismissedIds, setDismissedIds] = useState<string[]>(readDismissedIds);
  const notifications = useMemo(
    () =>
      buildFinanceNotifications({
        budgets,
        plannedPayments: plannedPayments ?? [],
      }).filter((notification) => !dismissedIds.includes(notification.id)),
    [budgets, dismissedIds, plannedPayments]
  );

  useEffect(() => {
    saveDismissedIds(dismissedIds);
  }, [dismissedIds]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedIds((current) =>
      current.includes(id) ? current : [...current, id]
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setDismissedIds((current) => {
      const ids = notifications.map((notification) => notification.id);
      return [...new Set([...current, ...ids])];
    });
  }, [notifications]);

  return {
    clearNotifications,
    dismissNotification,
    notificationCount: notifications.length,
    notifications,
  };
}
