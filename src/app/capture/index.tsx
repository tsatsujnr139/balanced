import { useAction } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Icon as SymbolView } from "@/components/icon";
import { api } from "@/convex/_generated/api";
import {
  captureDateTimeToEpoch,
  checkBalanceContinuity,
} from "@/convex/lib/capture/parser";
import type { CapturedTransfer } from "@/convex/lib/capture/transfers";
import { matchCaptureAccounts } from "@/features/capture/capture-account-matching";
import {
  captureDestinationKey,
  captureSourceKey,
  captureSourceLabel,
  getRememberedAccountId,
} from "@/features/capture/capture-accounts";
import { useCapture } from "@/features/capture/capture-context";
import type {
  CaptureDraft,
  CaptureImage,
  CaptureLabelSource,
} from "@/features/capture/capture-context";
import { parseCapture } from "@/features/capture/parse-capture";
import type {
  CaptureInput,
  CaptureReader,
  CaptureResult,
} from "@/features/capture/parse-capture";
import { formatCurrency } from "@/features/finance/format";
import { TRANSACTION_CATEGORIES } from "@/features/finance/transaction-categories";
import type { Account } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import {
  useCachedCategories,
  useCachedTags,
} from "@/features/finance/use-labels";
import { useLastTransactionAccountId } from "@/features/finance/use-last-transaction-account";
import { useLocalProfile } from "@/features/finance/use-local-profile";
import { useThemeColors } from "@/hooks/use-theme";

const MAX_IMAGES = 5;
const THUMBNAIL_SIZE = 64;

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  weekday: "short",
});

const READER_LABELS: Record<CaptureReader, string> = {
  cloud: "Read by OpenCode",
  "on-device": "Read on device",
  pattern: "",
};

