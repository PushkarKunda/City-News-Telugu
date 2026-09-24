// services/api/users.ts
import { API_ROUTES } from './routes';
import { request } from './client';
import type { User } from '@/store/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// TYPES FOR /user/users/me ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /user/users/me response
 * Pure API response - no mixing with preferences or dashboard
 */
export interface UserMeResponse {
  user_uid: string;
  user_name: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  profile_picture: string | null;
  date_of_birth: string | null; // ISO string
  language: string | null;
  state_id: number | null;
  district_id: number | null;
  city_id: number | null;
  role: number;
  email_verified: boolean;
  mobile_verified: boolean;
  is_suspended: boolean;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

/**
 * PATCH /user/users/me request payload
 * All fields optional - only send what you want to update
 */
export interface UpdateMePayload {
  user_name?: string;
  name?: string;
  profile_picture?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  date_of_birth?: string | null; // ISO string format
  language?: string | null;
  state_id?: number | null;
  district_id?: number | null;
  city_id?: number | null;
}

/**
 * PATCH /user/users/me response
 * Same structure as GET response
 */
export type UpdateMeResponse = UserMeResponse;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES FOR /user/dashboardnew ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

export interface DashboardUser {
  user_uid: string;
  user_name: string;
  name: string | null;
  profile_picture: string | null;
  location: string; // Combined location string
  joined_date: string; // e.g. "Jun 2026"
  followers_count: number;
  following_count: number;
  role: number;
  role_name: string;
  is_publisher: boolean;
  is_verified: boolean;
  rank: number | null;
  top_percent: number | null;
  unread_notifications: number;
  profile_completion: number; // 0-100
}

export interface DashboardStats {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  level: number;
  level_name: string;
  coins: number;
  points: number;
  current_streak: number;
  longest_streak: number;
  today_earnings: {
    points: number;
    coins: number;
  };
  weekly_earnings: {
    points: number;
    coins: number;
  };
  monthly_earnings: {
    points: number;
    coins: number;
  };
}

export interface DashboardPost {
  // Define based on actual post structure from API
  // Currently empty array in response
  [key: string]: any;
}

export interface DashboardPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface DashboardRecentPosts {
  items: DashboardPost[];
  total: number;
  has_more: boolean;
}

export interface DashboardDetailedPosts {
  items: DashboardPost[];
  pagination: DashboardPagination;
}

export interface DashboardQuickAction {
  label: string;
  url: string;
  icon: string;
  type: 'primary' | 'warning' | 'info' | 'success';
}

export interface DashboardPublisherCTA {
  show_cta: boolean;
  can_apply: boolean;
  message: string;
  missing_requirements: string[];
  apply_endpoint: string;
}

/**
 * GET /user/dashboardnew response
 * Complete dashboard data structure
 */
export interface DashboardResponse {
  user: DashboardUser;
  stats: DashboardStats;
  recent_posts: DashboardRecentPosts;
  quick_actions: DashboardQuickAction[];
  publisher_cta: DashboardPublisherCTA;
  detailed_posts: DashboardDetailedPosts;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES FOR /user/preferences/me ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

export interface CategorySummary {
  id: number;
  name: string;
  slug?: string | null;
}

export interface UserPreferences {
  user_uid: string;
  language?: string | null;
  language_name?: string | null;
  language_id?: number | null;
  state_id?: number | null;
  state_name?: string | null;
  district_id?: number | null;
  district_name?: string | null;
  city_id?: number | null;
  city_name?: string | null;
  categories?: CategorySummary[];
  category_ids?: number[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpdatePreferencesPayload {
  language_id: number | null;
  state_id: number | null;
  district_id: number | null;
  city_id: number | null;
  category_ids: number[] | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// OTHER ENDPOINT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SuspensionStatus {
  is_suspended: boolean;
  suspension_reason?: string;
  suspended_at?: string;
  suspended_until?: string;
}


export interface DashboardEngagement {
  daily_views: number;
  daily_likes: number;
  daily_comments: number;
  daily_shares: number;
  weekly_trend: any[];
}

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  /**
   * GET /user/users/me
   * Get current user profile (works for both regular users and publishers)
   */
  me: async (): Promise<UserMeResponse> => {
    return await request<UserMeResponse>({
      url: API_ROUTES.user.me,
      method: 'GET',
    });
  },

  /**
   * PATCH /user/users/me
   * Update user profile
   * Only sends non-undefined values
   * Sends null to clear fields
   */
  updateMe: async (payload: UpdateMePayload): Promise<UpdateMeResponse> => {
    // Filter out undefined but KEEP null values (null = clear field)
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    ) as UpdateMePayload;

    return await request<UpdateMeResponse>({
      url: API_ROUTES.user.me,
      method: 'PATCH',
      data: cleanPayload,
    });
  },

  /**
   * PATCH /user/preferences/me
   * Update user preferences
   */
  updatePreferences: async (
    payload: UpdatePreferencesPayload
  ): Promise<UserPreferences> => {
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== null)
    ) as UpdatePreferencesPayload;

    return await request<UserPreferences>({
      url: API_ROUTES.user.preferences,
      method: 'PATCH',
      data: cleanPayload,
    });
  },

  /**
   * POST /user/preferences/me
   * Create or replace onboarding preferences
   */
  savePreferences: async (
    payload: UpdatePreferencesPayload
  ): Promise<UserPreferences> => {
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== null)
    ) as UpdatePreferencesPayload;

    return await request<UserPreferences>({
      url: API_ROUTES.user.preferences,
      method: 'POST',
      data: cleanPayload,
    });
  },

  /**
   * GET /user/preferences/me
   * Get user preferences
   */
  getPreferences: async (): Promise<UserPreferences> => {
    return await request<UserPreferences>({
      url: API_ROUTES.user.preferences,
      method: 'GET',
    });
  },

  /**
   * GET /user/dashboardnew
   * Get user dashboard with stats, posts, and actions
   */
  dashboard: async (params?: {
    detailed?: boolean;
    page?: number;
    limit?: number;
    recent_limit?: number;
  }): Promise<DashboardResponse> => {
    return await request<DashboardResponse>({
      url: API_ROUTES.user.dashboard,
      method: 'GET',
      params: {
        detailed: params?.detailed ?? true,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        recent_limit: params?.recent_limit ?? 5,
      },
    });
  },

  /**
   * GET /user/users/me/suspension-status
   * Check if user is suspended
   */
  suspensionStatus: async (): Promise<SuspensionStatus> => {
    return await request<SuspensionStatus>({
      url: API_ROUTES.user.suspensionStatus,
      method: 'GET',
    });
  },

  /**
   * GET /user/dashboard/engagement
   * Get user engagement metrics
   */
  dashboardEngagement: async (): Promise<DashboardEngagement> => {
    return await request<DashboardEngagement>({
      url: API_ROUTES.user.dashboardEngagement,
      method: 'GET',
    });
  },
};