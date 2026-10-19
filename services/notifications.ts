// services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { request } from './api/client';
import { API_ROUTES } from './api/routes';

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationType = 'breaking' | 'news' | 'poll' | 'comment' | 'system' | 'event' | 'alert';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  channelId?: string;
  priority?: 'high' | 'normal';
  sound?: boolean;
  badge?: number;
}

export interface DeviceTokenPayload {
  fcm_token: string;
  device_type: 'ios' | 'android';
  device_name: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  breaking_news: boolean;
  local_news: boolean;
  poll_updates: boolean;
  comments: boolean;
  events: boolean;
  system: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // "22:00"
  quiet_hours_end: string; // "07:00"
  categories: number[]; // Category IDs
}

export interface NotificationAnalytics {
  event: 'delivered' | 'opened' | 'dismissed';
  notification_id: string;
  type: NotificationType;
  timestamp: number;
  device_id: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ANDROID_CHANNELS = {
  BREAKING: {
    id: 'breaking-news',
    name: 'Breaking News',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250] as number[],
    lightColor: '#FF0000',
    bypassDnd: true,
  },
  LOCAL: {
    id: 'local-news',
    name: 'Local News',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250] as number[],
    lightColor: '#4648D4',
  },
  POLL: {
    id: 'poll-updates',
    name: 'Poll Updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 250] as number[],
    lightColor: '#4648D4',
  },
  COMMENT: {
    id: 'comment-replies',
    name: 'Comment Replies',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 250] as number[],
    lightColor: '#4648D4',
  },
  SYSTEM: {
    id: 'system-updates',
    name: 'System Updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 250] as number[],
    lightColor: '#4648D4',
  },
  EVENT: {
    id: 'events',
    name: 'Events',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 250] as number[],
    lightColor: '#4648D4',
  },
} as const;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  breaking_news: true,
  local_news: true,
  poll_updates: true,
  comments: true,
  events: true,
  system: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  categories: [],
};

// ─── State ──────────────────────────────────────────────────────────────────

let expoPushToken: string | null = null;
let currentPreferences: NotificationPreferences = { ...DEFAULT_PREFERENCES };
let isInitialized = false;

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Initialize push notifications (call once at app startup)
 */
export const initializePushNotifications = async (): Promise<boolean> => {
  if (isInitialized) return true;

  try {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Setup Android channels
    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }

    isInitialized = true;
    console.log('[PushNotifications] Initialized');
    return true;
  } catch (error: any) {
    console.error('[PushNotifications] Initialization failed:', error.message);
    return false;
  }
};

/**
 * Setup Android notification channels
 */
const setupAndroidChannels = async (): Promise<void> => {
  for (const channel of Object.values(ANDROID_CHANNELS)) {
    const channelOptions: any = {
      name: channel.name,
      importance: channel.importance,
      sound: channel.sound,
      vibrationPattern: channel.vibrationPattern,
      lightColor: channel.lightColor,
    };
    
    if ('bypassDnd' in channel && channel.bypassDnd) {
      channelOptions.bypassDnd = true;
    }
    
    await Notifications.setNotificationChannelAsync(channel.id, channelOptions);
  }
};

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (!Device.isDevice) {
      console.log('[PushNotifications] Simulators do not support push notifications');
      return false;
    }

    const existingPermissions = await Notifications.getPermissionsAsync();
    const existingStatus = (existingPermissions as any).status || (existingPermissions as any).granted;
    
    if (existingStatus !== 'granted' && existingStatus !== true) {
      const permResult = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: true,
        },
      });
      const newStatus = (permResult as any).status;
      const newGranted = (permResult as any).granted;
      
      if (newStatus !== 'granted' && !newGranted) {
        console.log('[PushNotifications] Permission denied');
        return false;
      }
    }

    console.log('[PushNotifications] Permission granted');
    return true;
  } catch (error: any) {
    console.error('[PushNotifications] Permission request failed:', error.message);
    return false;
  }
};

/**
 * Get Expo push token
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    if (expoPushToken) return expoPushToken;

    if (!Device.isDevice) {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('[PushNotifications] No EAS project ID found');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    expoPushToken = token.data;
    console.log('[PushNotifications] Token obtained:', expoPushToken.substring(0, 20) + '...');
    return expoPushToken;
  } catch (error: any) {
    console.error('[PushNotifications] Failed to get push token:', error.message);
    return null;
  }
};

/**
 * Register device token with backend
 */
