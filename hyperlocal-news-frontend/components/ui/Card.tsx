import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable, PressableProps } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, Shadows } from '@/constants/Spacing';

interface CardProps {
  children: ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  colorScheme?: 'light' | 'dark';
  onPress?: PressableProps['onPress'];
}

export function Card({
  children,
  variant = 'elevated',
  padding = 'md',
  borderRadius = 'xl',
  style,
  colorScheme = 'light',
  onPress,
}: CardProps) {
  const colors = Colors[colorScheme];

  const getPadding = (): number => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return Spacing.sm;
      case 'md':
        return Spacing.md;
      case 'lg':
        return Spacing.lg;
      default:
        return Spacing.md;
    }
  };

  const getBorderRadius = (): number => {
    switch (borderRadius) {
      case 'sm':
        return BorderRadius.sm;
      case 'md':
        return BorderRadius.md;
      case 'lg':
        return BorderRadius.lg;
      case 'xl':
        return BorderRadius.xl;
      default:
        return BorderRadius.xl;
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          ...Shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'filled':
        return {
          backgroundColor: colors.background,
        };
      default:
        return {
          backgroundColor: colors.surface,
        };
    }
  };

  const cardStyle: ViewStyle = {
    ...getVariantStyle(),
    padding: getPadding(),
    borderRadius: getBorderRadius(),
  };

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          cardStyle,
          pressed && styles.pressed,
          style,
        ]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});