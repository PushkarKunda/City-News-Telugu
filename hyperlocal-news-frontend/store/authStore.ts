// store/authStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getAuth, FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  sendPhoneOTP as firebaseSendOTP,
  verifyPhoneOTP as firebaseVerifyOTP,
  signInWithGoogle as firebaseGoogleSignIn,
  firebaseSignOut,
  linkGoogleAccount,
  linkPhoneNumber,
} from '@/services/firebase';
import {
  authApi,
  API_ROUTES,
  BackendLoginResponse,
  PublisherEligibilityResponse,
  usersApi,
} from '@/services/api';
import type { UserPreferences } from '@/services/api';
import { clearTokens, getAuthToken } from '@/services/api/token';
import { compressImage } from '@/services/image';
import { uploadImageToSupabaseProfile } from '@/services/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  user_uid: string;
  user_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: number;
  email_verified: boolean;
  email_verified_at?: string | null;
  mobile_verified: boolean;
  is_suspended: boolean;
  created_at: string;
  language?: string | null;
  theme?: 'light' | 'dark' | 'system';
  avatar?: string | null;
  profile_picture?: string | null;
  phoneNumber?: string | null;
  interests?: string[] | null;
  category_ids?: number[] | null;
  state?: string | null;
  district?: string | null;
  language_id?: number | null;
  state_id?: number | null;
  district_id?: number | null;
  city_id?: number | null;
  language_name?: string | null;
  state_name?: string | null;
  district_name?: string | null;
  city_name?: string | null;
  isPublisher?: boolean;
  gender?: string | null;
  date_of_birth?: string | null;
  google_id?: string | null;
  auth_provider?: string | null;
  providers?: string[] | null;
  is_google_linked?: boolean;
}

type RawUser = Omit<User, 'is_suspended' | 'created_at' | 'profile_picture'> & {
  is_suspended?: boolean;
  created_at?: string;
  role_name?: string;
  is_new_user?: boolean;
  profile_picture?: string | null;
  categories?: Array<{ id: number; name: string; slug?: string | null }>;
  google_id?: string | null;
  auth_provider?: string | null;
  providers?: string[] | null;
  is_google_linked?: boolean;
  email_verified_at?: string | null;
};

export const isUserGoogleLinked = (user: RawUser | User | null | undefined): boolean => {
  if (!user) return false;
  return Boolean(
    user.is_google_linked ||
    user.google_id ||
    user.auth_provider === 'google' ||
    user.providers?.includes('google') ||
    user.providers?.includes('google.com')
  );
};

export const isEmailVerified = (
  user: {
    email_verified?: boolean | null;
    google_id?: string | null;
    auth_provider?: string | null;
    is_google_linked?: boolean | null;
    providers?: string[] | null;
  } | null | undefined
): boolean => {
  if (!user) return false;
  return Boolean(
    user.email_verified ||
    user.google_id ||
    user.auth_provider === 'google' ||
    user.is_google_linked ||
    user.providers?.includes('google') ||
    user.providers?.includes('google.com')
  );
};

export const computeIsEmailVerified = isEmailVerified;

