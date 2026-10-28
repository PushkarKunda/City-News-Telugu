import React, { useState, useCallback } from 'react';
import { StyleProp, Text, View, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { getInitials } from '@/utils/initials';
import { isInvalidOrMockImageUrl } from '@/utils/imageResolver';

/**
 * User avatar with automatic initials fallback.
 *
 * Renders the image at `uri` when it's a valid, loadable URL; otherwise shows
 * a circular badge with the initials derived from `name`
 * ("John Doe" → "JD", Telugu names supported). Also recovers from broken
 * image URLs at runtime via onError.
 *
 * This is the single source of truth for avatar fallback behavior across the
 * app — prefer it over inline `placehold.co` URLs or hand-rolled initial logic.
 */
export interface InitialsAvatarProps {
  /** Remote avatar URL. Invalid/missing URLs fall back to initials. */
  uri?: string | null;
  /** Display name used to derive initials. */
  name?: string | null;
  /** Diameter of the avatar in dp. Default 44. */
  size?: number;
  /** Fallback circle background color. Defaults to a neutral indigo. */
  backgroundColor?: string;
  /** Fallback initials text color. Defaults to white. */
  textColor?: string;
  /** Extra style for the outer container (positioning, borders, etc.). */
  style?: StyleProp<ViewStyle>;
  /** Extra style for the initials text (fontWeight overrides, etc.). */
  textStyle?: StyleProp<TextStyle>;
  contentFit?: 'cover' | 'contain';
}

export const InitialsAvatar: React.FC<InitialsAvatarProps> = ({
  uri,
  name,
  size = 44,
  backgroundColor = '#6366F1',
  textColor = '#FFFFFF',
  style,
  textStyle,
  contentFit = 'cover',
}) => {
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(() => setFailed(true), []);

  const showImage = !failed && !isInvalidOrMockImageUrl(uri);
  const initials = getInitials(name);
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (showImage) {
    return (
      <Image
        source={{ uri: uri! }}
        style={[dimensionStyle, style] as StyleProp<ImageStyle>}
        contentFit={contentFit}
        onError={handleError}
        accessibilityLabel={name ? `${name} avatar` : 'User avatar'}
      />
    );
  }

  return (
    <View
      style={[dimensionStyle, { backgroundColor, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityLabel={name ? `${name} avatar` : 'User avatar'}
    >
      <Text
        style={[{ color: textColor, fontSize: Math.max(11, size * 0.38), fontWeight: '600' }, textStyle]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {initials}
      </Text>
    </View>
  );
};

InitialsAvatar.displayName = 'InitialsAvatar';

export default InitialsAvatar;
