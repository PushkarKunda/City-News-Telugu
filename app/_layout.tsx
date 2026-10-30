// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  NotoSansTelugu_400Regular,
  NotoSansTelugu_600SemiBold,
  NotoSansTelugu_700Bold,
} from '@expo-google-fonts/noto-sans-telugu';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

// CRITICAL: WebBrowser must be before any component
import * as WebBrowser from 'expo-web-browser';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  Platform,
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  Feather,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ✅ CRITICAL: Firebase imports before usage
import '@react-native-firebase/app';
import '@react-native-firebase/auth';

// ✅ FIXED: Named import (not default)
import { checkFirebaseConnection } from '@/services/firebase';

import { useAuthStore } from '@/store/authStore';
import { useStore } from '@/store/useStore';
import { setOnUnauthorizedCallback } from '@/services/api/client';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Colors } from '@/constants/Colors';
import { useRealtimeReconciliation } from '@/hooks/useRealtimeReconciliation';
import { bindQueryFocus } from '@/services/queryFocus';
import { bindSessionCache, queryClient } from '@/services/queryClient';
WebBrowser.maybeCompleteAuthSession();

// ─── Splash Screen ────────────────────────────────────────────────────────────
SplashScreen.preventAutoHideAsync();

// ─── Global Text Interceptor ──────────────────────────────────────────────────
// Fast path: most <Text> nodes in the app explicitly set Poppins/Telugu in
// their style. For those we skip ALL work (previously every Text render paid
// a StyleSheet.flatten + object allocation on the JS thread — expensive on
// low-end Android). Only nodes with an unset/system fontFamily are patched.
const originalTextRender = (Text as any).render;
if (originalTextRender) {
  (Text as any).render = function (props: any, ref: any) {
    let newProps = props;
    try {
      const style = props?.style;
      if (style) {
        // Scan the (possibly nested) style array WITHOUT StyleSheet.flatten,
        // which merges styles into a new object on every render.
        const list = Array.isArray(style) ? style.flat(Infinity) : [style];
        let family: string | undefined;
        let weight: string | undefined;
        for (let i = list.length - 1; i >= 0; i--) {
          const s = list[i];
          if (s == null || typeof s !== 'object') continue;
          if (family === undefined && s.fontFamily !== undefined) family = s.fontFamily;
          if (weight === undefined && s.fontWeight !== undefined) weight = String(s.fontWeight);
          if (family !== undefined && weight !== undefined) break;
        }

        // Only patch when the effective font family is unset/system, i.e.
        // nodes that deliberately set Poppins or Telugu escape for free.
        const needsFamily =
          !family ||
          family === 'System' ||
          family === 'sans-serif' ||
          family === 'normal';
        if (needsFamily) {
          const injectedStyle: Record<string, string> = {
            fontFamily:
              weight === 'bold' ||
              weight === '700' ||
              weight === '800' ||
              weight === '900'
                ? 'Poppins_700Bold'
                : weight === '600'
                  ? 'Poppins_600SemiBold'
                  : weight === '500'
                    ? 'Poppins_500Medium'
                    : 'Poppins_400Regular',
          };
          newProps = {
            ...props,
            style: [props.style, injectedStyle],
          };
        }
      }
    } catch (e) {
      console.warn('⚠️ Text interceptor error:', e);
    }
    return originalTextRender.call(this, newProps, ref);
  };
}

// ─── Realtime Setup ───────────────────────────────────────────────────────────
function RealtimeInitializer({ children }: { children: React.ReactNode }) {
  useRealtimeReconciliation();
  return <>{children}</>;
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // ✅ Zustand selectors (avoid full store destructuring)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const [isConnected, setIsConnected] = useState(true);
  const [showNetworkError, setShowNetworkError] = useState(false);
  const [, setAppReady] = useState(false);

  // ─── Font Loading ─────────────────────────────────────────────────────────
  // Icon fonts are preloaded here (each set's `.font` map is keyed exactly as
  // the icon components expect) so glyphs render on first paint. Without this
  // each <Ionicons>/<MaterialIcons> mounts with an empty Text placeholder and
  // waits for its own async Font.loadAsync — if that stalls, icons render
  // blank while labels still show.
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    NotoSansTelugu_400Regular,
    NotoSansTelugu_600SemiBold,
    NotoSansTelugu_700Bold,
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...Feather.font,
    ...MaterialCommunityIcons.font,
    // FontAwesome5Free registers per-style families
    'FontAwesome5Free-Regular': require(
      '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'
    ),
    'FontAwesome5Free-Solid': require(
      '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'
    ),
    'FontAwesome5Free-Brand': require(
      '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf'
    ),
  });

  // ─── Firebase Init ────────────────────────────────────────────────────────
  useEffect(() => {
    // Web already uses document visibility; native apps need AppState.
    if (Platform.OS === 'web') return;
    return bindQueryFocus(AppState, focusManager);
  }, []);

  useEffect(() => {
    // ✅ FIXED: void operator so no floating promise warning
    void checkFirebaseConnection();
  }, []);

  // ─── Token Refresh Failure Handler ───────────────────────────────────────
  useEffect(() => {
    const unsubscribe = bindSessionCache(useAuthStore);
    setOnUnauthorizedCallback(() => {
      void useAuthStore.getState().expireSession();
    });
    return () => {
      unsubscribe();
      setOnUnauthorizedCallback(null);
    };
  }, []);

  // ─── Network Monitoring ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const connected = netState.isConnected ?? true;
      setIsConnected(connected);
      setShowNetworkError(!connected);
    });
    return () => unsubscribe();
  }, []);

  // ─── Fetch Current User Profile & Sync Provider ──────────────────────────
  useEffect(() => {
    void useAuthStore.getState().fetchUser();
  }, []);

  // ─── User Store Sync ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && user) {
      useStore.getState().setUser(user);
    } else {
      useStore.getState().setUser(null);
    }
  }, [isAuthenticated, user]);

  // ─── Hide Splash Screen ──────────────────────────────────────────────────
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => { });
      setAppReady(true);
    }
  }, [fontsLoaded, fontError]);

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // ─── Main Navigation ──────────────────────────────────────────────────────
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RealtimeInitializer>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar
              style={isDark ? 'light' : 'dark'}
              translucent
              backgroundColor="transparent"
            />

            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />

              {/* ✅ FIXED: Use animation prop not animationEnabled */}
              <Stack.Screen
                name="news/[id]"
                options={{
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="(publisher)"
                options={{
                  animation: 'slide_from_right',
                }}
              />
            </Stack>

            {/* Offline Network Warning Banner */}
            {showNetworkError && !isConnected && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.centerContainer,
                  { backgroundColor: colors.background },
                ]}
              >
                <View style={styles.centerContent}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Ionicons name="cloud-offline" size={56} color={colors.primary} />
                  </View>
                  <Text style={[styles.errorTitle, { color: colors.text }]}>
                    No Internet Connection
                  </Text>
                  <Text
                    style={[styles.errorMessage, { color: colors.textSecondary }]}
                  >
                    Please check your network and try again.
                  </Text>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      NetInfo.fetch().then((netState) => {
                        if (netState.isConnected) {
                          setShowNetworkError(false);
                        }
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.retryText}>Retry Connection</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </GestureHandlerRootView>
        </RealtimeInitializer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerContent: {
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    width: '100%',
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  loadingCard: {
    padding: 48,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
});
