// store/authStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
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
}

type RawUser = Omit<User, 'is_suspended' | 'created_at' | 'profile_picture'> & {
  is_suspended?: boolean;
  created_at?: string;
  role_name?: string;
  is_new_user?: boolean;
  profile_picture?: string | null;
  categories?: Array<{ id: number; name: string; slug?: string | null }>;
};

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

  return {
    ...user,
    is_suspended: user.is_suspended ?? false,
    created_at: user.created_at ?? new Date().toISOString(),
    name: updatedName,
    phone: updatedPhone,
    phoneNumber: updatedPhone ?? null,
    mobile_verified: user.mobile_verified === true,
    isPublisher: user.role >= 2,
    avatar: profilePicture,
    profile_picture: profilePicture,
    language: user.language ?? user.language_name ?? null,
    state: user.state ?? user.state_name ?? null,
    district: user.district ?? user.district_name ?? null,
    interests: user.interests ?? null,
    category_ids: user.category_ids ?? user.categories?.map((category) => category.id) ?? null,
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

const handleAuthError = (error: any): AuthError => {
  const serverDetail = error?.response?.data?.detail || error?.response?.data?.message;
  if (serverDetail) {
    return new AuthError(serverDetail, error?.response?.data?.code || 'SERVER_ERROR');
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
    error.message || 'Authentication failed',
    error.code || 'UNKNOWN_ERROR'
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
          console.error('[authStore] fetchPreferences failed:', error);
          throw error;
        }
      },

      // ✅ NEW: Update cached preferences locally
      updateCachedPreferences: (updates: Partial<UserPreferences>) => {
        set((state) => ({
          cachedPreferences: state.cachedPreferences
            ? { ...state.cachedPreferences, ...updates }
            : null,
        }));
      },

      fetchUser: async (): Promise<User | null> => {
        try {
          const token = await getAuthToken();
          if (!token) {
            set({ user: null, isAuthenticated: false });
            return null;
          }
          const res = await usersApi.me();
          if (res && res.user_uid) {
            const sanitized = sanitizeUser(res as any);
            set({
              user: sanitized,
              isAuthenticated: true,
              isOnboarded: true,
            });
            return sanitized;
          }
          return null;
        } catch (err) {
          console.warn('[authStore] fetchUser failed:', err);
          return null;
        }
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
        set({ isLoading: true, error: null });
        try {
          await checkNetwork();
          const firebaseToken = await firebaseGoogleSignIn(idToken);
          const response = await authApi.loginWithFirebase(firebaseToken);

          set({
            user: sanitizeUser(response.user),
            isAuthenticated: true,
            isOnboarded: !(response.user?.is_new_user ?? response.is_new_user),
            isLoading: false,
          });

          return response;
        } catch (error: any) {
          const authError = handleAuthError(error);
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
          const response = await authApi.loginWithFirebase(firebaseToken);

          set({
            user: sanitizeUser(response.user),
            isLoading: false,
          });

          return response;
        } catch (error: any) {
          const authError = handleAuthError(error);
          set({ isLoading: false, error: authError.message });
          throw authError;
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
              const currentUser = auth().currentUser;
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
        if (get().isLoading) return;
        set({ isLoading: true });
        try {
          const token = await getAuthToken();
          if (token) {
            await authApi.logout();
          }
        } catch {
          // Continue even if API fails
        } finally {
          await firebaseSignOut();
          await clearTokens();
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
            onboardingData: {}, // ✅ Clear onboarding data
            cachedPreferences: null, // ✅ Clear cache on logout
          });
        }
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
        set((state) => ({
          user: state.user ? sanitizeUser({ ...state.user, ...updates }) : null,
        }));
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
    }
  )
);