// services/api/notifications.ts
import { API_ROUTES } from './routes';
import { request } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  user_uid: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface InAppNotification {
  id: number;
  user_uid: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  priority?: 'high' | 'medium' | 'low';
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const notificationsApi = {

  // ═════════════════════════════════════════════════════════════════════════
  // ENGAGEMENT NOTIFICATIONS (/engagement/notifications)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * GET /engagement/notifications
   * Get all engagement notifications
   */
  list: async (): Promise<Notification[]> => {
    return await request<Notification[]>({
      url: API_ROUTES.engagement.notifications,
      method: 'GET',
    });
  },

  /**
   * GET /engagement/notifications/unread/count
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    return await request<UnreadCountResponse>({
      url: API_ROUTES.engagement.unreadCount,
      method: 'GET',
    });
  },

  /**
   * PATCH /engagement/notifications/:id/read
   * Mark a single notification as read
   */
  markRead: async (id: string | number): Promise<void> => {
    await request({
      url: API_ROUTES.engagement.markRead(Number(id)),
      method: 'PATCH',
    });
  },

  /**
   * PATCH /engagement/notifications/read-all
   * Mark all notifications as read
   */
  markAllRead: async (): Promise<void> => {
    await request({
      url: API_ROUTES.engagement.markAllRead,
      method: 'PATCH',
    });
  },

  /**
   * DELETE /engagement/notifications/:id
   * Delete a single notification
   */
  deleteNotification: async (id: string | number): Promise<void> => {
    await request({
      url: API_ROUTES.engagement.deleteNotification(Number(id)),
      method: 'DELETE',
    });
  },

  /**
   * DELETE /engagement/notifications/clear
   * Clear all notifications
   */
  clearAll: async (): Promise<void> => {
    await request({
      url: API_ROUTES.engagement.clearAll,
      method: 'DELETE',
    });
  },

  // ═════════════════════════════════════════════════════════════════════════
  // IN-APP NOTIFICATIONS (/notifications/in-app)
  // System-level notifications (app updates, announcements, etc.)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * GET /notifications/in-app
   * Get in-app notifications (system announcements, updates, etc.)
   */
  getInAppNotifications: async (): Promise<InAppNotification[]> => {
    return await request<InAppNotification[]>({
      url: API_ROUTES.inAppNotifications.list,
      method: 'GET',
    });
  },

  /**
   * GET /notifications/in-app/unread/count
   * Get unread in-app notification count
   */
  getInAppUnreadCount: async (): Promise<UnreadCountResponse> => {
    return await request<UnreadCountResponse>({
      url: API_ROUTES.inAppNotifications.unreadCount,
      method: 'GET',
    });
  },

  /**
   * PATCH /notifications/in-app/:id/read
   * Mark in-app notification as read
   */
  markInAppRead: async (id: string | number): Promise<void> => {
    await request({
      url: API_ROUTES.inAppNotifications.markRead(Number(id)),
      method: 'PATCH',
    });
  },

  // ═════════════════════════════════════════════════════════════════════════
  // COMBINED HELPERS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get all notifications (engagement + in-app combined)
   */
  getAllNotifications: async (): Promise<{
    engagement: Notification[];
    inApp: InAppNotification[];
    total: number;
  }> => {
    const [engagement, inApp] = await Promise.all([
      notificationsApi.list(),
      notificationsApi.getInAppNotifications(),
    ]);

    return {
      engagement,
      inApp,
      total: engagement.length + inApp.length,
    };
  },

  /**
   * Get total unread count (engagement + in-app)
   */
  getTotalUnreadCount: async (): Promise<{ count: number }> => {
    const [engagementCount, inAppCount] = await Promise.all([
      notificationsApi.getUnreadCount(),
      notificationsApi.getInAppUnreadCount(),
    ]);

    return {
      count: engagementCount.count + inAppCount.count,
    };
  },
};