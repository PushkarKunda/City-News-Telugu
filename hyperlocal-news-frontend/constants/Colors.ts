export type StatusBarStyle = 'dark' | 'light';

export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryGlow: string;
  background: string;
  surface: string;
  surfaceGlass: string;
  card: string;
  cardGlass: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderGlass: string;
  divider: string;
  indicator: string;
  sheet: string;
  modalOverlay: string;
  statusBar: StatusBarStyle;
}

export interface ColorsType {
  light: ColorPalette;
  dark: ColorPalette;
}

export const Colors: ColorsType = {
  light: {
    primary: '#4648D4',
    primaryLight: 'rgba(70, 72, 212, 0.1)',
    primaryGlow: 'rgba(70, 72, 212, 0.5)',
    
    background: '#F6F6F8',
    surface: '#FFFFFF',
    surfaceGlass: 'rgba(255, 255, 255, 0.88)',
    card: '#FFFFFF',
    cardGlass: 'rgba(255, 255, 255, 0.92)',
    
    text: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    
    border: '#E2E8F0',
    borderGlass: 'rgba(226, 232, 240, 0.8)',
    divider: '#F1F5F9',
    indicator: '#E2E8F0',
    sheet: '#FFFFFF',
    modalOverlay: 'rgba(15, 23, 42, 0.45)',
    
    statusBar: 'dark',
  },
  
  dark: {
    primary: '#6366F1',
    primaryLight: 'rgba(99, 102, 241, 0.18)',
    primaryGlow: 'rgba(99, 102, 241, 0.45)',
    
    background: '#0B0B14', // OLED Pure Black with subtle night depth
    surface: '#13122A', // Deep Indigo Glass surface
    surfaceGlass: 'rgba(19, 18, 42, 0.85)',
    card: '#181736', // Deep Purple/Indigo card
    cardGlass: 'rgba(24, 23, 54, 0.82)',
    
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    
    border: 'rgba(99, 102, 241, 0.22)', // Subtle indigo glass edge
    borderGlass: 'rgba(129, 140, 248, 0.28)',
    divider: 'rgba(99, 102, 241, 0.12)',
    indicator: '#6366F1',
    sheet: '#121128',
    modalOverlay: 'rgba(11, 11, 20, 0.82)',
    
    statusBar: 'light',
  },
};

export type ColorScheme = keyof typeof Colors;