// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

// CRITICAL: WebBrowser must be before any component
import * as WebBrowser from 'expo-web-browser';
WebBrowser.maybeCompleteAuthSession();

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Appearance,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

// ─── Splash Screen ────────────────────────────────────────────────────────────
SplashScreen.preventAutoHideAsync();

// ─── React Query Client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ─── Global Text Interceptor ──────────────────────────────────────────────────
const originalTextRender = (Text as any).render;
if (originalTextRender) {
  (Text as any).render = function (props: any, ref: any) {
    let newProps = props;
    try {
      const flatStyle = props?.style ? StyleSheet.flatten(props.style) : null;
      const injectedStyle: Record<string, string> = {};

      const family = flatStyle?.fontFamily;
      if (
        !family ||
        family === 'System' ||
        family === 'sans-serif' ||
        family === 'normal'
      ) {
        const weightStr = flatStyle?.fontWeight
          ? String(flatStyle.fontWeight)
          : '';

        if (
          weightStr === 'bold' ||
          weightStr === '700' ||
          weightStr === '800' ||
          weightStr === '900'
        ) {
          injectedStyle.fontFamily = 'Poppins_700Bold';
        } else if (weightStr === '600') {
          injectedStyle.fontFamily = 'Poppins_600SemiBold';
        } else if (weightStr === '500') {
          injectedStyle.fontFamily = 'Poppins_500Medium';
        } else {
          injectedStyle.fontFamily = 'Poppins_400Regular';
        }
      }

      if (Object.keys(injectedStyle).length > 0) {
        newProps = {
          ...props,
          style: [props.style, injectedStyle],
        };
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
  const isOnboarded = useAuthStore((state) => state.isOnboarded);
  const authLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  const [isConnected, setIsConnected] = useState(true);
  const [showNetworkError, setShowNetworkError] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // ─── Font Loading ─────────────────────────────────────────────────────────
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // ─── Firebase Init ────────────────────────────────────────────────────────
  useEffect(() => {
    // ✅ FIXED: void operator so no floating promise warning
    void checkFirebaseConnection();
  }, []);

  // ─── Token Refresh Failure Handler ───────────────────────────────────────
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      console.warn('🔓 Token expired - logging out');
      // ✅ FIXED: typed catch parameter
      useAuthStore
        .getState()
        .logout()
        .catch((err: unknown) => {
          console.error('Logout error:', err);
        });
    });
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

  // ─── Theme Management ────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.theme === 'dark' || user?.theme === 'light') {
      Appearance.setColorScheme(user.theme);
    } else {
      Appearance.setColorScheme(null);
    }
  }, [user?.theme]);

  // ─── Fetch Current User Profile ───────────────────────────────────────────
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