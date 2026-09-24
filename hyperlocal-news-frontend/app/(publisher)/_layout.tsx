import { Stack } from 'expo-router';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Colors } from '@/constants/Colors';

export default function PublisherLayout() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
