import { Stack, useRouter } from 'expo-router';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';

export default function AuthLayout() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { isAuthenticated, isOnboarded, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      if (isOnboarded) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/language');
      }
    }
  }, [isAuthenticated, isOnboarded]);



  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="verify-otp" />
    </Stack>
  );
}