import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, FlatList, Modal, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Icon as SymbolView } from "@/components/icon";
import { ZoomableImage } from "@/components/zoomable-image";
import { useAddTransaction } from "@/features/finance/add-transaction-context";
import type { TransactionAttachmentDraft } from "@/features/finance/add-transaction-context";
import { useThemeColors } from "@/hooks/use-theme";

function imageAssetToAttachment(
  asset: ImagePicker.ImagePickerAsset
): TransactionAttachmentDraft {
  const extension = asset.mimeType?.split("/")[1] ?? "jpg";
  const name = asset.fileName ?? `photo-${Date.now()}.${extension}`;
  const size =
    typeof asset.fileSize === "number" && Number.isFinite(asset.fileSize)
      ? asset.fileSize
      : undefined;

  return {
    id: `${asset.uri}:${name}:${size ?? ""}`,
    mimeType: asset.mimeType ?? "image/jpeg",
    name,
    uri: asset.uri,
    ...(size !== undefined ? { size } : {}),
  };
}

function documentAssetToAttachment(
  asset: DocumentPicker.DocumentPickerAsset
): TransactionAttachmentDraft {
  const size =
    typeof asset.size === "number" && Number.isFinite(asset.size)
      ? asset.size
      : undefined;

  return {
    id: `${asset.uri}:${asset.name}:${size ?? ""}`,
    name: asset.name,
    uri: asset.uri,
    ...(asset.mimeType ? { mimeType: asset.mimeType } : {}),
    ...(size !== undefined ? { size } : {}),
  };
}

function attachmentIcon(mimeType?: string): string {
  if (mimeType?.startsWith("image/")) {
    return "photo";
  }
  return "doc.fill";
}

function isImageAttachment(attachment: TransactionAttachmentDraft): boolean {
  if (attachment.mimeType?.startsWith("image/")) {
    return true;
  }
  return /\.(?:png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(attachment.name);
}

function isRemoteUri(uri: string): boolean {
  return /^https?:/i.test(uri);
}

export default function TransactionAttachmentsScreen() {
  const colors = useThemeColors();
  const { addAttachments, attachments, removeAttachment } = useAddTransaction();
  const [preview, setPreview] = useState<TransactionAttachmentDraft | null>(
    null
  );

  const openExternal = (attachment: TransactionAttachmentDraft) => {
    if (!isRemoteUri(attachment.uri)) {
      return;
    }
    void WebBrowser.openBrowserAsync(attachment.uri);
  };

  const openAttachment = (attachment: TransactionAttachmentDraft) => {
    if (isImageAttachment(attachment) || !isRemoteUri(attachment.uri)) {
      setPreview(attachment);
      return;
    }
    void WebBrowser.openBrowserAsync(attachment.uri);
  };

  const pickFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Allow photo library access to choose photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) {
        return;
      }

      addAttachments(result.assets.map(imageAssetToAttachment));
    } catch {
      Alert.alert("Could not select photos", "Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Allow camera access to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) {
        return;
      }

      addAttachments(result.assets.map(imageAssetToAttachment));
    } catch {
      Alert.alert("Could not take photo", "Please try again.");
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: "*/*",
      });
      if (result.canceled) {
        return;
      }

      addAttachments(result.assets.map(documentAssetToAttachment));
    } catch {
      Alert.alert("Could not select attachments", "Please try again.");
    }
  };

  const showAttachmentMenu = () => {
    Alert.alert("Add attachment", "Choose a source", [
      { onPress: () => void pickFromLibrary(), text: "Photo Library" },
      { onPress: () => void takePhoto(), text: "Take Photo" },
      { onPress: () => void pickDocuments(), text: "Choose File" },
      { style: "cancel", text: "Cancel" },
    ]);
  };

  return (
    <>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        data={attachments}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              flex: 1,
              gap: 14,
              justifyContent: "center",
              padding: 32,
            }}
          >
            <SymbolView name="paperclip" size={32} tintColor={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 17 }}>
              No attachments selected
            </Text>
            <Pressable accessibilityRole="button" onPress={showAttachmentMenu}>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 17,
                  fontWeight: "600",
                }}
              >
                Add attachment
              </Text>
            </Pressable>
          </View>
        }
        ListHeaderComponent={
          attachments.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={showAttachmentMenu}
              style={{
                justifyContent: "center",
                minHeight: 58,
                paddingHorizontal: 16,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 17,
                  fontWeight: "600",
                }}
              >
                Add attachment
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityLabel={`View ${item.name}`}
            accessibilityRole="button"
            onPress={() => openAttachment(item)}
            style={{
              alignItems: "center",
              borderBottomColor: colors.border,
              borderBottomWidth: index === attachments.length - 1 ? 0 : 1,
              flexDirection: "row",
              gap: 14,
              minHeight: 62,
              paddingHorizontal: 16,
            }}
          >
            {isImageAttachment(item) ? (
              <Image
                contentFit="cover"
                source={{ uri: item.uri }}
                style={{ borderRadius: 6, height: 34, width: 34 }}
              />
            ) : (
              <SymbolView
                name={attachmentIcon(item.mimeType) as never}
                size={22}
                tintColor={colors.primary}
              />
            )}
            <Text
              numberOfLines={1}
              style={{ color: colors.foreground, flex: 1, fontSize: 16 }}
            >
              {item.name}
            </Text>
            <SymbolView
              name="chevron.right"
              size={14}
              tintColor={colors.muted}
            />
            <Pressable
              accessibilityLabel={`Remove ${item.name}`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => removeAttachment(item.id)}
            >
              <SymbolView name="trash" size={18} tintColor={colors.negative} />
            </Pressable>
          </Pressable>
        )}
        style={{ backgroundColor: colors.background, flex: 1 }}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setPreview(null)}
        transparent
        visible={preview !== null}
      >
        <GestureHandlerRootView
          style={{ backgroundColor: "rgba(0,0,0,0.94)", flex: 1 }}
        >
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: 16,
              paddingHorizontal: 20,
              paddingTop: 64,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: "#fff",
                flex: 1,
                fontSize: 17,
                fontWeight: "600",
              }}
            >
              {preview?.name}
            </Text>
            <Pressable
              accessibilityLabel="Close preview"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setPreview(null)}
            >
              <SymbolView name="xmark" size={22} tintColor="#fff" />
            </Pressable>
          </View>

          {preview && isImageAttachment(preview) ? (
            <ZoomableImage key={preview.id} uri={preview.uri} />
          ) : (
            <View
              style={{
                alignItems: "center",
                flex: 1,
                gap: 14,
                justifyContent: "center",
                padding: 32,
              }}
            >
              <SymbolView
                name={attachmentIcon(preview?.mimeType) as never}
                size={44}
                tintColor="#fff"
              />
              <Text style={{ color: "#fff", fontSize: 17 }}>
                {preview?.name}
              </Text>
              {preview && isRemoteUri(preview.uri) ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openExternal(preview)}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 17,
                      fontWeight: "600",
                    }}
                  >
                    Open
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
