import { Tabs, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { TabBar } from '@/components/TabBar';

export default function TabLayout() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isOnboarded } = useAuthStore();

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      if (!isAuthenticated) {
        router.replace('/(auth)/login');
      } else if (!isOnboarded) {
        router.replace('/(onboarding)/language');
      }
    }
  }, [isAuthenticated, isOnboarded]);

  useEffect(() => {
    const onBackPress = () => {
      const cleanPath = pathname.replace(/^\/\(tabs\)/, '') || '/';

      // Sub-pages of Settings
      if (
        cleanPath === '/settings-language' ||
        cleanPath === '/settings-location' ||
        cleanPath === '/settings-interests'
      ) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push('/(tabs)/settings');
        }
        return true;
      }

      // Sub-pages of More
      if (
        cleanPath === '/settings' ||
        cleanPath === '/menu-bookmarks' ||
        cleanPath === '/help' ||
        cleanPath === '/notifications' ||
        cleanPath === '/profile'
      ) {
        router.push('/(tabs)/more');
        return true;
      }

      // Main top-level tabs
      if (
        cleanPath === '/' ||
        cleanPath === '/posts' ||
        cleanPath === '/shorts' ||
        cleanPath === '/local' ||
        cleanPath === '/discover' ||
        cleanPath === '/more'
      ) {
        BackHandler.exitApp();
        return true; // Prevent default pop behavior
      }

      return false; // Allow standard backward pop for any other nested screens
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [pathname]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: 'Poppins_600SemiBold',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: 'Posts',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dynamic-feed" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: 'Shorts',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="play-circle-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="local"
        options={{
          title: 'Local',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="near-me" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="explore" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="more-horiz" size={24} color={color} />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="create-article"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      /> */}
      <Tabs.Screen
        name="menu-bookmarks"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="settings-interests"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="settings-language"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="settings-location"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      {/* <Tabs.Screen
        name="profile-interests"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="profile-reading-history"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      /> */}
      <Tabs.Screen
        name="help"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      {/* <Tabs.Screen
        name="events"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      /> */}
      {/* <Tabs.Screen
        name="articles"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      /> */}
      {/* <Tabs.Screen
        name="polls"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      /> */}
    </Tabs>
  );
}