const sanitizeUser = (user: RawUser): User => {
  const isPhone = (str: string | null): boolean => {
    if (!str) return false;
    const clean = str.replace(/[\s\-()]/g, '');
    return /^\+?\d{7,15}$/.test(clean);
  };

  let updatedName = user.name;
  let updatedPhone = user.phone;

  if (isPhone(user.name)) {
    updatedName = null;
    if (!updatedPhone) updatedPhone = user.name;
  }

  const profilePicture = user.profile_picture ?? null;
  const isGoogleLinked = isUserGoogleLinked(user);
  // Google-verified emails are always considered verified.
  // This derives the state from real data and corrects stale persisted state.
  const emailVerified = computeIsEmailVerified(user);

  return {
    ...user,
    is_suspended: user.is_suspended ?? false,
    created_at: user.created_at ?? new Date().toISOString(),
    name: updatedName,
    phone: updatedPhone,
    phoneNumber: updatedPhone ?? null,
    email_verified: emailVerified,
    email_verified_at: user.email_verified_at ?? (emailVerified ? new Date().toISOString() : null),
    mobile_verified: user.mobile_verified === true,
    isPublisher: user.role >= 2,
    avatar: profilePicture,
    profile_picture: profilePicture,
    language: user.language ?? user.language_name ?? null,
    state: user.state ?? user.state_name ?? (user as any).location?.state_name ?? (user as any).location?.state ?? null,
    district: user.district ?? user.district_name ?? (user as any).location?.district_name ?? (user as any).location?.district ?? null,
    state_name: user.state_name ?? (user as any).location?.state_name ?? null,
    district_name: user.district_name ?? (user as any).location?.district_name ?? null,
    city_name: user.city_name ?? (user as any).location?.city_name ?? null,
    state_id: user.state_id ?? (user as any).location?.state_id ?? null,
    district_id: user.district_id ?? (user as any).location?.district_id ?? null,
    city_id: user.city_id ?? (user as any).location?.city_id ?? null,
    interests: user.interests ?? null,
    category_ids: user.category_ids ?? user.categories?.map((category) => category.id) ?? null,
    google_id: user.google_id ?? null,
    auth_provider: user.auth_provider ?? null,
    providers: user.providers ?? (user.google_id ? ['google'] : []),
    is_google_linked: isGoogleLinked,
  };
};

// ─── Auth State Interface ─────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  error: string | null;

  phoneConfirmation: FirebaseAuthTypes.ConfirmationResult | null;
  pendingPhone: string | null;
  pendingVerificationId: string | null;
  lastOtpSentTime: number | null;


  // ✅ NEW: Temporary onboarding data collection
  onboardingData: {
    language_id?: number | null;
    state_id?: number | null;
    district_id?: number | null;
    city_id?: number | null;
    category_ids?: number[] | null;
  };


  sendPhoneOTP: (phoneNumber: string) => Promise<void>;
  verifyPhoneOTP: (otp: string) => Promise<BackendLoginResponse>;
  loginWithGoogle: (idToken: string) => Promise<BackendLoginResponse>;
  linkGoogle: (idToken: string) => Promise<BackendLoginResponse>;
  linkPhone: (phoneNumber: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  expireSession: () => Promise<void>;

  updateProfile: (updates: Partial<User>) => void;
  updateProfileLocal: (updates: Partial<User>) => void;
  updateLanguage: (language: string) => void;
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;

  // ✅ NEW: Set onboarding data during flow
  setOnboardingData: (data: Partial<AuthState['onboardingData']>) => void;

  switchToPublisher: () => Promise<void>;
  checkPublisherEligibility: () => Promise<PublisherEligibilityResponse>;

  completeOnboarding: () => Promise<void>;
  clearError: () => void;
  isPublisher: () => boolean;

  // ✅ NEW: Cached preferences
  cachedPreferences: UserPreferences | null;
  fetchPreferences: () => Promise<UserPreferences>;
  updateCachedPreferences: (updates: Partial<UserPreferences>) => void;
  fetchUser: () => Promise<User | null>;
  syncProvider: () => Promise<User | null>;
  loginAsDemo: (customUser?: Partial<User>) => void;
}

// ─── Error Handler ────────────────────────────────────────────────────────────

class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

const isAlreadyLinkedError = (error: any): boolean => {
  if (error.code === 'auth/provider-already-linked') return true;
  if (
    error.code === 'auth/unknown' &&
    error.message?.includes('already been linked')
  )
    return true;
  return false;
};



