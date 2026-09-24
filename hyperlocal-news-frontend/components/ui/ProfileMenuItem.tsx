import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

interface ProfileMenuItemProps {
  iconName: keyof typeof MaterialIcons.glyphMap;
  title: string;
  badgeCount?: number;
  trailingText?: string;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

export function ProfileMenuItem({
  iconName,
  title,
  badgeCount,
  trailingText,
  isToggle,
  toggleValue,
  onToggle,
  onPress,
}: ProfileMenuItemProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={isToggle ? () => onToggle?.(!toggleValue) : onPress}
      activeOpacity={0.7}
      disabled={isToggle && !onToggle}
    >
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <MaterialIcons name={iconName} size={20} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>

      <View style={styles.rightSection}>
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        )}

        {trailingText && (
          <Text style={[styles.trailingText, { color: colors.textSecondary }]}>{trailingText}</Text>
        )}

        {isToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#fff'}
          />
        ) : (
          <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 17,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#ffdad6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  badgeText: {
    color: '#93000a',
    fontSize: 14,
    fontWeight: '500',
  },
  trailingText: {
    fontSize: 16,
    fontWeight: '400',
  },
});
