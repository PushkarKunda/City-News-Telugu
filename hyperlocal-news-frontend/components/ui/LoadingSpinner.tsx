import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  text?: string;
  fullScreen?: boolean;
  color?: string;
  style?: ViewStyle;
  colorScheme?: 'light' | 'dark';
}

export function LoadingSpinner({
  size = 'large',
  text,
  fullScreen = false,
  color,
  style,
  colorScheme = 'light',
}: LoadingSpinnerProps) {
  const colors = Colors[colorScheme];
  const spinnerColor = color || colors.primary;

  if (fullScreen) {
    return (
      <View
        style={[
          styles.fullScreen,
          { backgroundColor: colors.background },
          style,
        ]}
      >
        <ActivityIndicator size={size} color={spinnerColor} />
        {text && (
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            {text}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {text && (
        <Text style={[styles.text, { color: colors.textSecondary }]}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: Spacing.md,
  },
});