export const registerDeviceToken = async (fcmToken: string): Promise<boolean> => {
  try {
    const deviceType = Platform.OS as 'ios' | 'android';
    const deviceName = Device.deviceName || Application.applicationName || 'Unknown Device';

    await request({
      url: API_ROUTES.auth.registerDevice,
      method: 'POST',
      data: {
        fcm_token: fcmToken,
        device_type: deviceType,
        device_name: deviceName,
      } as DeviceTokenPayload,
    });

    console.log('[PushNotifications] Device registered successfully');
    return true;
  } catch (error: any) {
    console.error('[PushNotifications] Device registration failed:', error.message);
    return false;
  }
};

/**
 * Unregister device token (call on logout)
 */
export const unregisterDeviceToken = async (): Promise<void> => {
  try {
    if (!expoPushToken) return;

    await request({
      url: API_ROUTES.auth.unregisterDevice,
      method: 'DELETE',
      data: {
        fcm_token: expoPushToken,
      },
    });

    expoPushToken = null;
    console.log('[PushNotifications] Device unregistered');
  } catch (error: any) {
    console.error('[PushNotifications] Device unregistration failed:', error.message);
  }
};

// ─── Preferences ────────────────────────────────────────────────────────────

/**
 * Load notification preferences from backend
 */
export const loadNotificationPreferences = async (): Promise<NotificationPreferences> => {
  try {
    const prefs = await request<NotificationPreferences>({
      url: '/user/notifications/preferences',
      method: 'GET',
    });
    currentPreferences = { ...DEFAULT_PREFERENCES, ...prefs };
    return currentPreferences;
  } catch {
    console.warn('[PushNotifications] Failed to load preferences, using defaults');
    return currentPreferences;
  }
};

/**
 * Save notification preferences to backend
 */
export const saveNotificationPreferences = async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
  try {
    currentPreferences = { ...currentPreferences, ...prefs };
    
    await request({
      url: '/user/notifications/preferences',
      method: 'PATCH',
      data: prefs,
    });

    console.log('[PushNotifications] Preferences saved');
    return true;
  } catch (error: any) {
    console.error('[PushNotifications] Failed to save preferences:', error.message);
    return false;
  }
};

/**
 * Get current preferences
 */
export const getNotificationPreferences = (): NotificationPreferences => {
  return currentPreferences;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get channel ID for notification type
 */
const getChannelId = (type: NotificationType): string => {
  switch (type) {
    case 'breaking':
      return ANDROID_CHANNELS.BREAKING.id;
    case 'news':
      return ANDROID_CHANNELS.LOCAL.id;
    case 'poll':
      return ANDROID_CHANNELS.POLL.id;
    case 'comment':
      return ANDROID_CHANNELS.COMMENT.id;
    case 'event':
      return ANDROID_CHANNELS.EVENT.id;
    case 'system':
    default:
      return ANDROID_CHANNELS.SYSTEM.id;
  }
};

/**
 * Check if notification type is enabled in preferences
 */
export const isTypeEnabled = (type: NotificationType): boolean => {
  switch (type) {
    case 'breaking':
      return currentPreferences.breaking_news;
    case 'news':
      return currentPreferences.local_news;
    case 'poll':
      return currentPreferences.poll_updates;
    case 'comment':
      return currentPreferences.comments;
    case 'event':
      return currentPreferences.events;
    case 'system':
      return currentPreferences.system;
    default:
      return true;
  }
};

/**
 * Check if quiet hours are active
 */
export const isQuietHoursActive = (): boolean => {
  if (!currentPreferences.quiet_hours_enabled) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const [startHour, startMin] = currentPreferences.quiet_hours_start.split(':').map(Number);
  const [endHour, endMin] = currentPreferences.quiet_hours_end.split(':').map(Number);

  const currentMinutes = currentTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const currentTotal = currentMinutes[0] * 60 + currentMinutes[1];

  if (startMinutes <= endMinutes) {
    return currentTotal >= startMinutes && currentTotal < endMinutes;
  } else {
    // Quiet hours span midnight
    return currentTotal >= startMinutes || currentTotal < endMinutes;
  }
};

// ─── Analytics ──────────────────────────────────────────────────────────────

/**
 * Track notification analytics event
 */
export const trackNotificationEvent = async (
  event: 'delivered' | 'opened' | 'dismissed',
  notification: Notifications.Notification
): Promise<void> => {
  try {
    const data = notification.request.content.data as Record<string, any>;
    
    const analytics: NotificationAnalytics = {
      event,
      notification_id: notification.request.identifier,
      type: data?.type || 'system',
      timestamp: Date.now(),
      device_id: expoPushToken || 'unknown',
    };

    // Fire and forget - don't await to avoid blocking notification handling
    request({
      url: '/user/notifications/analytics',
      method: 'POST',
      data: analytics,
    }).catch(() => {});
  } catch {
    // Silently fail - analytics should never block UX
  }
};

// ─── Local Notifications (Testing) ──────────────────────────────────────────

/**
 * Schedule a local notification for testing
 */
export const scheduleTestNotification = async (payload: NotificationPayload): Promise<string | null> => {
  try {
    const channelId = payload.channelId || getChannelId(payload.type);
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound !== false,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: { seconds: 2 } as any,
    });

    return identifier;
  } catch (error: any) {
    console.error('[PushNotifications] Failed to schedule test notification:', error.message);
    return null;
  }
};

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Open notification settings with proper error handling and fallback
 */
