// services/api/auth.ts
import { request } from './client';
import { API_ROUTES } from './routes';
import { API_CONFIG } from './config';
import { saveTokens, clearTokens } from './token';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BackendLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  message?: string;
  success?: boolean;
  verification_added?: boolean;
  expires_in?: number;
  refresh_expires_in?: number;
  // Note: server returns is_new_user inside the user object
  is_new_user?: boolean;
  reporter_eligibility?: {
    can_become_reporter: boolean;
    requirements: Array<{ field: string; status: string; message: string }>;
    switch_endpoint: string;
  };
  user: {
    user_uid: string;
    user_name: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: number;
    role_name?: string;
    email_verified: boolean;
    mobile_verified: boolean;
    is_suspended?: boolean;
    is_new_user?: boolean;   // actual location in server response
    profile_picture?: string | null;
    created_at?: string;
    google_id?: string | null;
    auth_provider?: string | null;
    providers?: string[] | null;
    is_google_linked?: boolean;
  };
}

export interface RegisterDevicePayload {
  fcm_token: string;
  device_type: 'android' | 'ios';
  device_name?: string;
  app_version?: string;
}

export interface PublisherEligibilityRequirement {
  field: string;
  status: string;
  message: string;
}

export interface PublisherEligibilityResponse {
  can_become_reporter: boolean;
  requirements: PublisherEligibilityRequirement[];
  switch_endpoint: string;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * Exchange Firebase token for backend JWT
   * Used for BOTH Phone Auth and Google OAuth
   */
  loginWithFirebase: async (
    firebaseToken: string
  ): Promise<BackendLoginResponse> => {
    const response = await request<BackendLoginResponse>({
      url: API_ROUTES.auth.firebaseLogin,
      method: 'POST',
      data: { firebase_token: firebaseToken }, // Correct field name
    });
    console.log("firebaseToken", firebaseToken);
    console.log("response", response);
    // Save tokens securely
    await saveTokens(
      (response as any).access_token,
      (response as any).refresh_token
    );

    return response;
  },

  /**
   * Sync external provider (e.g. Google) with backend user record
   * Sends Firebase ID token in Authorization header
   */
  syncProvider: async (
    firebaseToken: string
  ): Promise<BackendLoginResponse> => {
    const fullUrl = `${API_CONFIG.baseUrl}${API_ROUTES.auth.syncProvider}`;
    const method = 'POST';
    const hasAuthHeader = Boolean(firebaseToken);

    // Requirement 1: Before call, log full URL, HTTP method, and whether Authorization header is set (never log token)
    console.log(`[authApi.syncProvider] Calling: ${method} ${fullUrl} | Authorization header set: ${hasAuthHeader}`);

    try {
      const response = await request<BackendLoginResponse>({
        url: API_ROUTES.auth.syncProvider,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
        },
        data: { firebase_token: firebaseToken },
      });

      if ((response as any)?.access_token && (response as any)?.refresh_token) {
        await saveTokens(
          (response as any).access_token,
          (response as any).refresh_token
        );
      }

      return response;
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status ?? 'UNKNOWN';
      const body = err?.response?.data ?? err?.message;

      // Requirement 1: Log response status and body on failure
      console.error(`[authApi.syncProvider] Failed: ${method} ${fullUrl} - Status: ${status}, Body:`, body);

      // Enrich error with endpoint and status for descriptive logging
      err.endpoint = `${method} ${API_ROUTES.auth.syncProvider}`;
      err.status = status;

      const is404 =
        status === 404 ||
        err?.response?.data?.detail === 'Not Found' ||
        err?.message === 'Not Found' ||
        err?.message?.includes('Not Found') ||
        err?.code === 'NOT_FOUND';

      if (is404) {
        try {
          console.warn('⚠️ /user/auth/sync-provider returned 404, attempting fallback to /user/auth/firebase/login...');
          return await authApi.loginWithFirebase(firebaseToken);
        } catch (fallbackErr: any) {
          console.warn('[authApi.syncProvider] Fallback to /user/auth/firebase/login also failed:', fallbackErr?.message);
        }
      }
      throw err;
    }
  },

  /**
   * Logout - invalidates all tokens
   */
  logout: async (): Promise<void> => {
    try {
      await request({
        url: API_ROUTES.auth.logout,
        method: 'POST',
      });
    } finally {
      await clearTokens();
    }
  },

  /**
   * Switch user role to Publisher
   * Requirements: email verified + phone verified
   */
  switchToPublisher: async (): Promise<void> => {
    await request({
      url: API_ROUTES.auth.switchToPublisher,
      method: 'POST',
    });
  },

  /**
   * Check if user can become publisher
   */
  checkPublisherEligibility: async (): Promise<PublisherEligibilityResponse> => {
    return await request<PublisherEligibilityResponse>({
      url: API_ROUTES.user.publisherEligibility,
      method: 'GET',
    });
  },

  /**
   * Register FCM device token for push notifications
   */
  registerDeviceToken: async (
    payload: RegisterDevicePayload
  ): Promise<void> => {
    await request({
      url: API_ROUTES.auth.registerDevice,
      method: 'POST',
      data: payload,
    });
  },
};