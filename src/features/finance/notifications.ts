import type { Budget, PlannedPayment } from './types';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  color: string;
  symbol: string;
  route: '/budget/[id]' | '/planned-payment/[id]';
  routeId: string;
};

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
        id: `budget:${budget.id}:overspend`,
        title: `${budget.name} is overspent`,
        body: 'This budget has gone past its planned amount.',
        color: budget.color,
        symbol: budget.symbol,
        route: '/budget/[id]',
        routeId: budget.id,
      });
      continue;
    }

    if (budget.notifyAtThreshold && budget.limit > 0 && budget.spent / budget.limit >= 0.75) {
      notifications.push({
        id: `budget:${budget.id}:threshold`,
        title: `${budget.name} is over 75% used`,
        body: 'You are approaching the planned amount for this budget.',
        color: budget.color,
        symbol: budget.symbol,
        route: '/budget/[id]',
        routeId: budget.id,
      });
    }
  }

  for (const payment of plannedPayments) {
    if (payment.notifyOnOverdue && payment.overdueCount > 0) {
      notifications.push({
        id: `planned-payment:${payment.id}:overdue`,
        title: `${payment.name} is overdue`,
        body: `${payment.overdueCount} missed payment${payment.overdueCount === 1 ? '' : 's'} need attention.`,
        color: payment.color,
        symbol: payment.symbol,
        route: '/planned-payment/[id]',
        routeId: payment.id,
      });
      continue;
    }

    if (payment.notifyOnDue && payment.dueStatus === 'today') {
      notifications.push({
        id: `planned-payment:${payment.id}:due`,
        title: `${payment.name} is due today`,
        body: 'This planned payment is ready to confirm manually.',
        color: payment.color,
        symbol: payment.symbol,
        route: '/planned-payment/[id]',
        routeId: payment.id,
      });
    }
  }

  return notifications;
}
