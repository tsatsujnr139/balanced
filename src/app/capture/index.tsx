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
import {
  captureSourceKey,
  captureSourceLabel,
  getRememberedAccountId,
} from "@/features/capture/capture-accounts";
import { useCapture } from "@/features/capture/capture-context";
import type {
  CaptureDraft,
  CaptureImage,
} from "@/features/capture/capture-context";
import { parseCapture } from "@/features/capture/parse-capture";
import type {
  CaptureInput,
  CaptureReader,
  CaptureResult,
} from "@/features/capture/parse-capture";
import { formatCurrency } from "@/features/finance/format";
import { useFinance } from "@/features/finance/use-finance";
import { useLastTransactionAccountId } from "@/features/finance/use-last-transaction-account";
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
  const { toggleDraft } = useCapture();
  const { transaction, reader } = draft.captured;
  const account = accounts.find((item) => item.id === draft.accountId);
  const isCredit = transaction.direction === "credit";
  const readerLabel = READER_LABELS[reader];
  const selected = draft.selected && !alreadyAdded;

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
        <Pressable
          accessibilityLabel="Change account"
          accessibilityRole="button"
          disabled={alreadyAdded}
          onPress={() =>
            router.push({
              params: { draft: draft.key },
              pathname: "/capture/account",
            })
          }
          style={{ alignItems: "center", flexDirection: "row", gap: 6 }}
        >
          <SymbolView
            name={(account?.symbol ?? "creditcard") as never}
            size={13}
            tintColor={account?.color ?? colors.negative}
          />
          <Text
            style={{
              color: account ? colors.primary : colors.negative,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {account?.name ?? "Choose account"}
          </Text>
          <SymbolView name="chevron.right" size={10} tintColor={colors.muted} />
        </Pressable>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {alreadyAdded ? (
            <Badge color={colors.muted} label="Already added" />
          ) : null}
          {transaction.fee > 0 ? (
            <Badge
              color={colors.muted}
              label={`Fee ${formatCurrency(transaction.fee, transaction.currency)}`}
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

const buildDrafts = (
  result: CaptureResult,
  fallbackAccountId: string | null
): CaptureDraft[] => {
  const continuity = checkBalanceContinuity(
    result.transactions.map((item) => item.transaction)
  );
  return result.transactions.map((captured, index) => {
    const { transaction } = captured;
    return {
      accountId:
        getRememberedAccountId(captureSourceKey(transaction)) ??
        fallbackAccountId,
      captured,
      continuity: continuity[index] ?? "unknown",
      date: transaction.occurredAt
        ? captureDateTimeToEpoch(transaction.occurredAt)
        : result.referenceDate.getTime(),
      key: transaction.externalRef,
      selected: true,
    };
  });
};

export default function CaptureScreen() {
  const colors = useThemeColors();
  const { accounts } = useFinance();
  const lastAccountId = useLastTransactionAccountId();
  const extractInCloud = useAction(api.capture.extractTransactions);
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
        (image): CaptureInput => ({ kind: "image", uri: image.uri })
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
      });
      setResult(next);
      setDrafts(buildDrafts(next, fallbackAccountId));
    } catch (error) {
      setReadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsReading(false);
    }
  };

  const pickImages = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      quality: 1,
      selectionLimit: MAX_IMAGES,
    });
    if (picked.canceled) {
      return;
    }
    const next: CaptureImage[] = picked.assets.map((asset, index) => ({
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
      "The unread text will be sent to OpenCode Go (zero data retention) to try again.",
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
