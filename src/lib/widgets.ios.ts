import { refreshAddTransactionWidget } from "@/widgets/add-transaction-widget";

/** Seeds home-screen widget snapshots after the app launches. */
export function refreshHomeScreenWidgets() {
  refreshAddTransactionWidget();
}
