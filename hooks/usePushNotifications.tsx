// hooks/usePushNotifications.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  setupPushNotifications,
  cleanupPushNotifications,
  initializePushNotifications,
  loadNotificationPreferences,
  saveNotificationPreferences,
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

const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

// Keep this outside React state so a provider remount (Fast Refresh, dev
// StrictMode) can never navigate to the same notification twice.
const handledResponses = new Set<string>();

// ─── Helpers ────────────────────────────────────────────────────────────────

const readPermission = async (): Promise<boolean> => {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    return permissions.granted || permissions.status === 'granted';
  } catch {
    return false;
  }
};

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
};

const navigateTo = (target: string): void => {
  if (/^https?:\/\//i.test(target)) {
    void Linking.openURL(target).catch(() => {});
    return;
  }

  router.push((target.startsWith('/') ? target : `/${target}`) as any);
};

/**
 * Resolve the most useful destination from a notification payload.
 */
const resolveNotificationTarget = (data: Record<string, any>): string => {
  const type = firstString(data.type, data.notification_type)?.toLowerCase() ?? '';
  const newsUid = firstString(data.news_uid, data.newsUid, data.news_id, data.newsId);
  const pollUid = firstString(data.poll_uid, data.pollUid, data.poll_id, data.pollId);
  const postUid = firstString(data.post_uid, data.postUid, data.post_id, data.postId);
  const eventUid = firstString(data.event_uid, data.eventUid, data.event_id, data.eventId);
  const explicitRoute = firstString(data.route, data.path);
  const linkUrl = firstString(data.link_url, data.linkUrl, data.url);

  // An explicit in-app route always wins.
  if (explicitRoute) return explicitRoute;

  switch (type) {
    case 'comment':
      if (newsUid) return `/news/${newsUid}?comments=1`;
      break;
    case 'poll':
      return pollUid ? `/(tabs)?poll=${pollUid}` : '/(tabs)';
    case 'event':
      return eventUid ? `/(tabs)/local?event=${eventUid}` : '/(tabs)/local';
    case 'post':
      return '/(tabs)/posts';
    case 'breaking':
    case 'news':
    case 'alert':
      if (newsUid) return `/news/${newsUid}`;
      break;
    case 'system':
      if (linkUrl) return linkUrl;
      return '/(tabs)/notifications';
    default:
      break;
  }

  if (newsUid) return `/news/${newsUid}`;
  if (postUid) return '/(tabs)/posts';
  if (pollUid) return `/(tabs)?poll=${pollUid}`;
  if (eventUid) return `/(tabs)/local?event=${eventUid}`;
  if (linkUrl) return linkUrl;

  return '/(tabs)/notifications';
};

// ─── Context ────────────────────────────────────────────────────────────────

const PushNotificationsContext = createContext<UsePushNotificationsReturn | null>(null);

