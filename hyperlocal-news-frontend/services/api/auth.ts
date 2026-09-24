// services/api/auth.ts
import { request } from './client';
import { API_ROUTES } from './routes';
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