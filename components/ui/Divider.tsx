import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

interface DividerProps {
  text?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  colorScheme?: 'light' | 'dark';
}

export function Divider({
  text,
  orientation = 'horizontal',
  spacing = 'md',
  style,
  colorScheme = 'light',
}: DividerProps) {
  const colors = Colors[colorScheme];

  const getSpacing = (): number => {
    switch (spacing) {
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

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          {
            backgroundColor: colors.border,
            marginHorizontal: getSpacing(),
          },
          style,
        ]}
      />
    );
  }

  if (text) {
    return (
      <View style={[styles.container, { marginVertical: getSpacing() }, style]}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.text, { color: colors.textTertiary }]}>{text}</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          backgroundColor: colors.border,
          marginVertical: getSpacing(),
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
  line: {
    flex: 1,
    height: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1,
    marginHorizontal: Spacing.md,
    textTransform: 'uppercase',
  },
});