export function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrationState = useAuthStore.persist;
  const [hasHydrated, setHasHydrated] = useState(() => hydrationState.hasHydrated());

  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);

  const mountedRef = useRef(true);
  const appState = useRef(AppState.currentState);
  const wasAuthenticated = useRef(false);

  const rootNavigationState = useRootNavigationState();
  const routerReady = Boolean(rootNavigationState?.key);
  const routerReadyRef = useRef(routerReady);
  const pendingTargetRef = useRef<string | null>(null);

  useEffect(() => {
    routerReadyRef.current = routerReady;

    // A notification may have launched the app before the router mounted.
    if (routerReady && pendingTargetRef.current) {
      const target = pendingTargetRef.current;
      pendingTargetRef.current = null;
      navigateTo(target);
    }
  }, [routerReady]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Zustand's persisted auth state hydrates asynchronously. Waiting for it
  // prevents a cold start from being mistaken for a logout (which would
  // unregister a perfectly valid device token).
  useEffect(() => {
    if (hydrationState.hasHydrated()) {
      setHasHydrated(true);
      return;
    }

    const unsubscribe = hydrationState.onFinishHydration(() => {
      setHasHydrated(true);
    });

    return unsubscribe;
  }, [hydrationState]);

  // ─── Badge / query refresh ───────────────────────────────────────────────

  const refreshBadgeCount = useCallback(async () => {
    if (!useAuthStore.getState().isAuthenticated) return;

    try {
      const { count } = await notificationsApi.getUnreadCount();
      await setBadgeCount(count);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // Badge refresh is best-effort; never block notification handling.
    }
  }, [queryClient]);

  // ─── Tap handling ────────────────────────────────────────────────────────

  const handleResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handledResponses.has(key)) return;

      handledResponses.add(key);
      if (handledResponses.size > 50) {
        const oldest = handledResponses.values().next().value;
        if (oldest) handledResponses.delete(oldest);
      }

      const data = (response.notification.request.content.data ?? {}) as Record<string, any>;
      const target = resolveNotificationTarget(data);

      void refreshBadgeCount();

      if (!routerReadyRef.current) {
        pendingTargetRef.current = target;
        return;
      }

      navigateTo(target);
    },
    [refreshBadgeCount]
  );

  // Register global listeners once. This is what makes taps work even when
  // the notification settings screen is not open.
  useEffect(() => {
    if (!IS_NATIVE) return;

    // Install the foreground presentation handler and Android channels even
    // before the user signs in.
    void initializePushNotifications();

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void refreshBadgeCount();
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // Handles the cold-start case where a notification launched the app.
    void Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
      if (!lastResponse) return;

      handleResponse(lastResponse);

      // Prevent the same tap from re-navigating on every future cold start.
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [handleResponse, refreshBadgeCount]);

  // Re-check permission and badge when returning from system settings.
  useEffect(() => {
    if (!IS_NATIVE) return;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const returningToForeground =
        /inactive|background/.test(appState.current) && nextState === 'active';
      appState.current = nextState;

      if (!returningToForeground) return;

      void refreshBadgeCount();

      void readPermission().then((granted) => {
        if (!mountedRef.current) return;
        setHasPermission(granted);

        if (granted && useAuthStore.getState().isAuthenticated) {
          void setupPushNotifications().then((result) => {
            if (!mountedRef.current) return;
            setIsInitialized(true);
            setIsRegistered(result.tokenRegistered);
          });
        }
      });
    });

    return () => subscription.remove();
  }, [refreshBadgeCount]);

  // ─── Auth lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;

    if (!isAuthenticated) {
      // Only clean up after a real logout/session expiry — not on the initial
      // logged-out cold start.
      if (wasAuthenticated.current) {
        wasAuthenticated.current = false;
        void cleanupPushNotifications().then(() => {
          if (cancelled || !mountedRef.current) return;
          setIsInitialized(false);
          setIsRegistered(false);
          setHasPermission(false);
          setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
          setIsLoadingPreferences(false);
        });
      }
      return () => {
        cancelled = true;
      };
    }

    wasAuthenticated.current = true;
    setIsLoadingPreferences(true);

    void (async () => {
      const result = await setupPushNotifications();
      const prefs = await loadNotificationPreferences();

      if (cancelled || !mountedRef.current) return;

      setIsInitialized(true);
      setHasPermission(result.permissionGranted);
      setIsRegistered(result.tokenRegistered);
      setPreferences(prefs);
      setIsLoadingPreferences(false);

      if (result.permissionGranted) {
        void refreshBadgeCount();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isAuthenticated, refreshBadgeCount]);

  // ─── Preference updates ──────────────────────────────────────────────────

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
      const success = await saveNotificationPreferences(prefs);
      if (success) {
        setPreferences((previous) => ({ ...previous, ...prefs }));
      }
      return success;
    },
    []
  );

  const value = useMemo<UsePushNotificationsReturn>(
    () => ({
      isInitialized,
      hasPermission,
      isRegistered,
      preferences,
      isLoadingPreferences,
      updatePreferences,
      refreshBadgeCount,
    }),
    [
      isInitialized,
      hasPermission,
      isRegistered,
      preferences,
      isLoadingPreferences,
      updatePreferences,
      refreshBadgeCount,
    ]
  );

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePushNotifications(): UsePushNotificationsReturn {
  const context = useContext(PushNotificationsContext);

  if (!context) {
    throw new Error(
      'usePushNotifications must be used inside a PushNotificationsProvider'
    );
  }

  return context;
}

export default usePushNotifications;