const handleAuthError = (error: any, endpoint?: string): AuthError => {
  const status = error?.response?.status ?? error?.status;
  const serverDetail = error?.response?.data?.detail || error?.response?.data?.message;
  const endpointInfo = endpoint
    ? `[${endpoint} ${status || error?.code || 'ERROR'}]`
    : status
    ? `[HTTP ${status}]`
    : error?.code || 'AUTH_ERROR';

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error(`[AuthError] ${endpointInfo}:`, serverDetail || error?.message);
  }

  if (serverDetail || status) {
    const isFatal = status === 401 || status === 403;
    const msg = isFatal
      ? 'Your session has expired. Please sign in again.'
      : status === 404
      ? 'The requested resource was not found. Please try again later.'
      : status >= 500
      ? 'A server error occurred. Please try again later.'
      : "Couldn't complete sign-in, please try again.";

    return new AuthError(msg, status ? `HTTP_${status}` : 'AUTH_ERROR');
  }

  if (error.code === 'auth/network-request-failed') {
    return new AuthError(
      'Firebase network error. Please check internet connection on your device/emulator.',
      'NETWORK_ERROR'
    );
  }
  if (error.code === 'auth/too-many-requests') {
    return new AuthError(
      'Too many attempts. Please try again in a few minutes.',
      'TOO_MANY_REQUESTS'
    );
  }
  if (error.code === 'auth/invalid-verification-code') {
    return new AuthError(
      'Invalid verification code. Please try again.',
      'INVALID_CODE'
    );
  }
  if (error.code === 'auth/code-expired') {
    return new AuthError(
      'Verification code expired. Please request a new one.',
      'CODE_EXPIRED'
    );
  }
  if (error.code === 'auth/credential-already-in-use') {
    return new AuthError(
      'This phone number is already linked to another account.',
      'CREDENTIAL_IN_USE'
    );
  }
  if (isAlreadyLinkedError(error)) {
    return new AuthError('This account is already linked.', 'ALREADY_LINKED');
  }
  return new AuthError(
    "Couldn't complete sign-in, please try again",
    endpointInfo
  );
};

