import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { normalizeFirstName, useLocalProfile } from '@/features/finance/use-local-profile';
import { useThemeColors } from '@/hooks/use-theme';
import { useAppLock } from '@/providers/app-lock-provider';

function getDisabledReason(
  capability: ReturnType<typeof useAppLock>['capability'],
  isEnabled: boolean
) {
  if (process.env.EXPO_OS === 'web') {
    return 'App Lock is available on iOS and Android devices.';
  }

  if (!capability) {
    return 'Checking device authentication...';
  }

  if (!capability.hasHardware) {
    return 'This device does not support biometric authentication.';
  }

  if (!capability.isEnrolled && !isEnabled) {
    return `Set up ${capability.label} in system settings to enable App Lock.`;
  }

  return null;
}

function getAuthErrorMessage(reason: 'cancelled' | 'not_available' | 'not_enrolled' | 'failed' | 'unknown') {
  switch (reason) {
    case 'cancelled':
      return 'Authentication was cancelled. App Lock was not changed.';
    case 'not_available':
      return 'Device authentication is not available right now.';
    case 'not_enrolled':
      return 'Set up device authentication in system settings before enabling App Lock.';
    case 'failed':
      return 'Authentication failed. Try again.';
    default:
      return 'Balanced could not verify your identity. Try again.';
  }
}

export default function YouScreen() {
  const colors = useThemeColors();
  const { firstName: savedLocalFirstName, isLoadingProfile, setFirstName: saveFirstName } = useLocalProfile();
  const { capability, errorMessage, isEnabled, isHydrating, refreshCapability, setEnabled, unlock } = useAppLock();
  const [draftFirstName, setDraftFirstName] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const disabledReason = getDisabledReason(capability, isEnabled);
  const isSwitchDisabled = isHydrating || isUpdating || Boolean(disabledReason);
  const detail = capability?.canAuthenticate
    ? `Use ${capability.label} or your device passcode to unlock Balanced.`
    : (disabledReason ?? 'Use device authentication to unlock Balanced.');
  const savedFirstName = savedLocalFirstName;
  const firstName = draftFirstName ?? savedFirstName;
  const normalizedFirstName = normalizeFirstName(firstName);
  const hasProfileChanges =
    !isLoadingProfile && draftFirstName !== null && normalizedFirstName !== savedFirstName;

  async function handleSaveProfile() {
    if (!hasProfileChanges || isSavingProfile) {
      return;
    }

    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      await saveFirstName(firstName);
      setDraftFirstName(null);
      setProfileMessage('Profile saved.');
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Could not save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleValueChange(nextEnabled: boolean) {
    setLocalMessage(null);
    setIsUpdating(true);

    const nextCapability = await refreshCapability();

    if (!nextCapability.canAuthenticate) {
      setLocalMessage(
        nextCapability.hasHardware
          ? `Set up ${nextCapability.label} in system settings before enabling App Lock.`
          : 'This device does not support biometric authentication.'
      );
      setIsUpdating(false);
      return;
    }

    const result = await unlock(nextEnabled ? 'Enable App Lock' : 'Disable App Lock');

    if (result.ok) {
      await setEnabled(nextEnabled);
      setLocalMessage(nextEnabled ? 'App Lock is on.' : 'App Lock is off.');
    } else {
      setLocalMessage(getAuthErrorMessage(result.reason));
    }

    setIsUpdating(false);
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ gap: 24, paddingHorizontal: 20, paddingBottom: 40 }}
      contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3">
        <ThemedText type="smallBold">Profile</ThemedText>
        <View
          className="overflow-hidden rounded-[22px] bg-card"
          style={{
            borderCurve: 'continuous',
            borderColor: colors.border,
            borderWidth: 1,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}>
          <View className="flex-row items-center gap-3 p-4">
            <View
              className="items-center justify-center rounded-2xl bg-selected"
              style={{ width: 44, height: 44, borderCurve: 'continuous' }}>
              <SymbolView name="person.crop.circle.fill" size={24} tintColor={colors.muted} />
            </View>
            <View className="flex-1 gap-1">
              <ThemedText>Name</ThemedText>
              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoadingProfile && !isSavingProfile}
                maxLength={40}
                onChangeText={(value) => {
                  setDraftFirstName(value);
                  setProfileMessage(null);
                }}
                onSubmitEditing={() => {
                  void handleSaveProfile();
                }}
                placeholder="Optional"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                style={{
                  color: colors.foreground,
                  fontSize: 17,
                  minHeight: 34,
                  padding: 0,
                }}
                value={firstName}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!hasProfileChanges || isSavingProfile}
              onPress={() => {
                void handleSaveProfile();
              }}
              style={({ pressed }) => ({
                minHeight: 36,
                minWidth: 64,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 18,
                backgroundColor: colors.primary,
                opacity: pressed || !hasProfileChanges || isSavingProfile ? 0.45 : 1,
                paddingHorizontal: 14,
              })}>
              {isSavingProfile ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                  Save
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
        {profileMessage ? (
          <ThemedText color={profileMessage === 'Profile saved.' ? 'positive' : 'muted'} selectable type="small">
            {profileMessage}
          </ThemedText>
        ) : null}
      </View>

      <View className="gap-3">
        <ThemedText type="smallBold">Security</ThemedText>
        <View
          className="overflow-hidden rounded-[22px] bg-card"
          style={{
            borderCurve: 'continuous',
            borderColor: colors.border,
            borderWidth: 1,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}>
          <View className="flex-row items-center gap-3 p-4">
            <View
              className="items-center justify-center rounded-2xl bg-selected"
              style={{ width: 44, height: 44, borderCurve: 'continuous' }}>
              <SymbolView name="lock.shield.fill" size={24} tintColor={colors.primary} />
            </View>
            <View className="flex-1 gap-1">
              <ThemedText>App Lock</ThemedText>
              <ThemedText color="muted" selectable type="small">
                {detail}
              </ThemedText>
            </View>
            {isUpdating ? <ActivityIndicator color={colors.primary} /> : null}
            <Switch
              disabled={isSwitchDisabled}
              onValueChange={handleValueChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              value={isEnabled}
            />
          </View>
        </View>
        {localMessage || errorMessage || disabledReason ? (
          <ThemedText color={localMessage?.includes('on.') ? 'positive' : 'muted'} selectable type="small">
            {localMessage ?? errorMessage ?? disabledReason}
          </ThemedText>
        ) : null}
      </View>
    </ScrollView>
  );
}
