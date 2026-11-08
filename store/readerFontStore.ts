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
    headlineSize: 17,
    bodySize: 13.5,
    headlineLineHeight: 25,
    bodyLineHeight: 22,
    label: 'Small',
    teluguLabel: 'చిన్నది',
    badge: 'Default',
  },
  medium: {
    headlineSize: 19,
    bodySize: 15,
    headlineLineHeight: 28,
    bodyLineHeight: 24,
    label: 'Medium',
    teluguLabel: 'సాధారణం',
  },
  large: {
    headlineSize: 21,
    bodySize: 16.5,
    headlineLineHeight: 31,
    bodyLineHeight: 26,
    label: 'Large',
    teluguLabel: 'పెద్దది',
  },
  xlarge: {
    headlineSize: 23,
    bodySize: 18,
    headlineLineHeight: 34,
    bodyLineHeight: 28,
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
  fontSizeLevel: 'small',
  headlineSize: FONT_SIZE_CONFIGS.small.headlineSize,
  bodySize: FONT_SIZE_CONFIGS.small.bodySize,
  headlineLineHeight: FONT_SIZE_CONFIGS.small.headlineLineHeight,
  bodyLineHeight: FONT_SIZE_CONFIGS.small.bodyLineHeight,
  isModalOpen: false,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  setFontSizeLevel: async (level: FontSizeLevel) => {
    const config = FONT_SIZE_CONFIGS[level] || FONT_SIZE_CONFIGS.small;
    set({
      fontSizeLevel: level,
      headlineSize: config.headlineSize,
      bodySize: config.bodySize,
      headlineLineHeight: config.headlineLineHeight,
      bodyLineHeight: config.bodyLineHeight,
    });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, level);
    } catch {}
  },

  loadSavedFontSize: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        let level: FontSizeLevel = 'small';
        // Backward compatibility for previously saved 'normal' or 'large'
        if (saved === 'normal') level = 'small';
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
    } catch {}
  },
}));

// Automatically trigger loading on import
void useReaderFontStore.getState().loadSavedFontSize();
