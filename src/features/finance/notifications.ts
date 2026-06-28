import type { Budget, PlannedPayment } from "./types";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  color: string;
  symbol: string;
  route: "/budget/[id]" | "/planned-payment/[id]";
  routeId: string;
}

export function buildFinanceNotifications({
  budgets,
  plannedPayments,
}: {
  budgets: Budget[];
  plannedPayments: PlannedPayment[];
}): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const budget of budgets) {
    if (budget.notifyOnOverspend && budget.spent > budget.limit) {
      notifications.push({
        body: "This budget has gone past its planned amount.",
        color: budget.color,
        id: `budget:${budget.id}:overspend`,
        route: "/budget/[id]",
        routeId: budget.id,
        symbol: budget.symbol,
        title: `${budget.name} is overspent`,
      });
      continue;
    }

    if (
      budget.notifyAtThreshold &&
      budget.limit > 0 &&
      budget.spent / budget.limit >= 0.75
    ) {
      notifications.push({
        body: "You are approaching the planned amount for this budget.",
        color: budget.color,
        id: `budget:${budget.id}:threshold`,
        route: "/budget/[id]",
        routeId: budget.id,
        symbol: budget.symbol,
        title: `${budget.name} is over 75% used`,
      });
    }
  }

  for (const payment of plannedPayments) {
    if (payment.notifyOnOverdue && payment.overdueCount > 0) {
      notifications.push({
        body: `${payment.overdueCount} missed payment${payment.overdueCount === 1 ? "" : "s"} need attention.`,
        color: payment.color,
        id: `planned-payment:${payment.id}:overdue`,
        route: "/planned-payment/[id]",
        routeId: payment.id,
        symbol: payment.symbol,
        title: `${payment.name} is overdue`,
      });
      continue;
    }

    if (payment.notifyOnDue && payment.dueStatus === "today") {
      notifications.push({
        body: "This planned payment is ready to confirm manually.",
        color: payment.color,
        id: `planned-payment:${payment.id}:due`,
        route: "/planned-payment/[id]",
        routeId: payment.id,
        symbol: payment.symbol,
        title: `${payment.name} is due today`,
      });
    }
  }

  return notifications;
}
