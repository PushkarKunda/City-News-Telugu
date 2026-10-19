import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Spacing';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { scheduleTestNotification, openNotificationSettings } from '@/services/notifications';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
  color?: string;
}

// ─── Components ─────────────────────────────────────────────────────────────

const SettingItem = ({ icon, title, description, value, onToggle, disabled, color }: SettingItemProps) => {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {description && (
          <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: (color || colors.primary) + '40' }}
        thumbColor={value ? (color || colors.primary) : colors.textTertiary}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
};

const SectionHeader = ({ title }: { title: string }) => {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function NotificationSettingsScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const {
    hasPermission,
    preferences,
    isLoadingPreferences,
    updatePreferences,
  } = usePushNotifications();

  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleToggle = async (key: keyof typeof localPreferences, value: boolean) => {
    const updated = { ...localPreferences, [key]: value };
    setLocalPreferences(updated);
    
    // Debounce save
    setIsSaving(true);
    await updatePreferences({ [key]: value });
    setIsSaving(false);
  };

  const handleTestNotification = async () => {
    const identifier = await scheduleTestNotification({
      type: 'system',
      title: 'Test Notification 🔔',
      body: 'This is a test from City News Telugu. Your notifications are working!',
      data: { test: true },
      sound: true,
    });

    if (identifier) {
      Alert.alert('Success', 'Test notification scheduled! It will appear in 2 seconds.');
    } else {
      Alert.alert('Error', 'Failed to schedule test notification.');
    }
  };

  const handleOpenSystemSettings = async () => {
    const success = await openNotificationSettings();
    if (!success) {
      Alert.alert(
        'Cannot Open Settings',
        'Unable to open system settings. Please navigate to your device Settings app and find City News Telugu to manage notification permissions manually.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Try Again', onPress: () => handleOpenSystemSettings() }
        ]
      );
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────

  if (isLoadingPreferences || !localPreferences) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <LoadingSpinner fullScreen text="Loading settings..." colorScheme={colorScheme ?? 'light'} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notification Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Permission Warning */}
        {!hasPermission && (
          <View style={[styles.warningCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="warning" size={24} color="#F59E0B" />
            <View style={styles.warningTextContainer}>
              <Text style={[styles.warningTitle, { color: '#92400E' }]}>Notifications Disabled</Text>
              <Text style={[styles.warningDescription, { color: '#92400E' }]}>
                You've disabled notifications for City News Telugu in system settings. Enable them to receive local news alerts.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.warningButton, { backgroundColor: '#F59E0B' }]}
              onPress={handleOpenSystemSettings}
            >
              <Text style={styles.warningButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Master Toggle */}
        <View style={[styles.masterToggleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem
            icon={
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="notifications" size={24} color={colors.primary} />
              </View>
            }
            title="Push Notifications"
            description="Receive real-time updates from your community"
            value={localPreferences.enabled}
            onToggle={(v) => handleToggle('enabled', v)}
          />
        </View>

        {/* Notification Types */}
        <SectionHeader title="NOTIFICATION TYPES" />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem
            icon={
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <MaterialIcons name="newspaper" size={20} color="#EF4444" />
              </View>
            }
            title="Breaking News"
            description="Urgent and important stories"
            value={localPreferences.breaking_news}
            onToggle={(v) => handleToggle('breaking_news', v)}
            color="#EF4444"
            disabled={!localPreferences.enabled}
          />
          <SettingItem
            icon={
              <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="location" size={20} color="#22C55E" />
              </View>
            }
            title="Local News"
            description="Updates from your district and city"
            value={localPreferences.local_news}
            onToggle={(v) => handleToggle('local_news', v)}
            color="#22C55E"
            disabled={!localPreferences.enabled}
          />
          <SettingItem
            icon={
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Feather name="bar-chart-2" size={20} color={colors.primary} />
              </View>
            }
            title="Poll Updates"
            description="New polls and voting results"
            value={localPreferences.poll_updates}
            onToggle={(v) => handleToggle('poll_updates', v)}
            disabled={!localPreferences.enabled}
          />
          <SettingItem
            icon={
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="chatbubble" size={20} color="#F59E0B" />
              </View>
            }
            title="Comments & Replies"
            description="When someone replies to your posts"
            value={localPreferences.comments}
            onToggle={(v) => handleToggle('comments', v)}
            color="#F59E0B"
            disabled={!localPreferences.enabled}
          />
          <SettingItem
            icon={
              <View style={[styles.iconCircle, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="calendar" size={20} color="#6366F1" />
              </View>
            }
            title="Events"
            description="Local events and gatherings"
            value={localPreferences.events}
            onToggle={(v) => handleToggle('events', v)}
            color="#6366F1"
            disabled={!localPreferences.enabled}
          />
          <SettingItem
            icon={
              <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="information-circle" size={20} color="#64748B" />
              </View>
            }
            title="System Updates"
            description="App updates and announcements"
            value={localPreferences.system}
            onToggle={(v) => handleToggle('system', v)}
            color="#64748B"
            disabled={!localPreferences.enabled}
          />
        </View>

        {/* Quiet Hours */}
        <SectionHeader title="QUIET HOURS" />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem
            icon={
              <View style={[styles.iconCircle, { backgroundColor: '#1E293B' }]}>
                <Ionicons name="moon" size={20} color="#818CF8" />
              </View>
            }
            title="Do Not Disturb"
            description="Silence notifications during set hours"
            value={localPreferences.quiet_hours_enabled}
            onToggle={(v) => handleToggle('quiet_hours_enabled', v)}
            disabled={!localPreferences.enabled}
          />

          {localPreferences.quiet_hours_enabled && (
            <View style={styles.timePickerContainer}>
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Start Time</Text>
                <TouchableOpacity
                  style={[styles.timeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    // In a full implementation, show a time picker here
                    Alert.alert('Time Picker', 'Time picker would open here. Current: ' + localPreferences.quiet_hours_start);
                  }}
                >
                  <Text style={[styles.timeValue, { color: colors.text }]}>{localPreferences.quiet_hours_start}</Text>
                  <Feather name="clock" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>End Time</Text>
                <TouchableOpacity
                  style={[styles.timeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    Alert.alert('Time Picker', 'Time picker would open here. Current: ' + localPreferences.quiet_hours_end);
                  }}
                >
                  <Text style={[styles.timeValue, { color: colors.text }]}>{localPreferences.quiet_hours_end}</Text>
                  <Feather name="clock" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Test & Info */}
        <SectionHeader title="TEST & INFO" />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionItem, { borderBottomColor: colors.border }]}
            onPress={handleTestNotification}
          >
            <View style={styles.settingIcon}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="send" size={20} color="#6366F1" />
              </View>
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Send Test Notification</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Verify notifications are working
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, { borderBottomWidth: 0 }]}
            onPress={handleOpenSystemSettings}
          >
            <View style={styles.settingIcon}>
              <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Feather name="settings" size={20} color="#64748B" />
              </View>
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>System Settings</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Manage notification permissions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Saving Indicator */}
        {isSaving && (
          <View style={styles.savingContainer}>
            <LoadingSpinner size="small" colorScheme={colorScheme ?? 'light'} />
            <Text style={[styles.savingText, { color: colors.textSecondary }]}>Saving...</Text>
          </View>
        )}

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Notification preferences sync across all your devices
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 8,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  warningDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
  warningButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  masterToggleCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: 'Poppins_700Bold',
    marginLeft: 4,
    marginBottom: 8,
    marginTop: 8,
  },
  section: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  timePickerContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 8,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  savingText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
});