const checkNetwork = async (): Promise<void> => {
  try {
    const state = await NetInfo.fetch();
    if (state.isConnected === false) {
      console.warn('[NetInfo] Warning: NetInfo reports disconnected, proceeding with request...');
    }
  } catch (e) {
    // Ignore NetInfo check errors on hotspot/emulator
  }
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isOnboarded: false,
      isLoading: false,
      error: null,
      phoneConfirmation: null,
      pendingPhone: null,
      pendingVerificationId: null,
      lastOtpSentTime: null,

      // ✅ NEW: Initialize empty onboarding data
      onboardingData: {},

      // ✅ NEW: Initialize
      cachedPreferences: null,

      // ✅ NEW: Fetch and cache preferences
      fetchPreferences: async () => {
        try {
          const prefs = await usersApi.getPreferences();
          set({ cachedPreferences: prefs });
          return prefs;
        } catch (error: any) {
          // If the backend returns 404, it means preferences aren't set yet.
          if (error?.response?.status === 404 || error?.code === '404' || error?.message?.includes('404')) {
            console.log('[authStore] No preferences found for user on backend. Creating default preferences...');
            try {
              const defaultPrefPayload = {
                language_id: 1, // Telugu
                state_id: 1, // Andhra Pradesh
                district_id: 2, // Bapatla
                city_id: 8, // Bapatla
                category_ids: [1, 2, 3, 4],
              };
              const createdPrefs = await usersApi.savePreferences(defaultPrefPayload);
              set({ cachedPreferences: createdPrefs });
              return createdPrefs;
            } catch (saveErr) {
              console.warn('[authStore] Failed to save default preferences to backend:', saveErr);
            }
            const defaultPrefs = {} as UserPreferences;
            set({ cachedPreferences: defaultPrefs });
            return defaultPrefs;
          }
          console.warn('[authStore] fetchPreferences fallback to cached/default preferences');
          return get().cachedPreferences || ({} as UserPreferences);
        }
      },

      // ✅ NEW: Update cached preferences locally
      updateCachedPreferences: (updates: Partial<UserPreferences>) => {
        set((state) => {
          const current = state.cachedPreferences;
          if (current) {
            let hasDiff = false;
            for (const key of Object.keys(updates) as (keyof UserPreferences)[]) {
              if (updates[key] !== undefined && updates[key] !== current[key]) {
                hasDiff = true;
                break;
              }
            }
            if (!hasDiff) return state;
            return {
              cachedPreferences: {
                ...current,
                ...updates,
              },
            };
          }
          return {
            cachedPreferences: updates as UserPreferences,
          };
        });
      },

      fetchUser: async (): Promise<User | null> => {
        try {
          let token = await getAuthToken();
          const currentUser = getAuth().currentUser;

          if (!token && currentUser) {
            try {
              const freshToken = await currentUser.getIdToken();
              if (freshToken) {
                const loginRes = await authApi.loginWithGoogleAuth(freshToken).catch(() => null);
                if (loginRes?.access_token) {
                  token = loginRes.access_token;
                }
              }
            } catch (fbErr) {
              console.warn('[authStore] Silent Firebase token exchange in fetchUser:', fbErr);
            }
          }

          if (!token && !currentUser) {
            await get().expireSession();
            return null;
          }

          // If Firebase user is active, run syncProvider to update provider state with fresh ID token
          if (currentUser) {
            try {
              const freshToken = await currentUser.getIdToken(true);
              if (freshToken) {
                await authApi.syncProvider(freshToken);
              }
            } catch (syncErr) {
              console.warn('[authStore] Background syncProvider during fetchUser skipped:', syncErr);
            }
          }

          const res = await usersApi.me();
          if (res && (res.user_uid || (res as any).id)) {
            const rawUser = { ...(res as any) };
            const hasFbGoogle = currentUser?.providerData?.some((p) => p.providerId === 'google.com');
            if (hasFbGoogle) {
              if (!rawUser.auth_provider) rawUser.auth_provider = 'google';
              if (!rawUser.providers || !rawUser.providers.includes('google')) {
                rawUser.providers = [...(rawUser.providers || []), 'google'];
              }
              rawUser.is_google_linked = true;
              rawUser.email_verified = true;
            }

            const sanitized = sanitizeUser(rawUser);
            set({
              user: sanitized,
              isAuthenticated: true,
              isOnboarded: true,
            });
            return sanitized;
          }
          return get().user;
        } catch (err) {
          console.warn('[authStore] fetchUser failed:', err);
          return get().user;
        }
      },

      loginAsDemo: (customUser?: Partial<User>) => {
        void clearTokens();
        const demoUser: User = sanitizeUser({
          user_uid: 'demo_user_pushkar',
          user_name: 'pushkarkunda',
          name: 'Pushkar Kunda',
          email: 'pushkar@citynewstelugu.com',
          phone: '+91 98765 43210',
          phoneNumber: '+91 98765 43210',
          role: 1,
          email_verified: true,
          mobile_verified: true,
          is_suspended: false,
          created_at: new Date().toISOString(),
          language: 'Telugu',
          language_name: 'తెలుగు',
          state: 'Andhra Pradesh',
          state_name: 'ఆంధ్రప్రదేశ్',
          district: 'Bapatla',
          district_name: 'బాపట్ల',
          state_id: 1,
          district_id: 1,
          language_id: 1,
          ...(customUser || {}),
        });
        set({
          user: demoUser,
          isAuthenticated: true,
          isOnboarded: true,
          isLoading: false,
          error: null,
          cachedPreferences: {
            language_id: 1,
            state_id: 1,
            district_id: 1,
            state_name: 'ఆంధ్రప్రదేశ్',
            district_name: 'బాపట్ల',
            language_name: 'తెలుగు',
          } as any,
        });
      },

      // ─── Send Phone OTP ────────────────────────────────────────────────────

      sendPhoneOTP: async (phoneNumber: string) => {
        set({ error: null });

        const { lastOtpSentTime } = get();
        const now = Date.now();
        const RATE_LIMIT_MS = 30000;

        if (lastOtpSentTime && now - lastOtpSentTime < RATE_LIMIT_MS) {
          const remainingSeconds = Math.ceil(
            (RATE_LIMIT_MS - (now - lastOtpSentTime)) / 1000
          );
          throw new AuthError(
            `Please wait ${remainingSeconds} seconds before requesting a new code.`,
            'RATE_LIMITED'
          );
        }

        set({ isLoading: true });

        try {
          await checkNetwork();
          const confirmation = await firebaseSendOTP(phoneNumber);
          set({
            phoneConfirmation: confirmation,
            pendingPhone: phoneNumber,
            pendingVerificationId: confirmation.verificationId,
            lastOtpSentTime: now,
            isLoading: false,
          });
        } catch (error: any) {
          const authError = handleAuthError(error);
          set({ isLoading: false, error: authError.message });
          throw authError;
        }
      },

      // ─── Verify Phone OTP ──────────────────────────────────────────────────

      verifyPhoneOTP: async (otp: string) => {
        set({ isLoading: true, error: null });
        try {
          await checkNetwork();

          const { phoneConfirmation, pendingVerificationId } = get();
          const session = phoneConfirmation || pendingVerificationId;

          if (!session) {
            throw new AuthError(
              'No OTP session found. Please request a new code.',
              'NO_SESSION'
            );
          }

          console.log('[authStore] Verifying OTP with Firebase...');
          const firebaseToken = await firebaseVerifyOTP(session, otp);
          console.log('[authStore] Firebase token retrieved. Authenticating with backend...');
          const response = await authApi.loginWithFirebase(firebaseToken);
          console.log('[authStore] Backend authentication success!');

          set({
            user: sanitizeUser(response.user),
            isAuthenticated: true,
            isOnboarded: !(response.user?.is_new_user ?? response.is_new_user),
            isLoading: false,
            phoneConfirmation: null,
            pendingPhone: null,
            pendingVerificationId: null,
            lastOtpSentTime: null,
          });

          return response;
        } catch (error: any) {
          console.error('[authStore] verifyPhoneOTP error:', error?.code, error?.message, error);
          const authError = handleAuthError(error);
          set({ isLoading: false, error: authError.message });
          throw authError;
        }
      },

      // ─── Google Sign-In ────────────────────────────────────────────────────

      loginWithGoogle: async (idToken: string) => {
        // Do not reset user: null or isAuthenticated: false early
        set({ isLoading: true, error: null });
        try {
          await checkNetwork();
          const firebaseToken = await firebaseGoogleSignIn(idToken);
          
          // One backend call: POST /auth/google with Firebase ID token in Authorization header
          const response = await authApi.loginWithGoogleAuth(firebaseToken);

          if (!response?.access_token || !response?.user) {
            await firebaseSignOut().catch(() => {});
            throw new AuthError(
              'Unable to sign in with Google. Please try again.',
              'INVALID_RESPONSE'
            );
          }

          // Refetch fresh profile and update shared state before navigation
          let fullUserData: RawUser = response.user;
          try {
            const meProfile = await usersApi.me();
            fullUserData = { ...response.user, ...meProfile };
          } catch (meErr) {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.warn('[authStore] Failed to refetch /me profile on Google login:', meErr);
            }
          }

          if (!fullUserData.auth_provider) fullUserData.auth_provider = 'google';
          if (!fullUserData.providers || !fullUserData.providers.includes('google')) {
            fullUserData.providers = [...(fullUserData.providers || []), 'google'];
          }
          fullUserData.is_google_linked = true;
          fullUserData.email_verified = true;

          const sanitized = sanitizeUser(fullUserData);

          // Compute can_apply by checking publisher eligibility
          let can_apply = false;
          try {
            const elig = await authApi.checkPublisherEligibility();
            can_apply = Boolean(
              (elig as any)?.can_apply ??
              (elig as any)?.is_eligible ??
              (elig as any)?.can_become_reporter ??
              false
            );
          } catch {
            const isEmailOk = Boolean(
              sanitized.email_verified ||
              sanitized.google_id ||
              sanitized.auth_provider === 'google'
            );
            can_apply = Boolean(
              isEmailOk &&
              sanitized.mobile_verified &&
              sanitized.name &&
              sanitized.date_of_birth &&
              sanitized.gender
            );
          }

          // Requirement: Log user_id, auth_provider, email_verified, google_id, and can_apply
          console.log('[authStore] Google login success:', {
            user_id: sanitized.user_uid,
            auth_provider: sanitized.auth_provider,
            email_verified: sanitized.email_verified,
            google_id: sanitized.google_id,
            can_apply,
          });

          set({
            user: sanitized,
            isAuthenticated: true,
            isOnboarded: !(response.user?.is_new_user ?? response.is_new_user),
            isLoading: false,
            error: null,
          });

          return response;
        } catch (error: any) {
          // If /user/auth/google returns 404 or 5xx, stay logged out, sign out of Firebase, and show a friendly retry message.
          await firebaseSignOut().catch(() => {});
          const authError = handleAuthError(error, `POST ${API_ROUTES.auth.google}`);
          set({ isLoading: false, error: authError.message });
          throw authError;
        }
      },

      // ─── Link Google Account ───────────────────────────────────────────────

      linkGoogle: async (idToken: string) => {
        set({ isLoading: true, error: null });
        try {
          await checkNetwork();
          const firebaseToken = await linkGoogleAccount(idToken);
          
          const response = await authApi.loginWithGoogleAuth(firebaseToken);

          if (!response?.access_token || !response?.user) {
            throw new AuthError(
              'Unable to link Google account. Please try again.',
              'INVALID_RESPONSE'
            );
          }

          // Refetch fresh profile and update shared state
          let fullUserData: RawUser = response.user;
          try {
            const meProfile = await usersApi.me();
            fullUserData = { ...response.user, ...meProfile };
          } catch (meErr) {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.warn('[authStore] Failed to refetch /me profile on Google link:', meErr);
            }
          }

          if (!fullUserData.auth_provider) fullUserData.auth_provider = 'google';
          if (!fullUserData.providers || !fullUserData.providers.includes('google')) {
            fullUserData.providers = [...(fullUserData.providers || []), 'google'];
          }
          fullUserData.is_google_linked = true;
          fullUserData.email_verified = true;

          const sanitized = sanitizeUser(fullUserData);
          console.log('[authStore] Post-Google link verification status:', {
            user_google_id: sanitized.google_id,
            user_auth_provider: sanitized.auth_provider,
            user_email_verified: sanitized.email_verified,
            is_google_linked: sanitized.is_google_linked,
            providers: sanitized.providers,
          });

          set({
            user: sanitized,
            isLoading: false,
            error: null,
          });

          return response;
        } catch (error: any) {
          const authError = handleAuthError(error, `POST ${API_ROUTES.auth.google}`);
          set({ isLoading: false, error: authError.message });
          throw authError;
        }
      },

      // ─── Sync External Provider ───────────────────────────────────────────

      syncProvider: async (): Promise<User | null> => {
        try {
          const currentUser = getAuth().currentUser;
          if (!currentUser) return null;
          const freshIdToken = await currentUser.getIdToken(true);
          if (!freshIdToken) return null;
          console.log('[authStore] Calling syncProvider with fresh Firebase ID token...');
          const response = await authApi.loginWithGoogleAuth(freshIdToken);

          let fullUserData: RawUser = response.user;
          try {
            const meProfile = await usersApi.me();
            fullUserData = { ...response.user, ...meProfile };
          } catch (meErr) {
            console.warn('[authStore] Failed to refetch /me on syncProvider:', meErr);
          }

          const hasFbGoogle = currentUser.providerData?.some((p) => p.providerId === 'google.com');
          if (hasFbGoogle) {
            if (!fullUserData.auth_provider) fullUserData.auth_provider = 'google';
            if (!fullUserData.providers || !fullUserData.providers.includes('google')) {
              fullUserData.providers = [...(fullUserData.providers || []), 'google'];
            }
            fullUserData.is_google_linked = true;
            fullUserData.email_verified = true;
          }

          const sanitized = sanitizeUser(fullUserData);
          console.log('[authStore] syncProvider completed:', {
            user_google_id: sanitized.google_id,
            user_auth_provider: sanitized.auth_provider,
            user_email_verified: sanitized.email_verified,
            providers: sanitized.providers,
            is_google_linked: sanitized.is_google_linked,
          });

          set({ user: sanitized, isAuthenticated: true });
          return sanitized;
        } catch (err: any) {
          const status = err?.response?.status ?? err?.status;
          console.warn(
            `[authStore] Background syncProvider skipped [${err?.endpoint || 'POST ' + API_ROUTES.auth.syncProvider} ${status || 'OFFLINE'}]:`,
            err?.message
          );
          return get().user;
        }
      },

      // ─── Link Phone Number ─────────────────────────────────────────────────

      linkPhone: async (_phoneNumber: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          await checkNetwork();

          const { pendingVerificationId, pendingPhone } = get();
          if (!pendingVerificationId) {
            throw new AuthError('No verification session found', 'NO_SESSION');
          }

          let firebaseToken: string;

          try {
            firebaseToken = await linkPhoneNumber(pendingVerificationId, otp);
          } catch (linkError: any) {
            if (isAlreadyLinkedError(linkError)) {
              console.log('📞 Phone already linked — OTP verified successfully');
              const currentUser = getAuth().currentUser;
              if (!currentUser) {
                throw new AuthError('No authenticated user found', 'NO_USER');
              }
              firebaseToken = await currentUser.getIdToken(true);
            } else {
              throw linkError;
            }
          }

          const response = await authApi.loginWithFirebase(firebaseToken);
          const updatedUser = sanitizeUser(response.user);

          if (!updatedUser.mobile_verified && pendingPhone) {
            try {
              await usersApi.updateMe({ phone: pendingPhone });
              updatedUser.phone = pendingPhone;
              updatedUser.phoneNumber = pendingPhone;
              updatedUser.mobile_verified = true;
            } catch (updateErr) {
              console.warn('[linkPhone] Failed to update phone:', updateErr);
            }
          }

          set({
            user: updatedUser,
            isLoading: false,
            pendingPhone: null,
            pendingVerificationId: null,
            lastOtpSentTime: null,
          });
        } catch (error: any) {
          const authError = handleAuthError(error);
          set({ isLoading: false, error: authError.message });
          throw authError;
        }
      },

      // ─── Logout ────────────────────────────────────────────────────────────

      logout: async () => {
        set({ isLoading: true });
        try {
          const token = await getAuthToken();
          if (token) {
            await authApi.logout();
          }
        } catch {
          // Continue even if API fails
        } finally {
          await get().expireSession();
        }
      },

      expireSession: async () => {
        // Clear persisted UI state before awaiting native cleanup. Expiry must
        // work even while an authenticated operation is still loading.
        set({
          user: null,
          isAuthenticated: false,
          isOnboarded: false,
          isLoading: false,
          error: null,
          phoneConfirmation: null,
          pendingPhone: null,
          pendingVerificationId: null,
          lastOtpSentTime: null,
          onboardingData: {},
          cachedPreferences: null,
        });
        await Promise.allSettled([firebaseSignOut(), clearTokens()]);
      },

      // ─── Switch to Publisher ───────────────────────────────────────────────

      switchToPublisher: async () => {
        set({ isLoading: true, error: null });
        try {
          await authApi.switchToPublisher();
          set((state) => ({
            user: state.user
              ? { ...state.user, role: 2, isPublisher: true }
              : null,
            isLoading: false,
          }));
        } catch (error: any) {
          const authError = handleAuthError(error);
          set({ isLoading: false, error: authError.message });
          throw authError;
        }
      },

      checkPublisherEligibility:
        async (): Promise<PublisherEligibilityResponse> => {
          return await authApi.checkPublisherEligibility();
        },

      // ─── Profile Updates ───────────────────────────────────────────────────

      updateProfile: (updates: Partial<User>) => {
        set((state) => ({
          user: state.user ? sanitizeUser({ ...state.user, ...updates }) : null,
        }));
      },

      updateProfileLocal: (updates: Partial<User>) => {
        set((state) => {
          const merged = state.user ? { ...state.user, ...updates } : (updates as any);
          const sanitized =
            merged && (merged.user_uid || merged.id || merged.email || merged.phone || merged.name)
              ? sanitizeUser(merged)
              : state.user;

          if (state.user && sanitized) {
            let hasChange = false;
            for (const key of Object.keys(updates) as (keyof User)[]) {
              if (updates[key] !== undefined && (state.user as any)[key] !== (sanitized as any)[key]) {
                hasChange = true;
                break;
              }
            }
            if (!hasChange) return state;
          }

          return {
            user: sanitized,
            ...(sanitized ? { isAuthenticated: true } : {}),
          };
        });
      },

      updateLanguage: (language: string) => {
        get().updateProfileLocal({ language });
      },

      updateTheme: (theme: 'light' | 'dark' | 'system') => {
        get().updateProfileLocal({ theme });
      },

      // ✅ NEW: Set onboarding data during onboarding flow
      setOnboardingData: (data: Partial<AuthState['onboardingData']>) => {
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data },
        }));
      },

      // ─── Complete Onboarding ───────────────────────────────────────────────
      // ✅ FIXED: Now sends ALL preferences in ONE POST request

      completeOnboarding: async () => {
        set({ isLoading: true, error: null });
        try {
          const { user, onboardingData } = get();
          if (!user) throw new AuthError('No user found', 'NO_USER');

          // ✅ Upload avatar if local file
          let uploadedAvatarUrl: string | null = user.avatar ?? null;

          const isLocalFile =
            user.avatar &&
            (user.avatar.startsWith('file://') ||
              user.avatar.startsWith('content://') ||
              (!user.avatar.startsWith('http://') &&
                !user.avatar.startsWith('https://')));

          if (isLocalFile && user.avatar) {
            try {
              const compressed = await compressImage(user.avatar, {
                width: 512,
                height: 512,
                compress: 0.8,
              });

              uploadedAvatarUrl = await uploadImageToSupabaseProfile(
                compressed.uri,
                'profile'
              );
            } catch (uploadErr) {
              console.error('[completeOnboarding] Avatar upload failed:', uploadErr);
              uploadedAvatarUrl = null;
            }
          }


          // ✅ Save ALL preferences in ONE POST request
          await usersApi.savePreferences({
            language_id: onboardingData.language_id ?? null,
            state_id: onboardingData.state_id ?? null,
            district_id: onboardingData.district_id ?? null,
            city_id: onboardingData.city_id ?? null,
            category_ids: onboardingData.category_ids ?? null,
          });

          // ✅ Update local user state
          get().updateProfileLocal({
            avatar: uploadedAvatarUrl,
            profile_picture: uploadedAvatarUrl,
            language_id: onboardingData.language_id,
            state_id: onboardingData.state_id,
            district_id: onboardingData.district_id,
            city_id: onboardingData.city_id,
            category_ids: onboardingData.category_ids,
          });

          // ✅ Mark onboarding complete and clear temp data
          set({
            isOnboarded: true,
            isLoading: false,
            onboardingData: {},
          });
        } catch (error: any) {
          const authError = handleAuthError(error);
          set({ isLoading: false, error: authError.message });
          throw authError;
        }
      },

      clearError: () => set({ error: null }),
      isPublisher: () => (get().user?.role ?? 0) >= 2,
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
        pendingPhone: state.pendingPhone,
        pendingVerificationId: state.pendingVerificationId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          state.user = sanitizeUser(state.user as any);
        }
      },
    }
  )
);
