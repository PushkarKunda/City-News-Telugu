import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { BorderRadius, Shadows } from '@/constants/Spacing';

type IconButtonVariant = 'filled' | 'outlined' | 'ghost';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends TouchableOpacityProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  loading?: boolean;
  elevated?: boolean;
  colorScheme?: 'light' | 'dark';
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  color,
  loading = false,
  elevated = false,
  colorScheme = 'light',
  disabled,
  style,
  ...props
}: IconButtonProps) {
  const colors = Colors[colorScheme];
  const iconColor = color || colors.textSecondary;

  const getSize = (): number => {
    switch (size) {
      case 'sm':
        return 36;
      case 'md':
        return 44;
      case 'lg':
        return 52;
      default:
        return 44;
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'sm':
        return 20;
      case 'md':
        return 24;
      case 'lg':
        return 28;
      default:
        return 24;
    }
  };

  const getBackgroundColor = (): string => {
    if (disabled) return colors.background;
    switch (variant) {
      case 'filled':
        return colors.primary;
      case 'outlined':
        return 'transparent';
      case 'ghost':
        return 'transparent';
      default:
        return 'transparent';
    }
  };

  const getIconColor = (): string => {
    if (disabled) return colors.textTertiary;
    if (variant === 'filled') return '#FFFFFF';
    return iconColor;
  };

  const buttonStyle: ViewStyle = {
    width: getSize(),
    height: getSize(),
    backgroundColor: getBackgroundColor(),
    borderWidth: variant === 'outlined' ? 1.5 : 0,
    borderColor: variant === 'outlined' ? colors.border : 'transparent',
    ...(elevated && Shadows.md),
  };

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIconColor()} />
      ) : (
        <MaterialIcons name={icon} size={getIconSize()} color={getIconColor()} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
});