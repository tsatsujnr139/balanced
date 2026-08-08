import type {
  PlannedCategorySelection,
  PlannedTagSelection,
} from "./add-planned-payment-context";
import type { PlannedPaymentFrequency, PlannedPaymentType } from "./types";

export interface PlannedPaymentDraftPrefill {
  accountId: string | null;
  amount: string;
  category: PlannedCategorySelection | null;
  date: number;
  description: string;
  frequency: PlannedPaymentFrequency;
  interval: number;
  name: string;
  notifyOnDue: boolean;
  notifyOnOverdue: boolean;
  tags: PlannedTagSelection[];
  transactionCharge: string;
  type: PlannedPaymentType;
}

const plannedPaymentDraftPrefillById = new Map<
  string,
  PlannedPaymentDraftPrefill
>();

export function setPlannedPaymentDraftPrefill(
  id: string,
  prefill: PlannedPaymentDraftPrefill
): void {
  plannedPaymentDraftPrefillById.set(id, prefill);
}

export function getPlannedPaymentDraftPrefill(
  id: string
): PlannedPaymentDraftPrefill | undefined {
  return plannedPaymentDraftPrefillById.get(id);
}

export function clearPlannedPaymentDraftPrefill(id: string): void {
  plannedPaymentDraftPrefillById.delete(id);
}
