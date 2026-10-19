import { Platform } from 'react-native';

export const TELUGU_FONT_STACK = {
  regular: Platform.select({
    web: "'Noto Sans Telugu', NotoSansTelugu_400Regular, 'Noto Sans', system-ui, sans-serif",
    default: 'NotoSansTelugu_400Regular',
  }),
  semiBold: Platform.select({
    web: "'Noto Sans Telugu', NotoSansTelugu_600SemiBold, 'Noto Sans', system-ui, sans-serif",
    default: 'NotoSansTelugu_600SemiBold',
  }),
  bold: Platform.select({
    web: "'Noto Sans Telugu', NotoSansTelugu_700Bold, 'Noto Sans', system-ui, sans-serif",
    default: 'NotoSansTelugu_700Bold',
  }),
};

export const TELUGU_TYPOGRAPHY = {
  headlineMultiplier: 1.65,
  bodyMultiplier: 1.75,
  matraPaddingVertical: 4,
};

export const Typography = {
  fonts: {
    // Body / Interface (Poppins)
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
    
    // Display / Headings (Poppins)
    displayRegular: 'Poppins_400Regular',
    displayMedium: 'Poppins_500Medium',
    displaySemiBold: 'Poppins_600SemiBold',
    displayBold: 'Poppins_700Bold',

    // Telugu Content (Noto Sans Telugu)
    teluguRegular: TELUGU_FONT_STACK.regular,
    teluguSemiBold: TELUGU_FONT_STACK.semiBold,
    teluguBold: TELUGU_FONT_STACK.bold,
  },
  
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
};