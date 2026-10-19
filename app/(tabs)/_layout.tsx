import { Tabs, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BackHandler, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isOnboarded = useAuthStore((state) => state.isOnboarded);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      if (!isAuthenticated) {
        router.replace('/(auth)/login');
      } else if (!isOnboarded) {
        router.replace('/(onboarding)/language');
      }
    }
  }, [isAuthenticated, isOnboarded, router]);

  useEffect(() => {
    const onBackPress = () => {
      // Respect actual navigation history first. Pushing extra screens here
      // (the old behavior) grew the stack and eventually hard-exited the app
      // even though the user still had screens to go back to.
      // Returning false defers to Expo Router's own back handler, which pops
      // the stack when possible.
      if (router.canGoBack()) {
        return false;
      }

      const cleanPath = pathname.replace(/^\/\(tabs\)/, '') || '/';

      // Cold-started deep links (no history to pop): land on the parent page.
      if (
        cleanPath === '/settings-language' ||
        cleanPath === '/settings-location' ||
        cleanPath === '/settings-interests'
      ) {
        router.replace('/(tabs)/settings');
        return true;
      }

      if (
        cleanPath === '/settings' ||
        cleanPath === '/menu-bookmarks' ||
        cleanPath === '/help' ||
        cleanPath === '/notifications' ||
        cleanPath === '/profile'
      ) {
        router.replace('/(tabs)/more');
        return true;
      }

      // At the root with no history: defer to default behavior so Android
      // backgrounds the app the standard way.
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [pathname, router]);

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
        name="settings-notifications"
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
