// services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  device_name?: string;
  app_version?: string;
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

const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';
const DEVICE_TOKEN_STORAGE_KEY = '@citynews/device-push-token';
const PREFERENCES_STORAGE_KEY = '@citynews/notification-preferences';

const ANDROID_CHANNELS = {
  DEFAULT: {
    id: 'default',
    name: 'General',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250] as number[],
    lightColor: '#4648D4',
  },
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

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
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

let devicePushToken: string | null = null;
let currentPreferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
let isInitialized = false;
let tokenRefreshSubscription: ReturnType<typeof Notifications.addPushTokenListener> | null = null;

// Show notifications while the app is in the foreground. This has to be
// configured before the first notification is delivered, so do it at import
// time rather than waiting for the authenticated setup flow.
if (IS_NATIVE) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Initialize push notifications (call once at app startup)
 */
export const initializePushNotifications = async (): Promise<boolean> => {
  if (!IS_NATIVE) return false;
  if (isInitialized) return true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Channels must exist before permission is requested on Android 13+.
    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }

    isInitialized = true;
    return true;
  } catch (error: any) {
    console.error('[PushNotifications] Initialization failed:', error?.message);
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
    if (!IS_NATIVE || !Device.isDevice) {
      return false;
    }

    const existingPermissions = await Notifications.getPermissionsAsync();
    const existingGranted =
      existingPermissions.granted || existingPermissions.status === 'granted';

    if (!existingGranted) {
      const permResult = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          provideAppNotificationSettings: true,
        },
      });

      if (!permResult.granted && permResult.status !== 'granted') {
        return false;
      }
    }

    return true;
  } catch (error: any) {
    console.error('[PushNotifications] Permission request failed:', error?.message);
    return false;
  }
};

/**
 * Get the native device push token.
 *
 * The backend sends notifications through Firebase Cloud Messaging, so it
 * needs the native FCM token — NOT an Expo push token
 * (`ExponentPushToken[...]`, which only works with the Expo Push API).
 *
 * On Android this is the FCM registration token. On iOS this is the APNs
 * token (Firebase/APNs must be configured for that token to be accepted).
 */
export const getDevicePushToken = async (): Promise<string | null> => {
  if (devicePushToken) return devicePushToken;

  if (!IS_NATIVE || !Device.isDevice) {
    return null;
  }

  try {
    const token = await Notifications.getDevicePushTokenAsync();
    if (typeof token.data !== 'string' || !token.data) {
      console.warn('[PushNotifications] Native push token was empty');
      return null;
    }

    devicePushToken = token.data;
    return devicePushToken;
  } catch (error: any) {
    console.error('[PushNotifications] Failed to get device push token:', error?.message);
    return null;
  }
};

/**
 * Register device token with backend
 */
export const registerDeviceToken = async (fcmToken: string): Promise<boolean> => {
  try {
    const deviceType = Platform.OS as 'ios' | 'android';
    const deviceName =
      Device.deviceName || Device.modelName || Application.applicationName || 'Unknown Device';
    const appVersion =
      Application.nativeApplicationVersion || Constants.expoConfig?.version || undefined;

    await request({
      url: API_ROUTES.auth.registerDevice,
      method: 'POST',
      data: {
        fcm_token: fcmToken,
        device_type: deviceType,
        device_name: deviceName,
        app_version: appVersion,
      } as DeviceTokenPayload,
    });

    devicePushToken = fcmToken;
    await AsyncStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, fcmToken);

    return true;
  } catch (error: any) {
    console.error('[PushNotifications] Device registration failed:', error?.message);
    return false;
  }
};

/**
 * Unregister device token (call on logout)
 */
export const unregisterDeviceToken = async (): Promise<void> => {
  try {
    const token =
      devicePushToken ||
      (await AsyncStorage.getItem(DEVICE_TOKEN_STORAGE_KEY));

    if (!token) return;

    await request({
      url: API_ROUTES.auth.unregisterDevice,
      method: 'DELETE',
      data: {
        fcm_token: token,
      },
    });

    devicePushToken = null;
    await AsyncStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
  } catch (error: any) {
    console.error('[PushNotifications] Device unregistration failed:', error?.message);
  }
};

/**
 * Re-register whenever Android/iOS rotates the push token.
 */
const ensureTokenRefreshListener = (): void => {
  if (!IS_NATIVE || tokenRefreshSubscription) return;

  tokenRefreshSubscription = Notifications.addPushTokenListener((token) => {
    if (typeof token.data !== 'string' || !token.data) return;

    devicePushToken = token.data;
    void registerDeviceToken(token.data);
  });
};

