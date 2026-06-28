import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import { Alert, FlatList, Pressable, Text, View } from "react-native";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import type { TransactionAttachmentDraft } from "@/features/finance/add-transaction-context";
import { useThemeColors } from "@/hooks/use-theme";

function imageAssetToAttachment(
  asset: ImagePicker.ImagePickerAsset
): TransactionAttachmentDraft {
  const extension = asset.mimeType?.split("/")[1] ?? "jpg";
  const name = asset.fileName ?? `photo-${Date.now()}.${extension}`;

  return {
    id: `${asset.uri}:${name}:${asset.fileSize ?? ""}`,
    mimeType: asset.mimeType ?? "image/jpeg",
    name,
    uri: asset.uri,
    ...(asset.fileSize !== undefined ? { size: asset.fileSize } : {}),
  };
}

function documentAssetToAttachment(
  asset: DocumentPicker.DocumentPickerAsset
): TransactionAttachmentDraft {
  return {
    id: `${asset.uri}:${asset.name}:${asset.size ?? ""}`,
    name: asset.name,
    uri: asset.uri,
    ...(asset.mimeType ? { mimeType: asset.mimeType } : {}),
    ...(asset.size !== undefined ? { size: asset.size } : {}),
  };
}

function attachmentIcon(mimeType?: string): string {
  if (mimeType?.startsWith("image/")) {
    return "photo";
  }
  return "doc.fill";
}

export default function TransactionAttachmentsScreen() {
  const colors = useThemeColors();
  const { addAttachments, attachments, removeAttachment } = useAddTransaction();

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
              style={{ color: colors.primary, fontSize: 17, fontWeight: "600" }}
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
              style={{ color: colors.primary, fontSize: 17, fontWeight: "600" }}
            >
              Add attachment
            </Text>
          </Pressable>
        ) : null
      }
      renderItem={({ item, index }) => (
        <View
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
          <SymbolView
            name={attachmentIcon(item.mimeType) as never}
            size={22}
            tintColor={colors.primary}
          />
          <Text
            numberOfLines={1}
            style={{ color: colors.foreground, flex: 1, fontSize: 16 }}
          >
            {item.name}
          </Text>
          <Pressable
            accessibilityLabel={`Remove ${item.name}`}
            accessibilityRole="button"
            onPress={() => removeAttachment(item.id)}
          >
            <SymbolView name="trash" size={18} tintColor={colors.negative} />
          </Pressable>
        </View>
      )}
      style={{ backgroundColor: colors.background, flex: 1 }}
    />
  );
}
