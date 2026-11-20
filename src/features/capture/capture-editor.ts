import type { Id } from "../../../convex/_generated/dataModel";
import {
  OUT_OF_WALLET_ACCOUNT_ID,
  isOutOfWalletAccountId,
} from "../finance/out-of-wallet";
import { TRANSFER_CATEGORY } from "../finance/transaction-categories";
import type { TransactionDraftPrefill } from "../finance/transaction-draft-prefill";
import type { Account } from "../finance/types";
import type { CaptureDraft, CaptureImage } from "./capture-context";

const amountInput = (value: number): string => (value / 100).toFixed(2);
const minorUnits = (value: string): number =>
  Math.round(Number(value.replaceAll(",", "")) * 100);

export const captureDraftToForm = (
  draft: CaptureDraft,
  images: CaptureImage[]
): TransactionDraftPrefill => {
  const { transaction, sourceImageUri } = draft.captured;
  const image = images.find((item) => item.uri === sourceImageUri);
  const category = transaction.transfer ? TRANSFER_CATEGORY : draft.category;
  return {
    accountId: draft.accountId,
    amount: amountInput(transaction.amount),
    attachments:
      draft.attachments ?? (image ? [{ ...image, id: image.uri }] : []),
    category: category?.name ?? null,
    customCategories: category ? [{ ...category, keywords: [] }] : [],
    date: draft.date,
    narration: transaction.description,
    tags: draft.tags,
    toAccountId: transaction.transfer
      ? (draft.toAccountId ?? OUT_OF_WALLET_ACCOUNT_ID)
      : null,
    toAmount:
      transaction.transfer?.toAmount === undefined
        ? ""
        : amountInput(transaction.transfer.toAmount),
    transactionCharge: transaction.fee ? amountInput(transaction.fee) : "",
    transactionTypeIndex: transaction.transfer
      ? 2
      : transaction.direction === "credit"
        ? 1
        : 0,
  };
};

/** Apply edits to the review draft; nothing is written to the database yet. */
export const applyCaptureForm = (
  draft: CaptureDraft,
  form: TransactionDraftPrefill,
  accounts: Account[]
): CaptureDraft => {
  const original = draft.captured.transaction;
  const isTransfer = form.transactionTypeIndex === 2;
  const from = accounts.find((account) => account.id === form.accountId);
  const to = accounts.find((account) => account.id === form.toAccountId);
  const currency = from?.currency ?? to?.currency ?? original.currency;
  const amount = minorUnits(form.amount);
  const toAmount =
    to && to.currency !== currency
      ? minorUnits(form.toAmount ?? "")
      : undefined;
  const category = form.customCategories.find(
    (item) => item.name === form.category
  );
  return {
    ...draft,
    accountId: form.accountId,
    attachments: form.attachments,
    captured: {
      ...draft.captured,
      transaction: {
        ...original,
        amount,
        currency,
        description:
          form.narration.trim() ||
          (isTransfer ? "Transfer" : (form.category ?? "Transaction")),
        direction:
          isTransfer || form.transactionTypeIndex === 0 ? "debit" : "credit",
        fee:
          form.transactionTypeIndex === 1
            ? 0
            : minorUnits(form.transactionCharge || "0"),
        transfer: isTransfer
          ? {
              ...original.transfer,
              destinationHint: to?.name,
              toAmount,
              toCurrency: to?.currency,
              rate: toAmount === undefined ? undefined : toAmount / amount,
            }
          : undefined,
        pairedLeg: isTransfer ? original.pairedLeg : undefined,
      },
    },
    category: category
      ? { color: category.color, name: category.name, symbol: category.symbol }
      : null,
    continuity: "unknown",
    date: form.date,
    labelSource: "manual",
    tags: form.tags,
    toAccountId:
      isTransfer && !isOutOfWalletAccountId(form.toAccountId)
        ? form.toAccountId
        : null,
  };
};

/** The same payload is used by capture review and its save-path regression tests. */
export const captureDraftToCreateArgs = (
  draft: CaptureDraft,
  alreadyAdded: ReadonlySet<string>
) => {
  const { transaction } = draft.captured;
  const isTransfer = Boolean(transaction.transfer);
  const fromExternal = isTransfer && isOutOfWalletAccountId(draft.accountId);
  const externalTransferSide = fromExternal
    ? ("from" as const)
    : isTransfer && !draft.toAccountId
      ? ("to" as const)
      : undefined;
  return {
    accountId: (fromExternal
      ? draft.toAccountId
      : draft.accountId) as Id<"accounts">,
    amount: transaction.amount,
    category: isTransfer ? undefined : draft.category?.name,
    color: isTransfer ? undefined : draft.category?.color,
    date: draft.date,
    externalRef: transaction.externalRef,
    externalTransferSide,
    merchant: transaction.description,
    symbol: isTransfer ? undefined : draft.category?.symbol,
    tagIds: draft.tags.map((tag) => tag.id as Id<"tags">),
    toAccountId:
      isTransfer && !fromExternal
        ? ((draft.toAccountId ?? undefined) as Id<"accounts"> | undefined)
        : undefined,
    toAmount: transaction.transfer?.toAmount,
    toExternalRef:
      isTransfer &&
      draft.toAccountId &&
      !fromExternal &&
      transaction.pairedLeg &&
      !alreadyAdded.has(transaction.pairedLeg.externalRef)
        ? transaction.pairedLeg.externalRef
        : undefined,
    transactionCharge:
      transaction.direction === "debit" && transaction.fee > 0
        ? transaction.fee
        : undefined,
    type: isTransfer
      ? ("transfer" as const)
      : transaction.direction === "debit"
        ? ("expense" as const)
        : ("income" as const),
  };
};
