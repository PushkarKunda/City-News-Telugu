import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

export default function SettingsScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const { user, logout, updateTheme } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const darkModeEnabled = colorScheme === 'dark';

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of HyperLocal?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  };



  const displayName = user?.name || 'Complete Profile';
  const displayPhone = user?.phoneNumber || user?.phone || 'Setup Phone';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Background Gradient Blurs */}
      <View style={styles.purpleBlur} />
      <View style={styles.tealBlur} />

      {/* Symmetrical Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerLeftButton}
          onPress={() => router.push('/(tabs)/more')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Bento Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ACCOUNT</Text>
          <View style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              {/* Double Bordered Linear Gradient Avatar */}
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#4648D4', '#86F2E4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradient}
                >
                  <View style={[styles.avatarInner, { borderColor: colors.card, justifyContent: 'center', alignItems: 'center', backgroundColor: darkModeEnabled ? colors.surface : '#EFF4FF' }]}>
                    {user?.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person" size={32} color={colors.primary} />
                    )}
                  </View>
                </LinearGradient>

                {/* Verified Check Badge */}
                {user?.isPublisher && (
                  <View style={[styles.verifiedBadge, { borderColor: colors.card }]}>
                    <Ionicons name="checkmark-sharp" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.profileDetails}>
                <Text style={[styles.profileName, { color: colors.text }]}>{displayName}</Text>
                <Text style={[styles.profilePhone, { color: colors.textSecondary }]}>{displayPhone}</Text>
                {user?.email ? (
                  <Text style={[styles.profilePhone, { color: colors.textSecondary, fontSize: 12, marginTop: 2 }]}>{user.email}</Text>
                ) : null}

                <View style={styles.premiumBadgeContainer}>
                  {user?.isPublisher ? (
                    <View style={[styles.publisherBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 4 }]}>
                      <Ionicons name="shield-checkmark" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.publisherBadgeText, { color: colors.primary, fontSize: 10, fontWeight: '800' }]}>Publisher</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.publisherVerifyButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4 }]}
                      onPress={() => router.push('/(onboarding)/edit-profile')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="shield-checkmark" size={10} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.publisherVerifyButtonText, { color: colors.primary, fontWeight: '700', fontSize: 9 }]}>Get Verified to Publish</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.editProfileButton, { backgroundColor: colors.primaryLight }]}
                activeOpacity={0.7}
                onPress={() => router.push('/(onboarding)/edit-profile')}
              >
                <MaterialIcons name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Preferences Bento Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>PREFERENCES</Text>
          <View style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

            {/* Language */}
            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/settings-language' as any)}
            >
              <View style={styles.settingLabelContainer}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(225, 29, 72, 0.08)' }]}>
                  <Ionicons name="language-outline" size={20} color="#E11D48" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Language</Text>
              </View>
              <View style={styles.settingValueContainer}>
                {/* <Text style={[styles.settingValue, { color: colors.primary }]}>{user?.language_name}</Text> */}
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Location */}
            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/settings-location' as any)}
            >
              <View style={styles.settingLabelContainer}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 106, 97, 0.08)' }]}>
                  <Ionicons name="location-outline" size={20} color="#006A61" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Location</Text>
              </View>
              <View style={styles.settingValueContainer}>
                {/* <Text style={[styles.settingValue, { color: colors.primary }]}>{user?.state_name}</Text> */}
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Interests */}
            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/settings-interests' as any)}
            >
              <View style={styles.settingLabelContainer}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
                  <Ionicons name="heart-outline" size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Interests</Text>
              </View>
              <View style={styles.settingValueContainer}>
                {/* <Text style={[styles.settingValue, { color: colors.primary }]}>
                  {user?.category_ids?.length} topics
                </Text> */}
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>

          </View>
        </View>

        {/* Appearance Bento Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>APPEARANCE</Text>
          <View style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Dark Mode Switch */}
            <View style={styles.settingItem}>
              <View style={styles.settingLabelContainer}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="moon-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={(val) => updateTheme(val ? 'dark' : 'light')}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={darkModeEnabled ? colors.primary : '#F1F5F9'}
              />
            </View>

          </View>
        </View>

        {/* About Bento Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ABOUT</Text>
          <View style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Privacy Policy */}
            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingLabelContainer}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(70, 69, 84, 0.08)' }]}>
                  <Ionicons name="document-text-outline" size={20} color="#464554" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Terms of Service */}
            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingLabelContainer}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(70, 69, 84, 0.08)' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#464554" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Rate Us */}
            <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingLabelContainer}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(217, 119, 6, 0.08)' }]}>
                  <Ionicons name="star-outline" size={20} color="#D97706" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Rate Us</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* App Version */}
            <View style={styles.settingItem}>
              <View style={styles.settingLabelContainer}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(70, 69, 84, 0.08)' }]}>
                  <Ionicons name="information-circle-outline" size={20} color="#464554" />
                </View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>App Version</Text>
              </View>
              <Text style={[styles.versionText, { color: colors.textSecondary }]}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="exit-outline" size={20} color="#FFFFFF" style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  purpleBlur: {
    position: 'absolute',
    right: -39,
    top: -98,
    width: 156,
    height: 393.59,
    borderRadius: 9999,
    backgroundColor: 'rgba(70, 72, 212, 0.04)',
    zIndex: -1,
  },
  tealBlur: {
    position: 'absolute',
    left: -19.5,
    bottom: -49.19,
    width: 117,
    height: 295.19,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 106, 97, 0.04)',
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerLeftButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(70, 72, 212, 0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#767586',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(199, 196, 215, 0.3)',
    overflow: 'hidden',
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
    width: 68,
    height: 68,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#006A61',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.2,
  },
  profilePhone: {
    fontSize: 13,
    color: '#767586',
    fontFamily: 'Poppins_500Medium',
  },
  premiumBadgeContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  premiumBadge: {
    backgroundColor: '#86F2E4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  premiumBadgeText: {
    color: '#006F66',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(70, 72, 212, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 56,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4648D4',
    fontFamily: 'Poppins_700Bold',
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#767586',
    fontFamily: 'Poppins_500Medium',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(199, 196, 215, 0.2)',
    marginHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ba1a1a',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    elevation: 4,
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
  },
  publisherBadge: {
    backgroundColor: '#006A61',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  publisherBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  publisherVerifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  publisherVerifyButtonText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