const removeTokenRefreshListener = (): void => {
  tokenRefreshSubscription?.remove();
  tokenRefreshSubscription = null;
};

// ─── Preferences ────────────────────────────────────────────────────────────

/**
 * Load notification preferences.
 *
 * The backend currently exposes no preferences endpoint, so preferences are
 * persisted locally on the device. This keeps the settings screen functional
 * without firing repeated 404s.
 */
export const loadNotificationPreferences = async (): Promise<NotificationPreferences> => {
  try {
    const stored = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
      currentPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed };
    }
  } catch {
    console.warn('[PushNotifications] Failed to load preferences, using defaults');
  }

  return currentPreferences;
};

/**
 * Save notification preferences locally.
 */
export const saveNotificationPreferences = async (
  prefs: Partial<NotificationPreferences>
): Promise<boolean> => {
  try {
    currentPreferences = { ...currentPreferences, ...prefs };
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(currentPreferences));

    return true;
  } catch (error: any) {
    console.error('[PushNotifications] Failed to save preferences:', error?.message);
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
 * Track notification analytics event.
 *
 * The backend does not expose a notification analytics endpoint yet, so this
 * stays a no-op instead of sending requests that would 404.
 */
export const trackNotificationEvent = async (
  _event: 'delivered' | 'opened' | 'dismissed',
  _notification: Notifications.Notification
): Promise<void> => {
  // Intentionally left as a no-op until the backend exposes analytics.
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
    console.error('[PushNotifications] Failed to open settings:', error?.message);
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
    console.error('[PushNotifications] Failed to open app notification settings:', error?.message);
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
    console.error('[PushNotifications] Failed to clear notifications:', error?.message);
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
    console.warn('[PushNotifications] Failed to set badge count:', error?.message);
  }
};

// ─── Full Setup Flow ────────────────────────────────────────────────────────

export interface PushSetupResult {
  permissionGranted: boolean;
  tokenRegistered: boolean;
}

let setupInFlight: Promise<PushSetupResult> | null = null;

const performSetup = async (): Promise<PushSetupResult> => {
  // 1. Initialize (handler + Android channels)
  await initializePushNotifications();

  // 2. Request permissions
  const permissionGranted = await requestNotificationPermissions();
  if (!permissionGranted) {
    return { permissionGranted: false, tokenRegistered: false };
  }

  // 3. Get the native FCM/APNs token the backend expects
  const token = await getDevicePushToken();
  if (!token) {
    return { permissionGranted: true, tokenRegistered: false };
  }

  // 4. Register with backend
  const tokenRegistered = await registerDeviceToken(token);

  // 5. Keep the backend in sync if the token rotates while the app runs
  ensureTokenRefreshListener();

  // 6. Load locally cached preferences
  await loadNotificationPreferences();

  return { permissionGranted, tokenRegistered };
};

/**
 * Complete push notification setup (call after authentication)
 */
export const setupPushNotifications = async (): Promise<PushSetupResult> => {
  // Multiple screens may ask for setup at the same time; share one request.
  if (setupInFlight) return setupInFlight;

  setupInFlight = performSetup()
    .catch((error: any) => {
      console.error('[PushNotifications] Setup failed:', error?.message);
      return { permissionGranted: false, tokenRegistered: false };
    })
    .finally(() => {
      setupInFlight = null;
    });

  return setupInFlight;
};

// ─── Cleanup ────────────────────────────────────────────────────────────────

/**
 * Cleanup push notifications (call on logout)
 */
export const cleanupPushNotifications = async (): Promise<void> => {
  try {
    removeTokenRefreshListener();
    await unregisterDeviceToken();
    await clearAllNotifications();
    devicePushToken = null;
    isInitialized = false;
  } catch (error: any) {
    console.error('[PushNotifications] Cleanup failed:', error?.message);
  }
};

// ─── Exports ────────────────────────────────────────────────────────────────

export default {
  initializePushNotifications,
  requestNotificationPermissions,
  getDevicePushToken,
  registerDeviceToken,
  unregisterDeviceToken,
  loadNotificationPreferences,
  saveNotificationPreferences,
  getNotificationPreferences,
  isTypeEnabled,
  isQuietHoursActive,
  trackNotificationEvent,
  openNotificationSettings,
  openAppNotificationSettings,
  clearAllNotifications,
  getBadgeCount,
  setBadgeCount,
  setupPushNotifications,
  cleanupPushNotifications,
};
