import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/Spacing';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  colorScheme?: 'light' | 'dark';
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  colorScheme = 'light',
  style,
  ...props
}: ButtonProps) {
  const colors = Colors[colorScheme];
  const isDisabled = disabled || loading;

  const getBackgroundColor = (): string => {
    if (isDisabled) return colors.textTertiary;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.primaryLight;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = (): string => {
    if (isDisabled && variant !== 'outline' && variant !== 'ghost') return '#FFFFFF';
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return colors.primary;
      case 'outline':
      case 'ghost':
        return isDisabled ? colors.textTertiary : colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = (): string => {
    if (variant === 'outline') {
      return isDisabled ? colors.textTertiary : colors.border;
    }
    return 'transparent';
  };

  const getHeight = (): number => {
    switch (size) {
      case 'sm':
        return 40;
      case 'md':
        return 48;
      case 'lg':
        return 56;
      default:
        return 48;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return 14;
      case 'md':
        return 16;
      case 'lg':
        return 18;
      default:
        return 16;
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'sm':
        return 18;
      case 'md':
        return 20;
      case 'lg':
        return 22;
      default:
        return 20;
    }
  };

  const buttonStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: variant === 'outline' ? 1.5 : 0,
    height: getHeight(),
    width: fullWidth ? '100%' : 'auto',
    paddingHorizontal: fullWidth ? 0 : Spacing.lg,
  };

  const textStyle: TextStyle = {
    color: getTextColor(),
    fontSize: getFontSize(),
  };

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, style]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {leftIcon && (
            <MaterialIcons
              name={leftIcon}
              size={getIconSize()}
              color={getTextColor()}
              style={styles.leftIcon}
            />
          )}
          <Text style={[styles.text, textStyle]}>{title}</Text>
          {rightIcon && (
            <MaterialIcons
              name={rightIcon}
              size={getIconSize()}
              color={getTextColor()}
              style={styles.rightIcon}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  text: {
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  leftIcon: {
    marginRight: Spacing.xs,
  },
  rightIcon: {
    marginLeft: Spacing.xs,
  },
});