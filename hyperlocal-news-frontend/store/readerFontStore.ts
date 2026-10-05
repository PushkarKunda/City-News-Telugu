import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSizeLevel = 'small' | 'medium' | 'large' | 'xlarge';

export interface FontSizeConfig {
  headlineSize: number;
  bodySize: number;
  headlineLineHeight: number;
  bodyLineHeight: number;
  label: string;
  teluguLabel: string;
  badge?: string;
}

export const FONT_SIZE_CONFIGS: Record<FontSizeLevel, FontSizeConfig> = {
  small: {
    headlineSize: 20,
    bodySize: 14,
    headlineLineHeight: 33, // 20 * 1.65 = 33
    bodyLineHeight: 25,     // 14 * 1.75 = 24.5 -> 25
    label: 'Small',
    teluguLabel: 'చిన్నది',
  },
  medium: {
    headlineSize: 22,
    bodySize: 16,
    headlineLineHeight: 36, // 22 * 1.65 = 36.3 -> 36
    bodyLineHeight: 28,     // 16 * 1.75 = 28
    label: 'Medium',
    teluguLabel: 'సాధారణం',
    badge: 'Default',
  },
  large: {
    headlineSize: 24,
    bodySize: 18,
    headlineLineHeight: 40, // 24 * 1.65 = 39.6 -> 40
    bodyLineHeight: 32,     // 18 * 1.75 = 31.5 -> 32
    label: 'Large',
    teluguLabel: 'పెద్దది',
  },
  xlarge: {
    headlineSize: 27,
    bodySize: 20,
    headlineLineHeight: 45, // 27 * 1.65 = 44.55 -> 45
    bodyLineHeight: 35,     // 20 * 1.75 = 35
    label: 'Extra Large',
    teluguLabel: 'మరింత పెద్దది',
  },
};

interface ReaderFontState {
  fontSizeLevel: FontSizeLevel;
  headlineSize: number;
  bodySize: number;
  headlineLineHeight: number;
  bodyLineHeight: number;
  isModalOpen: boolean;
  setFontSizeLevel: (level: FontSizeLevel) => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  loadSavedFontSize: () => Promise<void>;
}

const STORAGE_KEY = '@city_news_font_size_level';

export const useReaderFontStore = create<ReaderFontState>((set) => ({
  fontSizeLevel: 'medium',
  headlineSize: FONT_SIZE_CONFIGS.medium.headlineSize,
  bodySize: FONT_SIZE_CONFIGS.medium.bodySize,
  headlineLineHeight: FONT_SIZE_CONFIGS.medium.headlineLineHeight,
  bodyLineHeight: FONT_SIZE_CONFIGS.medium.bodyLineHeight,
  isModalOpen: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  setFontSizeLevel: async (level: FontSizeLevel) => {
    const config = FONT_SIZE_CONFIGS[level] || FONT_SIZE_CONFIGS.medium;
    set({
      fontSizeLevel: level,
      headlineSize: config.headlineSize,
      bodySize: config.bodySize,
      headlineLineHeight: config.headlineLineHeight,
      bodyLineHeight: config.bodyLineHeight,
    });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, level);
    } catch (_) {}
  },

  loadSavedFontSize: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        let level: FontSizeLevel = 'medium';
        // Backward compatibility for previously saved 'normal' or 'large'
        if (saved === 'normal') level = 'medium';
        else if (saved === 'small' || saved === 'medium' || saved === 'large' || saved === 'xlarge') {
          level = saved;
        }

        const config = FONT_SIZE_CONFIGS[level];
        set({
          fontSizeLevel: level,
          headlineSize: config.headlineSize,
          bodySize: config.bodySize,
          headlineLineHeight: config.headlineLineHeight,
          bodyLineHeight: config.bodyLineHeight,
        });
      }
    } catch (_) {}
  },
}));

// Automatically trigger loading on import
void useReaderFontStore.getState().loadSavedFontSize();
