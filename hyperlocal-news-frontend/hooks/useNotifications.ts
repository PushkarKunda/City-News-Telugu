// hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

const queryKeys = {
  list: ['notifications', 'list'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  inApp: ['notifications', 'list'] as const,
};

function useScopedNotificationKeys() {
  const uid = useAuthStore((state) => state.user?.user_uid);
  return { ...queryKeys, list: [...queryKeys.list, uid], inApp: [...queryKeys.list, uid] };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGAGEMENT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * list
 * GET /engagement/notifications
 */
export function useNotifications() {
  const isFocused = useIsFocused();
  const userUid = useAuthStore((state) => state.user?.user_uid);
  return useQuery({
    queryKey: [...queryKeys.list, userUid],
    queryFn: () => notificationsApi.list(),
    enabled: isFocused && Boolean(userUid),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * getUnreadCount
 * GET /engagement/notifications/unread/count
 */
export function useUnreadCount() {
  const isFocused = useIsFocused();
  const userUid = useAuthStore((state) => state.user?.user_uid);
  return useQuery({
    queryKey: [...queryKeys.unreadCount, userUid],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isFocused && Boolean(userUid),
    staleTime: 1000 * 60 * 1,
    refetchInterval: isFocused ? 1000 * 60 * 2 : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * markRead
 * PATCH /engagement/notifications/:id/read
 */
export function useMarkNotificationRead() {
  const queryKeys = useScopedNotificationKeys();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.list });

      // Snapshot
      const previousNotifications = queryClient.getQueryData(queryKeys.list);

      // Optimistically mark as read
      queryClient.setQueryData(queryKeys.list, (old: any) => {
        if (!old) return old;
        return old.map((notification: any) =>
          notification.id === Number(id)
            ? { ...notification, is_read: true }
            : notification
        );
      });

      return { previousNotifications };
    },
    onError: (err, id, context) => {
      // Rollback
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKeys.list, context.previousNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

/**
 * markAllRead
 * PATCH /engagement/notifications/read-all
 */
export function useMarkAllNotificationsRead() {
  const queryKeys = useScopedNotificationKeys();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.list });

      const previousNotifications = queryClient.getQueryData(queryKeys.list);

      // Optimistically mark all as read
      queryClient.setQueryData(queryKeys.list, (old: any) => {
        if (!old) return old;
        return old.map((notification: any) => ({
          ...notification,
          is_read: true,
        }));
      });

      return { previousNotifications };
    },
    onError: (err, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKeys.list, context.previousNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

/**
 * deleteNotification
 * DELETE /engagement/notifications/:id
 */
export function useDeleteNotification() {
  const queryKeys = useScopedNotificationKeys();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => notificationsApi.deleteNotification(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.list });

      const previousNotifications = queryClient.getQueryData(queryKeys.list);

      // Optimistically remove from list
      queryClient.setQueryData(queryKeys.list, (old: any) => {
        if (!old) return old;
        return old.filter(
          (notification: any) => notification.id !== Number(id)
        );
      });

      return { previousNotifications };
    },
    onError: (err, id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKeys.list, context.previousNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

/**
 * clearAll
 * DELETE /engagement/notifications/clear
 */
export function useClearAllNotifications() {
  const queryKeys = useScopedNotificationKeys();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.clearAll(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.list });

      const previousNotifications = queryClient.getQueryData(queryKeys.list);

      // Optimistically clear list
      queryClient.setQueryData(queryKeys.list, []);

      return { previousNotifications };
    },
    onError: (err, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKeys.list, context.previousNotifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-APP NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getInAppNotifications
 * GET /notifications/in-app
 */
export function useInAppNotifications() {
  return useNotifications();
}

/**
 * getInAppUnreadCount
 * GET /notifications/in-app/unread/count
 */
export function useInAppUnreadCount() {
  return useUnreadCount();
}

/**
 * markInAppRead
 * PATCH /notifications/in-app/:id/read
 */
export function useMarkInAppRead() {
  const queryKeys = useScopedNotificationKeys();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => notificationsApi.markInAppRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inApp });

      const previousInApp = queryClient.getQueryData(queryKeys.inApp);

      // Optimistically mark as read
      queryClient.setQueryData(queryKeys.inApp, (old: any) => {
        if (!old) return old;
        return old.map((notification: any) =>
          notification.id === Number(id)
            ? { ...notification, is_read: true }
            : notification
        );
      });

      return { previousInApp };
    },
    onError: (err, id, context) => {
      if (context?.previousInApp) {
        queryClient.setQueryData(queryKeys.inApp, context.previousInApp);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inApp });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getAllNotifications
 * Fetches both engagement + in-app notifications
 */
export function useAllNotifications() {
  const query = useNotifications();
  return { ...query, data: query.data ? { engagement: query.data, inApp: [], total: query.data.length } : undefined };
}

/**
 * getTotalUnreadCount
 * Combined unread count (engagement + in-app)
 */
export function useTotalUnreadCount() {
  return useUnreadCount();
}
