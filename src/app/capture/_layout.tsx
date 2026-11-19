import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { File } from "expo-file-system";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { fetch } from "expo/fetch";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { MaterialIcons } from "@/constants/material-icons";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  captureSourceKey,
  rememberAccountId,
} from "@/features/capture/capture-accounts";
import { CaptureContext } from "@/features/capture/capture-context";
import type {
  CaptureContextValue,
  CaptureDraft,
  CaptureImage,
} from "@/features/capture/capture-context";
import { setLastTransactionAccountId } from "@/features/finance/use-last-transaction-account";
import { useLocalProfile } from "@/features/finance/use-local-profile";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

const MAX_DUPLICATE_LOOKUPS = 100;

interface UploadedAttachment {
  mimeType: string;
  name: string;
  size?: number;
  storageId: Id<"_storage">;
}

const renderBackButton = () => (
  <HeaderIconButton
    accessibilityLabel="Back"
    icon={MaterialIcons.chevronLeft}
    onPress={() => router.back()}
  />
);

function closeCapture() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  router.replace("/dashboard");
}

const isDuplicateError = (error: unknown): boolean =>
  error instanceof ConvexError &&
  (error.data as { code?: string } | undefined)?.code ===
    "DUPLICATE_EXTERNAL_REF";

export default function CaptureLayout() {
  const colors = useThemeColors();
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const { firstName } = useLocalProfile();
  const createTransaction = useMutation(api.finance.createTransaction);
  const generateUploadUrl = useMutation(
    api.finance.generateAttachmentUploadUrl
  );
  const [text, setText] = useState("");
  const [images, setImages] = useState<CaptureImage[]>([]);
  const [drafts, setDrafts] = useState<CaptureDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const externalRefs = useMemo(
    () => drafts.map((draft) => draft.key).slice(0, MAX_DUPLICATE_LOOKUPS),
    [drafts]
  );
  const capturedRefs = useQuery(
    api.finance.findCapturedExternalRefs,
    externalRefs.length > 0 ? { externalRefs } : "skip"
  );

  const alreadyAdded = useMemo(
    () => (capturedRefs ? new Set<string>(capturedRefs) : new Set<string>()),
    [capturedRefs]
  );

  const setDraftAccount = useCallback((key: string, accountId: string) => {
    setDrafts((current) => {
      const target = current.find((draft) => draft.key === key);
      if (!target) {
        return current;
      }
      // Apply to every draft from the same source and remember it for next time.
      const sourceKey = captureSourceKey(target.captured.transaction);
      rememberAccountId(sourceKey, accountId);
      return current.map((draft) =>
        captureSourceKey(draft.captured.transaction) === sourceKey
          ? { ...draft, accountId }
          : draft
      );
    });
  }, []);

  const toggleDraft = useCallback((key: string) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, selected: !draft.selected } : draft
      )
    );
  }, []);

  const uploadImage = useCallback(
    async (image: CaptureImage): Promise<UploadedAttachment> => {
      const file = new File(image.uri);
      const uploadUrl = await generateUploadUrl();
      const mimeType = image.mimeType || file.type || "image/png";
      const response = await fetch(uploadUrl, {
        body: file,
        headers: { "Content-Type": mimeType },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Could not upload the screenshot");
      }
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      return {
        mimeType,
        name: image.name,
        size: Number.isFinite(file.size) ? file.size : undefined,
        storageId,
      };
    },
    [generateUploadUrl]
  );

  const save = useCallback(async () => {
    const toSave = drafts.filter(
      (draft) => draft.selected && !alreadyAdded.has(draft.key)
    );
    if (toSave.length === 0) {
      Alert.alert("Nothing to add", "Select at least one new transaction.");
      return;
    }
    const missingAccount = toSave.find((draft) => !draft.accountId);
    if (missingAccount) {
      Alert.alert("Choose an account", "Every transaction needs an account.");
      return;
    }

    setIsSaving(true);
    let added = 0;
    let skipped = 0;
    const uploads = new Map<string, Promise<UploadedAttachment>>();
    try {
      for (const draft of toSave) {
        const { transaction, sourceImageUri } = draft.captured;
        const image = images.find((item) => item.uri === sourceImageUri);
        let attachments: UploadedAttachment[] = [];
        if (image) {
          if (!uploads.has(image.uri)) {
            uploads.set(image.uri, uploadImage(image));
          }
          attachments = [await uploads.get(image.uri)!];
        }
        const isExpense = transaction.direction === "debit";
        try {
          await createTransaction({
            accountId: draft.accountId as Id<"accounts">,
            amount: transaction.amount,
            attachments,
            createdByName: firstName || undefined,
            date: draft.date,
            externalRef: transaction.externalRef,
            merchant: transaction.description,
            tagIds: [],
            transactionCharge:
              isExpense && transaction.fee > 0 ? transaction.fee : undefined,
            type: isExpense ? "expense" : "income",
          });
          added += 1;
        } catch (error) {
          if (!isDuplicateError(error)) {
            throw error;
          }
          skipped += 1;
        }
      }
      const lastAccountId = toSave.at(-1)?.accountId;
      if (lastAccountId) {
        setLastTransactionAccountId(lastAccountId);
      }
      closeCapture();
    } catch (error) {
      Alert.alert(
        "Could not add all transactions",
        `${added} added${skipped ? `, ${skipped} already existed` : ""}. ${
          error instanceof Error ? error.message : ""
        }`.trim()
      );
    } finally {
      setIsSaving(false);
    }
  }, [alreadyAdded, createTransaction, drafts, firstName, images, uploadImage]);

  const value = useMemo<CaptureContextValue>(
    () => ({
      alreadyAdded,
      drafts,
      images,
      isSaving,
      setDraftAccount,
      setDrafts,
      setImages,
      setText,
      text,
      toggleDraft,
    }),
    [alreadyAdded, drafts, images, isSaving, setDraftAccount, text, toggleDraft]
  );

  const selectedCount = drafts.filter(
    (draft) => draft.selected && !alreadyAdded.has(draft.key)
  ).length;

  const renderCloseButton = () => (
    <HeaderIconButton
      accessibilityLabel="Close"
      icon={MaterialIcons.close}
      onPress={closeCapture}
    />
  );
  const renderSaveButton = () =>
    isSaving ? (
      <ActivityIndicator />
    ) : (
      <HeaderIconButton
        accessibilityLabel="Add selected transactions"
        disabled={selectedCount === 0}
        icon={MaterialIcons.check}
        onPress={() => {
          void save();
        }}
        tintColor={colors.primary}
      />
    );

  return (
    <CaptureContext.Provider value={value}>
      <Stack
        screenOptions={{
          headerBlurEffect:
            Platform.OS === "ios"
              ? disableHeaderBlur
                ? "none"
                : "systemMaterial"
              : undefined,
          headerShadowVisible: false,
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: colors.background }
              : undefined,
          headerTransparent: Platform.OS === "ios",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerLargeTitle: false,
            ...androidHeaderOptions({
              headerLeft: renderCloseButton,
              headerRight: renderSaveButton,
            }),
            title: "Capture transaction",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Close"
                icon="xmark"
                onPress={closeCapture}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" && drafts.length > 0 ? (
            <Stack.Toolbar placement="right">
              {isSaving ? (
                <Stack.Toolbar.View>
                  <ActivityIndicator />
                </Stack.Toolbar.View>
              ) : (
                <Stack.Toolbar.Button
                  accessibilityLabel="Add selected transactions"
                  disabled={selectedCount === 0}
                  icon="checkmark"
                  onPress={() => {
                    void save();
                  }}
                  tintColor={colors.primary}
                  variant="prominent"
                />
              )}
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="account"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({
              headerLeft: renderBackButton,
            }),
            title: "Account",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
      </Stack>
    </CaptureContext.Provider>
  );
}
