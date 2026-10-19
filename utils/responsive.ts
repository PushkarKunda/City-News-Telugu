/**
 * Responsive utility helpers for adapting UI to any screen size.
 * Uses Dimensions.get('window') dynamically to support multiple device sizes.
 */
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Get the current window dimensions (call at render time, not at module level,
 * so it works correctly after orientation changes).
 */
export const getWindow = () => Dimensions.get('window');

/**
 * Scale a size relative to a base screen width of 390px (iPhone 14).
 * Clamps to avoid extreme scaling on very large or very small screens.
 */
export const scaleWidth = (size: number, baseWidth = 390): number => {
  const { width } = Dimensions.get('window');
  const scale = width / baseWidth;
  const clampedScale = Math.min(Math.max(scale, 0.75), 1.4);
  return Math.round(PixelRatio.roundToNearestPixel(size * clampedScale));
};

/**
 * Scale a font size relative to a base screen width of 390px.
 * More conservative scaling than scaleWidth for readability.
 */
export const scaleFontSize = (size: number): number => {
  const { width } = Dimensions.get('window');
  const scale = width / 390;
  const clampedScale = Math.min(Math.max(scale, 0.85), 1.25);
  return Math.round(PixelRatio.roundToNearestPixel(size * clampedScale));
};

/**
 * Returns a drawer width that is at most 85% of screen width, capped at 320.
 */
export const getDrawerWidth = (): number => {
  const { width } = Dimensions.get('window');
  return Math.min(width * 0.85, 320);
};

/**
 * Returns a max content width for centered forms/cards (e.g. login screens).
 */
export const getMaxContentWidth = (base = 448): number => {
  const { width } = Dimensions.get('window');
  return Math.min(width - 32, base); // at minimum 16px padding on each side
};

/**
 * Returns horizontal padding that adapts to the screen width.
 * On narrow screens, use less padding; on wider screens, more.
 */
export const getHorizontalPadding = (): number => {
  const { width } = Dimensions.get('window');
  if (width < 360) return 12;
  if (width < 430) return 20;
  return 24;
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
