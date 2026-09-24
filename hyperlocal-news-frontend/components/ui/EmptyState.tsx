import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  colorScheme?: 'light' | 'dark';
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  style,
  colorScheme = 'light',
}: EmptyStateProps) {
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
        <MaterialIcons name={icon} size={48} color={colors.textTertiary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <Button
            title={actionLabel}
            onPress={onAction}
            variant="primary"
            size="md"
            fullWidth={false}
            colorScheme={colorScheme}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  actionContainer: {
    marginTop: Spacing.lg,
  },
});