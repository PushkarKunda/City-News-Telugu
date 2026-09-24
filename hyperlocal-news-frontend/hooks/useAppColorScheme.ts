import { useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { useAuthStore } from '@/store/authStore';

export function useAppColorScheme() {
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const { user } = useAuthStore();

  const activeTheme = 
    user?.theme === 'dark' ? 'dark' : 
    user?.theme === 'light' ? 'light' : 
    systemColorScheme;

  return activeTheme || 'light';
}
