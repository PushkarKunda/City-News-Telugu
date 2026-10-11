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

  const theme = useAuthStore((state) => state.user?.theme);

  const activeTheme = 
    theme === 'dark' ? 'dark' : 
    theme === 'light' ? 'light' : 
    systemColorScheme;

  return activeTheme || 'light';
}
