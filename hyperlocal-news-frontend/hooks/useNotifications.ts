// hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api';

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

const queryKeys = {
  list: ['notifications', 'list'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  inApp: ['notifications', 'in-app'] as const,
  inAppUnreadCount: ['notifications', 'in-app-unread-count'] as const,
  all: ['notifications', 'all'] as const,
  totalUnreadCount: ['notifications', 'total-unread-count'] as const,
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGAGEMENT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * list
 * GET /engagement/notifications
 */
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.list,
    queryFn: () => notificationsApi.list(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 3,
  });
}

/**
 * getUnreadCount
 * GET /engagement/notifications/unread/count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 1000 * 60 * 1,
    refetchInterval: 1000 * 60 * 2,
  });
}

/**
 * markRead
 * PATCH /engagement/notifications/:id/read
 */
export function useMarkNotificationRead() {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.totalUnreadCount });
    },
  });
}

/**
 * markAllRead
 * PATCH /engagement/notifications/read-all
 */
export function useMarkAllNotificationsRead() {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.totalUnreadCount });
    },
  });
}

/**
 * deleteNotification
 * DELETE /engagement/notifications/:id
 */
export function useDeleteNotification() {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.totalUnreadCount });
    },
  });
}

/**
 * clearAll
 * DELETE /engagement/notifications/clear
 */
export function useClearAllNotifications() {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.totalUnreadCount });
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
  return useQuery({
    queryKey: queryKeys.inApp,
    queryFn: () => notificationsApi.getInAppNotifications(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 3,
  });
}

/**
 * getInAppUnreadCount
 * GET /notifications/in-app/unread/count
 */
export function useInAppUnreadCount() {
  return useQuery({
    queryKey: queryKeys.inAppUnreadCount,
    queryFn: () => notificationsApi.getInAppUnreadCount(),
    staleTime: 1000 * 60 * 1,
    refetchInterval: 1000 * 60 * 2,
  });
}

/**
 * markInAppRead
 * PATCH /notifications/in-app/:id/read
 */
export function useMarkInAppRead() {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.inAppUnreadCount });
      queryClient.invalidateQueries({ queryKey: queryKeys.totalUnreadCount });
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
  return useQuery({
    queryKey: queryKeys.all,
    queryFn: () => notificationsApi.getAllNotifications(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 3,
  });
}

/**
 * getTotalUnreadCount
 * Combined unread count (engagement + in-app)
 */
export function useTotalUnreadCount() {
  return useQuery({
    queryKey: queryKeys.totalUnreadCount,
    queryFn: () => notificationsApi.getTotalUnreadCount(),
    staleTime: 1000 * 60 * 1,
    refetchInterval: 1000 * 60 * 2,
  });
}