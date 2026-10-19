import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Notification } from '@/services/api/notifications';
import { formatTimeAgo } from '@/utils/formatters';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'alert': return 'warning';
    case 'news': return 'article';
    case 'system': return 'info';
    default: return 'notifications';
  }
};

const getColorForType = (type: string, colors: any) => {
  switch (type) {
    case 'alert': return '#EF4444';
    case 'news': return colors.primary;
    case 'system': return colors.textSecondary;
    default: return colors.primary;
  }
};

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const iconName = getIconForType(notification.type);
  const iconColor = getColorForType(notification.type, colors);
  const formattedTime = formatTimeAgo(notification.created_at);

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: notification.is_read ? colors.surface : colors.primaryLight }
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <MaterialIcons name={iconName as any} size={24} color={iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.time, { color: colors.textTertiary }]}>
            {formattedTime}
          </Text>
        </View>
        <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>

      {!notification.is_read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
    marginLeft: 8,
  },
});