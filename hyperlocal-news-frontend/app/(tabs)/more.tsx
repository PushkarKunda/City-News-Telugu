import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { StatusBar } from 'expo-status-bar';

export default function MoreScreen() {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user, logout } = useAuthStore();
  const displayName = user?.name || 'User';
  const userHandle = user?.user_name
    ? '@' + user.user_name
    : '@' + displayName.toLowerCase().trim().replace(/\s+/g, '_');

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const sections = [
    {
      title: 'Quick Services',
      items: [
        {
          id: 'bookmarks',
          label: 'Bookmarks & Saves',
          sub: 'View all bookmarked stories',
          icon: 'bookmark-outline',
          color: '#EC4899',
          bgColor: 'rgba(236, 72, 153, 0.1)',
          route: '/(tabs)/menu-bookmarks',
        },
      ],
    },
    {
      title: 'Account & Safety',
      items: [
        {
          id: 'notifications',
          label: 'Notification Center',
          sub: 'Manage alerts and announcements',
          icon: 'notifications-outline',
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          route: '/(tabs)/notifications',
        },
        {
          id: 'settings',
          label: 'App Settings',
          sub: 'Language, location, and theme',
          icon: 'settings-outline',
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          route: '/(tabs)/settings',
        },
        {
          id: 'help',
          label: 'Help & Support',
          sub: 'Get assistance or submit feedback',
          icon: 'help-circle-outline',
          color: '#8B5CF6',
          bgColor: 'rgba(139, 92, 246, 0.1)',
          route: '/(tabs)/help',
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surfaceGlass, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>More Options</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Image
            source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }}
            style={styles.userAvatar}
          />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
              {user?.isPublisher && (
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{userHandle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Sections */}
        {sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title.toUpperCase()}
            </Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, itemIdx) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.itemRow}
                    activeOpacity={0.7}
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={[styles.iconWrapper, { backgroundColor: item.bgColor }]}>
                      <Ionicons name={item.icon as any} size={22} color={item.color} />
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                  {itemIdx < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FFF0F0',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
            },
          ]}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Safe space for tab bar
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  userHandle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1.0,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  itemSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    color: '#EF4444',
  },
});
