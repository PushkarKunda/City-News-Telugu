import { Stack, useRouter, usePathname } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

export default function OnboardingLayout() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isOnboarded, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (isOnboarded) {
      if (pathname.includes('edit-profile')) {
        return;
      }
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isOnboarded]);

  if (!isAuthenticated) {
    return null;
  }

  if (isOnboarded) {
    if (pathname.includes('edit-profile')) {
      // Allow rendering the profile screen to verify Google identity
    } else {
      return null;
    }
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="language" />
      <Stack.Screen name="location" />
      <Stack.Screen name="districts" />
      <Stack.Screen name="cities" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="setup-feed" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
