// hooks/useGoogleFirebaseAuth.ts
import { useCallback, useEffect, useState } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';
import { BackendLoginResponse, getUserFacingError } from '@/services/api';

interface ExpoConfig {
  extra?: {
    googleOAuth?: {
      webClientId?: string;
    };
  };
}

const expoConfig = Constants.expoConfig as ExpoConfig | null;
const webClientId =
  expoConfig?.extra?.googleOAuth?.webClientId ??
  '849371654758-oc0ne88p18ikcdamc7ns62ve8caa7n6e.apps.googleusercontent.com';

type UseGoogleFirebaseAuthOptions = {
  onSuccess?: (response: BackendLoginResponse) => void;
  onError?: (error: Error) => void;
};

export function useGoogleFirebaseAuth(options: UseGoogleFirebaseAuthOptions = {}) {
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const linkGoogle = useAuthStore((state) => state.linkGoogle);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const configure = async () => {
      try {
        await GoogleSignin.configure({
          webClientId,
          offlineAccess: false,
        });
        setIsConfigured(true);
      } catch (error: any) {
        console.error('❌ Google Sign-In config error:', error.message);
      }
    };
    configure();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isConfigured) {
      try {
        await GoogleSignin.configure({ webClientId, offlineAccess: false });
        setIsConfigured(true);
      } catch (error: any) {
        console.error('❌ Google Sign-In config error:', error.message);
        options.onError?.(new Error('Google Sign-In not ready. Please try again.'));
        return;
      }
    }

    if (isGoogleLoading) {
      return;
    }

    setIsGoogleLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      // Handle v16+ cancellation response
      if (userInfo.type === 'cancelled') {
        return;
      }

      const idToken = userInfo.data?.idToken ?? (userInfo as any)?.idToken;

      if (!idToken) {
        throw new Error('Could not complete Google sign-in. Please try again.');
      }

      let backendResponse;

      // ✅ FIXED: Properly handle linking vs new sign-in
      if (isAuthenticated) {
        backendResponse = await linkGoogle(idToken);
      } else {
        backendResponse = await loginWithGoogle(idToken);
      }

      options.onSuccess?.(backendResponse);
    } catch (error: any) {
      // Full diagnostic logging in development so the real failure is visible
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error('❌ Google Sign-In failed:', {
          message: error?.message,
          code: error?.code,
          name: error?.name,
          status: error?.status ?? error?.response?.status,
          endpoint: error?.endpoint,
          serverDetail: error?.response?.data?.detail,
          full: error,
        });
      }

      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === 'SIGN_IN_CANCELLED' ||
        error.message?.includes('cancelled')
      ) {
        return; // Silent cancel
      }

      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        options.onError?.(
          new Error('Google Play Services is not available or outdated on this device.')
        );
        return;
      }

      if (error.code === statusCodes.IN_PROGRESS) {
        return;
      }

      // Actionable diagnostic message for DEVELOPER_ERROR (code 10)
      if (
        error.code === '10' ||
        error.code === 'DEVELOPER_ERROR' ||
        error.message?.includes('DEVELOPER_ERROR')
      ) {
        const developerMsg =
          'Google Sign-In configuration error (DEVELOPER_ERROR).\n\n' +
          'The debug SHA-1 fingerprint is not registered in Firebase Console.\n\n' +
          'Package: com.hypernews.app\n' +
          'Debug SHA-1:\n5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25\n\n' +
          'To fix this, add this SHA-1 in Firebase Console > Project Settings > Your Android App.';
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.error(developerMsg);
          options.onError?.(new Error(developerMsg));
        } else {
          options.onError?.(new Error("Couldn't complete sign-in, please try again."));
        }
        return;
      }

      // Route the provider error through the shared user-facing copy helper so
      // raw transport strings (e.g. "Request failed with status code 401",
      // "timeout", "Network Error") never reach the UI.
      const message = getUserFacingError(
        error instanceof Error ? error : new Error(error?.message || ''),
        "Couldn't complete sign-in, please try again."
      );

      const userFacingError = new Error(message);
      (userFacingError as any).code = 'GOOGLE_AUTH_FAILED';
      options.onError?.(userFacingError);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [isConfigured, isGoogleLoading, isAuthenticated, loginWithGoogle, linkGoogle, options]);

  return {
    signInWithGoogle,
    isGoogleReady: isConfigured,
    isGoogleLoading: isGoogleLoading,
  };
}