function FieldGroup({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderCurve: "continuous",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <View
      style={{
        backgroundColor: `${color}22`,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  loading,
  onPress,
  prominent,
}: {
  disabled?: boolean;
  icon: string;
  label: string;
  loading?: boolean;
  onPress: () => void;
  prominent?: boolean;
}) {
  const colors = useThemeColors();
  const foreground = prominent ? "#fff" : colors.primary;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: prominent ? colors.primary : `${colors.primary}1A`,
        borderCurve: "continuous",
        borderRadius: 16,
        flex: 1,
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        minHeight: 48,
        opacity: disabled && !loading ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          <SymbolView name={icon as never} size={17} tintColor={foreground} />
          <Text style={{ color: foreground, fontSize: 16, fontWeight: "600" }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const LABEL_SOURCE_TEXT: Record<CaptureLabelSource, string> = {
  ai: "Suggested by OpenCode",
  history: "From your history",
  manual: "",
  rule: "Automatic rule",
};

function LabelChips({
  alreadyAdded,
  draft,
}: {
  alreadyAdded: boolean;
  draft: CaptureDraft;
}) {
  const colors = useThemeColors();
  const sourceText = draft.labelSource
    ? LABEL_SOURCE_TEXT[draft.labelSource]
    : "";
  const openPicker = (pathname: "/capture/category" | "/capture/tags") =>
    router.push({ params: { draft: draft.key }, pathname });

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Pressable
          accessibilityLabel={`Category: ${draft.category?.name ?? "Automatic"}`}
          accessibilityRole="button"
          disabled={alreadyAdded}
          onPress={() => openPicker("/capture/category")}
          style={{
            alignItems: "center",
            backgroundColor: `${draft.category?.color ?? colors.muted}22`,
            borderRadius: 8,
            flexDirection: "row",
            gap: 5,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <SymbolView
            name={(draft.category?.symbol ?? "square.grid.2x2") as never}
            size={12}
            tintColor={draft.category?.color ?? colors.muted}
          />
          <Text
            style={{
              color: draft.category?.color ?? colors.muted,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {draft.category?.name ?? "Automatic category"}
          </Text>
        </Pressable>
        {draft.tags.map((tag) => (
          <Pressable
            accessibilityLabel={`Tag ${tag.name}`}
            accessibilityRole="button"
            disabled={alreadyAdded}
            key={tag.id}
            onPress={() => openPicker("/capture/tags")}
            style={{
              backgroundColor: tag.color,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              {tag.name}
            </Text>
          </Pressable>
        ))}
        {alreadyAdded ? null : (
          <Pressable
            accessibilityLabel="Edit tags"
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => openPicker("/capture/tags")}
            style={{
              alignItems: "center",
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              flexDirection: "row",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <SymbolView name="tag" size={11} tintColor={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {draft.tags.length > 0 ? "Edit" : "Tags"}
            </Text>
          </Pressable>
        )}
      </View>
      {sourceText && !alreadyAdded ? (
        <Text style={{ color: colors.muted, fontSize: 11 }}>{sourceText}</Text>
      ) : null}
    </View>
  );
}

const PROVIDER_NAMES: Partial<Record<string, string>> = {
  bybit: "Bybit",
  fnb: "FNB",
  ghanapay: "GhanaPay",
  grey: "Grey",
  mtn_momo: "MoMo",
  wise: "Wise",
};

function AccountLink({
  account,
  disabled,
  emptyLabel,
  onPress,
  prefix,
}: {
  account: Account | undefined;
  disabled: boolean;
  emptyLabel: string;
  onPress: () => void;
  prefix?: string;
}) {
  const colors = useThemeColors();
  const isOutOfWallet = !account && emptyLabel === "Out of wallet";
  return (
    <Pressable
      accessibilityLabel={`${prefix ?? "Account"}: ${account?.name ?? emptyLabel}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{ alignItems: "center", flexDirection: "row", gap: 6 }}
    >
      {prefix ? (
        <Text style={{ color: colors.muted, fontSize: 13, width: 36 }}>
          {prefix}
        </Text>
      ) : null}
      <SymbolView
        name={
          (account?.symbol ??
            (isOutOfWallet ? "wallet.pass" : "creditcard")) as never
        }
        size={13}
        tintColor={
          account?.color ?? (isOutOfWallet ? colors.muted : colors.negative)
        }
      />
      <Text
        style={{
          color: account || isOutOfWallet ? colors.primary : colors.negative,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {account?.name ?? emptyLabel}
      </Text>
      <SymbolView name="chevron.right" size={10} tintColor={colors.muted} />
    </Pressable>
  );
}

function DraftRow({
  alreadyAdded,
  draft,
  last,
}: {
  alreadyAdded: boolean;
  draft: CaptureDraft;
  last: boolean;
}) {
  const colors = useThemeColors();
  const { accounts } = useFinance();
  const { alreadyAdded: alreadyAddedRefs, toggleDraft } = useCapture();
  const { transaction, reader } = draft.captured;
  const account = accounts.find((item) => item.id === draft.accountId);
  const toAccount = accounts.find((item) => item.id === draft.toAccountId);
  const { transfer, pairedLeg } = transaction;
  const isCredit = transaction.direction === "credit";
  const readerLabel = READER_LABELS[reader];
  const selected = draft.selected && !alreadyAdded;
  const openEditor = () =>
    router.push({
      pathname: "/capture/edit",
      params: { captureDraftKey: draft.key },
    });

  return (
    <View
      style={{
        borderBottomColor: colors.border,
        borderBottomWidth: last ? 0 : 1,
        flexDirection: "row",
        gap: 12,
        opacity: alreadyAdded ? 0.55 : 1,
        padding: 16,
      }}
    >
      <Pressable
        accessibilityLabel={selected ? "Deselect" : "Select"}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected, disabled: alreadyAdded }}
        disabled={alreadyAdded}
        hitSlop={8}
        onPress={() => toggleDraft(draft.key)}
        style={{ paddingTop: 2 }}
      >
        <SymbolView
          name={selected ? "checkmark.circle.fill" : "circle"}
          size={24}
          tintColor={selected ? colors.primary : colors.muted}
        />
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Text
            numberOfLines={2}
            style={{
              color: colors.foreground,
              flex: 1,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            {transaction.description}
          </Text>
          <Text
            style={{
              color: isCredit ? colors.positive : colors.foreground,
              fontSize: 16,
              fontVariant: ["tabular-nums"],
              fontWeight: "600",
            }}
          >
            {isCredit ? "+" : "-"}
            {formatCurrency(transaction.amount, transaction.currency)}
          </Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          {DATE_FORMAT.format(new Date(draft.date))}
          {transaction.occurredAt ? "" : " (capture time)"} ·{" "}
          {captureSourceLabel(transaction)}
        </Text>
        {transfer?.toAmount !== undefined && transfer.toCurrency ? (
          <Text
            style={{
              color: colors.positive,
              fontSize: 14,
              fontVariant: ["tabular-nums"],
              fontWeight: "600",
            }}
          >
            → +{formatCurrency(transfer.toAmount, transfer.toCurrency)}
            {transfer.rate ? `  @ ${transfer.rate}` : ""}
          </Text>
        ) : null}
        <AccountLink
          account={account}
          disabled={alreadyAdded}
          emptyLabel="Choose account"
          onPress={openEditor}
          prefix={transfer ? "From" : undefined}
        />
        {transfer ? (
          <AccountLink
            account={toAccount}
            disabled={alreadyAdded}
            emptyLabel="Out of wallet"
            onPress={openEditor}
            prefix="To"
          />
        ) : alreadyAdded ? null : (
          <LabelChips alreadyAdded={alreadyAdded} draft={draft} />
        )}
        {alreadyAdded ? null : (
          <Pressable
            accessibilityLabel={`Edit ${transaction.description}`}
            accessibilityRole="button"
            onPress={openEditor}
            style={{ alignSelf: "flex-start", paddingVertical: 6 }}
          >
            <Text
              style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}
            >
              Edit transaction
            </Text>
          </Pressable>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {alreadyAdded ? (
            <Badge color={colors.muted} label="Already added" />
          ) : null}
          {transfer ? (
            <Badge color="#5856D6" label={transfer.kind ?? "Transfer"} />
          ) : null}
          {pairedLeg && !alreadyAddedRefs.has(pairedLeg.externalRef) ? (
            <Badge
              color={colors.positive}
              label={`Matched ${PROVIDER_NAMES[pairedLeg.provider] ?? pairedLeg.institution ?? "incoming"} receipt`}
            />
          ) : null}
          {pairedLeg &&
          alreadyAddedRefs.has(pairedLeg.externalRef) &&
          !alreadyAdded ? (
            <Badge
              color="#FF9500"
              label={`${PROVIDER_NAMES[pairedLeg.provider] ?? "Incoming"} receipt was already saved as income. Delete it or set To: Out of wallet to avoid counting it twice`}
            />
          ) : null}
          {transaction.fee > 0 ? (
            <Badge
              color={colors.muted}
              label={`Fee ${formatCurrency(transaction.fee, transaction.currency)}`}
            />
          ) : null}
          {account && account.currency !== transaction.currency ? (
            <Badge
              color={colors.negative}
              label={`${account.name} is in ${account.currency}, not ${transaction.currency}`}
            />
          ) : null}
          {draft.continuity === "gap" ? (
            <Badge color="#FF9500" label="Balance gap before this" />
          ) : null}
          {readerLabel ? <Badge color="#AF52DE" label={readerLabel} /> : null}
        </View>
      </View>
    </View>
  );
}

const summarize = (found: number, alreadyAddedCount: number): string => {
  if (found === 0) {
    return "No complete transactions found.";
  }
  const plural = found === 1 ? "" : "s";
  if (alreadyAddedCount === found) {
    return `Found ${found} transaction${plural}, all already added.`;
  }
  const added =
    alreadyAddedCount > 0 ? `, ${alreadyAddedCount} already added` : "";
  return `Found ${found} transaction${plural}${added}. Tap ✓ to add the selected ones.`;
};

/** Remembered account, else the fallback, else any account in the draft's currency. */
const pickAccountId = (
  candidates: (string | null | undefined)[],
  currency: string,
  accounts: Account[]
): string | null => {
  for (const id of candidates) {
    const account = accounts.find((item) => item.id === id);
    if (account?.currency === currency) {
      return account.id;
    }
  }
  return accounts.find((item) => item.currency === currency)?.id ?? null;
};

/**
 * Remembered destination (a paired receipt shares its sender's remembered
 * account), else the only other account in the received currency. Null means
 * "Out of wallet" until the user picks one.
 */
const pickDestinationAccountId = (
  transaction: CapturedTransfer,
  accounts: Account[],
  sourceAccountId: string | null
): string | null => {
  const currency = transaction.transfer?.toCurrency ?? transaction.currency;
  const { destinationIds } = matchCaptureAccounts(transaction, accounts);
  const candidates = accounts.filter(
    (account) =>
      account.currency === currency &&
      account.id !== sourceAccountId &&
      (transaction.transfer?.kind !== "Wallet2Bank" ||
        destinationIds.includes(account.id))
  );
  const remembered = getRememberedAccountId(captureDestinationKey(transaction));
  const rememberedAccount = candidates.find(
    (account) => account.id === remembered
  );
  if (rememberedAccount) {
    return rememberedAccount.id;
  }
  const [onlyCandidate] = candidates;
  return candidates.length === 1 && onlyCandidate ? onlyCandidate.id : null;
};

const EXIF_DATE =
  /^(?<year>\d{4}):(?<month>\d{2}):(?<day>\d{2}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})$/;

/** "2026:11:19 21:08:12" (device local time) → epoch millis. */
const exifDateToEpoch = (value: unknown): number | undefined => {
  const match = typeof value === "string" ? EXIF_DATE.exec(value) : null;
  if (!match) {
    return;
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  ).getTime();
};

const buildDrafts = (
  result: CaptureResult,
  fallbackAccountId: string | null,
  accounts: Account[]
): CaptureDraft[] => {
  const continuity = checkBalanceContinuity(
    result.transactions.map((item) => item.transaction)
  );
  return result.transactions.map((captured, index) => {
    const { transaction } = captured;
    const accountId = pickAccountId(
      [
        getRememberedAccountId(captureSourceKey(transaction)),
        matchCaptureAccounts(transaction, accounts).sourceId,
        fallbackAccountId,
      ],
      transaction.currency,
      accounts
    );
    return {
      accountId,
      captured,
      category: null,
      continuity: continuity[index] ?? "unknown",
      date: transaction.occurredAt
        ? captureDateTimeToEpoch(transaction.occurredAt)
        : result.referenceDate.getTime(),
      key: transaction.externalRef,
      selected: true,
      tags: [],
      toAccountId: transaction.transfer
        ? pickDestinationAccountId(transaction, accounts, accountId)
        : null,
    };
  });
};

export default function CaptureScreen() {
  const colors = useThemeColors();
  const { accounts } = useFinance();
  const lastAccountId = useLastTransactionAccountId();
  const extractInCloud = useAction(api.capture.extractTransactions);
  const { firstName } = useLocalProfile();
  const suggestLabels = useAction(api.labels.suggest);
  const { categories: customCategories } = useCachedCategories();
  const { tags: availableTags } = useCachedTags();
  const [isLabelling, setIsLabelling] = useState(false);

  const applyLabelSuggestions = async (built: CaptureDraft[]) => {
    const categoryByName = new Map(
      [...TRANSACTION_CATEGORIES, ...customCategories].map((category) => [
        category.name,
        category,
      ])
    );
    const pending = built.filter(
      (draft) =>
        !(alreadyAdded.has(draft.key) || draft.captured.transaction.transfer)
    );
    if (pending.length === 0) {
      return;
    }
    setIsLabelling(true);
    try {
      const { suggestions } = await suggestLabels({
        categoryNames: [...categoryByName.keys()],
        drafts: pending.map(({ captured, key }) => ({
          counterparty: captured.transaction.counterpartyName,
          description: captured.transaction.description,
          direction: captured.transaction.direction,
          key,
          reference: captured.transaction.reference,
        })),
      });
      const byKey = new Map(suggestions.map((item) => [item.key, item]));
      setDrafts((current) =>
        current.map((draft) => {
          const suggestion = byKey.get(draft.key);
          // Never overwrite a choice the user made while suggestions loaded.
          if (!suggestion || draft.labelSource === "manual") {
            return draft;
          }
          const category = suggestion.category
            ? categoryByName.get(suggestion.category)
            : undefined;
          const suggestedTagIds = new Set<string>(suggestion.tagIds);
          return {
            ...draft,
            category: category
              ? {
                  color: category.color,
                  name: category.name,
                  symbol: category.symbol,
                }
              : null,
            labelSource: suggestion.source,
            tags: availableTags.filter((tag) => suggestedTagIds.has(tag.id)),
          };
        })
      );
    } catch {
      // Suggestions are optional; drafts stay unlabelled.
    } finally {
      setIsLabelling(false);
    }
  };
  const { alreadyAdded, drafts, images, setDrafts, setImages, setText, text } =
    useCapture();
  const [isReading, setIsReading] = useState(false);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const fallbackAccountId =
    (lastAccountId && accounts.some((account) => account.id === lastAccountId)
      ? lastAccountId
      : accounts[0]?.id) ?? null;
  const hasInput = text.trim().length > 0 || images.length > 0;
  const alreadyAddedCount = drafts.filter((draft) =>
    alreadyAdded.has(draft.key)
  ).length;

  const read = async (options: { forceCloud?: boolean } = {}) => {
    Keyboard.dismiss();
    const inputs: CaptureInput[] = [
      ...images.map(
        (image): CaptureInput => ({
          capturedAt: image.capturedAt,
          kind: "image",
          uri: image.uri,
        })
      ),
      ...(text.trim() ? [{ kind: "text" as const, text }] : []),
    ];
    if (inputs.length === 0) {
      return;
    }
    setIsReading(true);
    setReadError(null);
    try {
      const next = await parseCapture(inputs, {
        cloud: async (leftover) =>
          (await extractInCloud({ text: leftover })).transactions,
        forceCloud: options.forceCloud,
        ownerNames: firstName ? [firstName] : [],
      });
      setResult(next);
      const built = buildDrafts(next, fallbackAccountId, accounts);
      setDrafts(built);
      void applyLabelSuggestions(built);
    } catch (error) {
      setReadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsReading(false);
    }
  };

  const pickImages = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: true,
      mediaTypes: ["images"],
      quality: 1,
      selectionLimit: MAX_IMAGES,
    });
    if (picked.canceled) {
      return;
    }
    const next: CaptureImage[] = picked.assets.map((asset, index) => ({
      capturedAt: exifDateToEpoch(asset.exif?.DateTimeOriginal),
      mimeType: asset.mimeType ?? undefined,
      name: asset.fileName ?? `screenshot-${Date.now()}-${index}.png`,
      uri: asset.uri,
    }));
    setImages([...images, ...next].slice(0, MAX_IMAGES));
  };

  const removeImage = (uri: string) => {
    setImages(images.filter((image) => image.uri !== uri));
  };

  const confirmCloudRetry = () => {
    Alert.alert(
      "Read with OpenCode?",
      "The unread text will be sent to OpenCode (zero data retention) to try again.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => {
            void read({ forceCloud: true });
          },
          text: "Send",
        },
      ]
    );
  };

  return (
    <ScrollView
      contentContainerStyle={{
        gap: 18,
        paddingBottom: 40,
        paddingHorizontal: 20,
      }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <FieldGroup>
        <TextInput
          accessibilityLabel="Transaction text"
          multiline
          onChangeText={setText}
          placeholder="Paste a bank or MoMo SMS, type, or tap the keyboard mic to dictate"
          placeholderTextColor={colors.muted}
          style={{
            color: colors.foreground,
            fontSize: 16,
            minHeight: 120,
            padding: 16,
            textAlignVertical: "top",
          }}
          value={text}
        />
      </FieldGroup>

      {images.length > 0 ? (
        <ScrollView
          contentContainerStyle={{ gap: 10 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {images.map((image) => (
            <View key={image.uri}>
              <Image
                accessibilityLabel={image.name}
                contentFit="cover"
                source={{ uri: image.uri }}
                style={{
                  borderRadius: 12,
                  height: THUMBNAIL_SIZE * 1.6,
                  width: THUMBNAIL_SIZE,
                }}
              />
              <Pressable
                accessibilityLabel={`Remove ${image.name}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => removeImage(image.uri)}
                style={{ position: "absolute", right: -6, top: -6 }}
              >
                <SymbolView
                  name="xmark.circle.fill"
                  size={22}
                  tintColor={colors.muted}
                />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <ActionButton
          disabled={isReading || images.length >= MAX_IMAGES}
          icon="photo.on.rectangle"
          label="Screenshots"
          onPress={() => {
            void pickImages();
          }}
        />
        <ActionButton
          disabled={!hasInput}
          icon="text.viewfinder"
          label="Read"
          loading={isReading}
          onPress={() => {
            void read();
          }}
          prominent
        />
      </View>

      {readError ? (
        <Text style={{ color: colors.negative, fontSize: 14 }}>
          {readError}
        </Text>
      ) : null}

      {result && !isReading ? (
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          {summarize(drafts.length, alreadyAddedCount)}
          {isLabelling ? " Suggesting categories…" : ""}
        </Text>
      ) : null}

      {drafts.length > 0 ? (
        <FieldGroup>
          {drafts.map((draft, index) => (
            <DraftRow
              alreadyAdded={alreadyAdded.has(draft.key)}
              draft={draft}
              key={draft.key}
              last={index === drafts.length - 1}
            />
          ))}
        </FieldGroup>
      ) : null}

      {result && result.unreadSegments.length > 0 && !isReading ? (
        <FieldGroup>
          <View style={{ gap: 10, padding: 16 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              Some text wasn't read
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Usually a message cut off at the edge of a screenshot.
              {result.modelIssue ? ` (${result.modelIssue})` : ""}
            </Text>
            <Text
              numberOfLines={4}
              style={{ color: colors.muted, fontSize: 13, fontStyle: "italic" }}
            >
              {result.unreadSegments.join(" … ")}
            </Text>
            <ActionButton
              icon="cloud"
              label="Try OpenCode"
              onPress={confirmCloudRetry}
            />
          </View>
        </FieldGroup>
      ) : null}
    </ScrollView>
  );
}
