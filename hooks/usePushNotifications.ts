// hooks/usePushNotifications.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/store/authStore';
import {
  setupPushNotifications,
  cleanupPushNotifications,
  loadNotificationPreferences,
  saveNotificationPreferences,
  trackNotificationEvent,
  setBadgeCount,
  NotificationPreferences,
} from '@/services/notifications';
import { notificationsApi } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UsePushNotificationsReturn {
  isInitialized: boolean;
  hasPermission: boolean;
  isRegistered: boolean;
  preferences: NotificationPreferences;
  isLoadingPreferences: boolean;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<boolean>;
  refreshBadgeCount: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const appState = useRef(AppState.currentState);

  // Setup on authentication
  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      if (!isAuthenticated) {
        // Cleanup on logout
        if (isInitialized) {
          await cleanupPushNotifications();
          setIsInitialized(false);
          setIsRegistered(false);
          setPreferences(null);
        }
        return;
      }

      setIsLoadingPreferences(true);
      const result = await setupPushNotifications();
      
      if (isMounted) {
        setIsInitialized(true);
        setHasPermission(result.permissionGranted);
        setIsRegistered(result.tokenRegistered);
        setIsLoadingPreferences(false);
      }

      // Load preferences after setup
      if (result.permissionGranted) {
        const prefs = await loadNotificationPreferences();
        if (isMounted) {
          setPreferences(prefs);
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Notification response handler (deep linking)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      const type = (data?.type as string) || 'system';
      const targetId = (data?.id || data?.news_uid || data?.poll_uid || data?.post_uid) as string | undefined;

      // Track open event
      await trackNotificationEvent('opened', response.notification);

      // Update badge count
      await refreshBadgeCount();

      // Navigate based on notification type
      if (targetId || data?.route) {
        handleNotificationNavigation(type, data, targetId);
      }
    });

    return () => subscription.remove();
  }, []);

  // Foreground notification handler
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
      // Track delivered event
      await trackNotificationEvent('delivered', notification);
      
      // Update badge count
      await refreshBadgeCount();
    });

    return () => subscription.remove();
  }, []);

  // Handle app state changes (refresh badge on foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        refreshBadgeCount();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  // ─── Navigation Handler ──────────────────────────────────────────────

  const handleNotificationNavigation = useCallback(
    async (type: string, data: Record<string, any>, targetId?: string) => {
      const router = require('expo-router').useRouter();
      
      // Import router dynamically to avoid circular dependencies
      
      switch (type) {
        case 'breaking':
        case 'news':
          if (targetId) {
            router.push(`/news/${targetId}`);
          }
          break;
        case 'poll':
          if (targetId) {
            router.push(`/(tabs)?poll=${targetId}`);
          } else {
            router.push('/(tabs)');
          }
          break;
        case 'comment':
          if (data?.news_uid) {
            router.push(`/news/${data.news_uid}?comments=1`);
          }
          break;
        case 'event':
          if (targetId) {
            router.push(`/(tabs)/local?event=${targetId}`);
          }
          break;
        case 'system':
          if (data?.route) {
            router.push(data.route);
          } else {
            router.push('/(tabs)/notifications');
          }
          break;
        default:
          router.push('/(tabs)/notifications');
      }
    },
    []
  );

  // ─── Preference Updates ──────────────────────────────────────────────

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
      setIsLoadingPreferences(true);
      const success = await saveNotificationPreferences(prefs);
      
      if (success) {
        setPreferences((prev) => (prev ? { ...prev, ...prefs } : null));
      }
      
      setIsLoadingPreferences(false);
      return success;
    },
    []
  );

  // ─── Badge Count ─────────────────────────────────────────────────────

  const refreshBadgeCount = useCallback(async () => {
    try {
      const { count } = await notificationsApi.getUnreadCount();
      await setBadgeCount(count);
    } catch {
      // Silently fail
    }
  }, []);

  return {
    isInitialized,
    hasPermission,
    isRegistered,
    preferences: preferences || ({} as NotificationPreferences),
    isLoadingPreferences,
    updatePreferences,
    refreshBadgeCount,
  };
}

// ─── Export ─────────────────────────────────────────────────────────────────

export default usePushNotifications;