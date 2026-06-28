import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';

import {
  useAddTransaction,
  type TransactionAttachmentDraft,
} from '@/features/finance/add-transaction-context';
import { useThemeColors } from '@/hooks/use-theme';

function imageAssetToAttachment(asset: ImagePicker.ImagePickerAsset): TransactionAttachmentDraft {
  const extension = asset.mimeType?.split('/')[1] ?? 'jpg';
  const name = asset.fileName ?? `photo-${Date.now()}.${extension}`;

  return {
    id: `${asset.uri}:${name}:${asset.fileSize ?? ''}`,
    uri: asset.uri,
    name,
    mimeType: asset.mimeType ?? 'image/jpeg',
    ...(asset.fileSize !== undefined ? { size: asset.fileSize } : {}),
  };
}

function documentAssetToAttachment(
  asset: DocumentPicker.DocumentPickerAsset
): TransactionAttachmentDraft {
  return {
    id: `${asset.uri}:${asset.name}:${asset.size ?? ''}`,
    uri: asset.uri,
    name: asset.name,
    ...(asset.mimeType ? { mimeType: asset.mimeType } : {}),
    ...(asset.size !== undefined ? { size: asset.size } : {}),
  };
}

function attachmentIcon(mimeType?: string): string {
  if (mimeType?.startsWith('image/')) return 'photo';
  return 'doc.fill';
}

export default function TransactionAttachmentsScreen() {
  const colors = useThemeColors();
  const { addAttachments, attachments, removeAttachment } = useAddTransaction();

  const pickFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow photo library access to choose photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled) return;

      addAttachments(result.assets.map(imageAssetToAttachment));
    } catch {
      Alert.alert('Could not select photos', 'Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow camera access to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled) return;

      addAttachments(result.assets.map(imageAssetToAttachment));
    } catch {
      Alert.alert('Could not take photo', 'Please try again.');
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: '*/*',
      });
      if (result.canceled) return;

      addAttachments(result.assets.map(documentAssetToAttachment));
    } catch {
      Alert.alert('Could not select attachments', 'Please try again.');
    }
  };

  const showAttachmentMenu = () => {
    Alert.alert('Add attachment', 'Choose a source', [
      { text: 'Photo Library', onPress: () => void pickFromLibrary() },
      { text: 'Take Photo', onPress: () => void takePhoto() },
      { text: 'Choose File', onPress: () => void pickDocuments() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}
      data={attachments}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
          <SymbolView name="paperclip" size={32} tintColor={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 17 }}>No attachments selected</Text>
          <Pressable accessibilityRole="button" onPress={showAttachmentMenu}>
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>Add attachment</Text>
          </Pressable>
        </View>
      }
      ListHeaderComponent={
        attachments.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={showAttachmentMenu}
            style={{ minHeight: 58, justifyContent: 'center', paddingHorizontal: 16 }}>
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>Add attachment</Text>
          </Pressable>
        ) : null
      }
      renderItem={({ item, index }) => (
        <View
          style={{
            minHeight: 62,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderBottomColor: colors.border,
            borderBottomWidth: index === attachments.length - 1 ? 0 : 1,
            paddingHorizontal: 16,
          }}>
          <SymbolView name={attachmentIcon(item.mimeType) as never} size={22} tintColor={colors.primary} />
          <Text numberOfLines={1} style={{ flex: 1, color: colors.foreground, fontSize: 16 }}>
            {item.name}
          </Text>
          <Pressable
            accessibilityLabel={`Remove ${item.name}`}
            accessibilityRole="button"
            onPress={() => removeAttachment(item.id)}>
            <SymbolView name="trash" size={18} tintColor={colors.negative} />
          </Pressable>
        </View>
      )}
      style={{ flex: 1, backgroundColor: colors.background }}
    />
  );
}