export const openNotificationSettings = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Try to open app notification settings
      const canOpen = await Linking.canOpenURL('app-settings:');
      if (canOpen) {
        await Linking.openURL('app-settings:');
        return true;
      }
      // Fallback: Open general settings
      const canOpenSettings = await Linking.canOpenURL('App-Prefs:');
      if (canOpenSettings) {
        await Linking.openURL('App-Prefs:');
        return true;
      }
      throw new Error('Cannot open iOS settings');
    } else {
      // Android: Open app settings page
      await Linking.openSettings();
      return true;
    }
  } catch (error: any) {
    console.error('[PushNotifications] Failed to open settings:', error.message);
    return false;
  }
};

/**
 * Open app notification settings directly (alternative method)
 */
export const openAppNotificationSettings = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      // iOS 15+ can open notification settings directly
      const url = 'app-settings:';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    }
    
    // Fallback: Open general app settings
    return await openNotificationSettings();
  } catch (error: any) {
    console.error('[PushNotifications] Failed to open app notification settings:', error.message);
    return false;
  }
};

/**
 * Clear all notifications from notification center
 */
export const clearAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error: any) {
    console.error('[PushNotifications] Failed to clear notifications:', error.message);
  }
};

/**
 * Get badge count
 */
export const getBadgeCount = async (): Promise<number> => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch {
    return 0;
  }
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error: any) {
    console.warn('[PushNotifications] Failed to set badge count:', error.message);
  }
};

// ─── Full Setup Flow ────────────────────────────────────────────────────────

/**
 * Complete push notification setup (call after authentication)
 */
export const setupPushNotifications = async (): Promise<{
  permissionGranted: boolean;
  tokenRegistered: boolean;
}> => {
  try {
    // 1. Initialize
    await initializePushNotifications();

    // 2. Request permissions
    const permissionGranted = await requestNotificationPermissions();
    if (!permissionGranted) {
      return { permissionGranted: false, tokenRegistered: false };
    }

    // 3. Get Expo push token
    const token = await getExpoPushToken();
    if (!token) {
      return { permissionGranted: true, tokenRegistered: false };
    }

    // 4. Register with backend
    const tokenRegistered = await registerDeviceToken(token);

    // 5. Load preferences
    await loadNotificationPreferences();

    return { permissionGranted, tokenRegistered };
  } catch (error: any) {
    console.error('[PushNotifications] Setup failed:', error.message);
    return { permissionGranted: false, tokenRegistered: false };
  }
};

// ─── Cleanup ────────────────────────────────────────────────────────────────

/**
 * Cleanup push notifications (call on logout)
 */
export const cleanupPushNotifications = async (): Promise<void> => {
  try {
    await unregisterDeviceToken();
    await clearAllNotifications();
    expoPushToken = null;
    isInitialized = false;
  } catch (error: any) {
    console.error('[PushNotifications] Cleanup failed:', error.message);
  }
};

// ─── Exports ────────────────────────────────────────────────────────────────

export default {
  initializePushNotifications,
  requestNotificationPermissions,
  getExpoPushToken,
  registerDeviceToken,
  unregisterDeviceToken,
  loadNotificationPreferences,
  saveNotificationPreferences,
  getNotificationPreferences,
  isTypeEnabled,
  isQuietHoursActive,
  trackNotificationEvent,
  scheduleTestNotification,
  openNotificationSettings,
  openAppNotificationSettings,
  clearAllNotifications,
  getBadgeCount,
  setBadgeCount,
  setupPushNotifications,
  cleanupPushNotifications,
};