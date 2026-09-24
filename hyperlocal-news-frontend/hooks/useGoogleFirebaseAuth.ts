// hooks/useGoogleFirebaseAuth.ts
import { useCallback, useEffect, useState } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';
import { BackendLoginResponse } from '@/services/api';

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
  const { loginWithGoogle, linkGoogle, isAuthenticated, isLoading } = useAuthStore();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const configure = async () => {
      try {
        await GoogleSignin.configure({
          webClientId,
          offlineAccess: false,
        });
        console.log('✅ Google Sign-In configured');
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

    setIsGoogleLoading(true);
    console.log('🚀 Starting Google Sign-In...');

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      // Handle v16+ cancellation response
      if (userInfo.type === 'cancelled') {
        console.log('🚫 User cancelled Google Sign-In');
        return;
      }

      const idToken = userInfo.data?.idToken ?? (userInfo as any)?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google. Please verify configuration.');
      }

      let backendResponse;

      // ✅ FIXED: Properly handle linking vs new sign-in
      if (isAuthenticated) {
        console.log('🔗 Linking Google to existing account...');
        backendResponse = await linkGoogle(idToken);
      } else {
        console.log('🚀 New Google Sign-In...');
        backendResponse = await loginWithGoogle(idToken);
      }

      console.log('✅ Google auth successful');
      options.onSuccess?.(backendResponse);
    } catch (error: any) {
      console.error('❌ Google Sign-In failed:', error.message, error.code);

      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === 'SIGN_IN_CANCELLED' ||
        error.message?.includes('cancelled')
      ) {
        console.log('🚫 User cancelled');
        return; // Silent cancel
      }

      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        options.onError?.(new Error('Google Play Services is not available or outdated on this device.'));
        return;
      }

      if (error.code === statusCodes.IN_PROGRESS) {
        console.log('⏳ Google Sign-In already in progress');
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
        console.error(developerMsg);
        options.onError?.(new Error(developerMsg));
        return;
      }

      options.onError?.(error);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [isConfigured, isAuthenticated, loginWithGoogle, linkGoogle, options]);

  return {
    signInWithGoogle,
    isGoogleReady: isConfigured,
    isGoogleLoading: isGoogleLoading,
  };
}