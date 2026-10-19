import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/Spacing';

type BadgeVariant = 'filled' | 'outlined' | 'subtle';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
  colorScheme?: 'light' | 'dark';
}

export function Badge({
  label,
  variant = 'subtle',
  size = 'sm',
  color,
  icon,
  style,
  textStyle,
  colorScheme = 'light',
}: BadgeProps) {
  const colors = Colors[colorScheme];
  const badgeColor = color || colors.primary;

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'filled':
        return badgeColor;
      case 'outlined':
        return 'transparent';
      case 'subtle':
        return badgeColor + '15'; // 15% opacity
      default:
        return badgeColor + '15';
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'filled':
        return '#FFFFFF';
      case 'outlined':
      case 'subtle':
        return badgeColor;
      default:
        return badgeColor;
    }
  };

  const getBorderColor = (): string => {
    return variant === 'outlined' ? badgeColor : 'transparent';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingHorizontal: Spacing.sm, paddingVertical: 2 };
      case 'md':
        return { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs };
      default:
        return { paddingHorizontal: Spacing.sm, paddingVertical: 2 };
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return 10;
      case 'md':
        return 12;
      default:
        return 10;
    }
  };

  const badgeStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: variant === 'outlined' ? 1 : 0,
    ...getPadding(),
  };

  const labelStyle: TextStyle = {
    color: getTextColor(),
    fontSize: getFontSize(),
  };

  return (
    <View style={[styles.badge, badgeStyle, style]}>
      {icon && (
        <MaterialIcons
          name={icon}
          size={getFontSize() + 2}
          color={getTextColor()}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, labelStyle, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});