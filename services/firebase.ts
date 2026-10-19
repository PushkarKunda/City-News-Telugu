// services/firebase.ts
import {
  getAuth,
  GoogleAuthProvider,
  PhoneAuthProvider,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';

export const firebaseAuth = getAuth();

// ─── Check Firebase Connection ────────────────────────────────────────────────
export const checkFirebaseConnection = async (): Promise<void> => {
  try {
    console.log('✅ Firebase Connected:', firebaseAuth.app.name);
    console.log('🔑 Project:', firebaseAuth.app.options.projectId);
    console.log('👤 Current User:', firebaseAuth.currentUser?.uid ?? 'None');
  } catch (error: any) {
    console.error('❌ Firebase Connection Error:', error.message);
  }
};

// ─── Phone Auth - Send OTP ──────────────────────────────────────────────────

export const sendPhoneOTP = async (
  phoneNumber: string
): Promise<FirebaseAuthTypes.ConfirmationResult> => {
  try {
    console.log('📱 Sending OTP to:', phoneNumber);
    const confirmation = await firebaseAuth.signInWithPhoneNumber(phoneNumber);
    console.log('✅ OTP Sent');
    return confirmation;
  } catch (error: any) {
    console.error('❌ OTP Send Failed:', error.message, error.code);
    throw error;
  }
};

// ─── Phone Auth - Verify OTP ────────────────────────────────────────────────

export const verifyPhoneOTP = async (
  confirmationOrVerificationId: FirebaseAuthTypes.ConfirmationResult | string,
  otp: string
): Promise<string> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    let userCredential;

    if (currentUser) {
      console.log('🔗 Linking phone to existing user...');
      const credential =
        typeof confirmationOrVerificationId === 'string'
          ? PhoneAuthProvider.credential(confirmationOrVerificationId, otp)
          : PhoneAuthProvider.credential(
            confirmationOrVerificationId.verificationId,
            otp
          );

      try {
        userCredential = await currentUser.linkWithCredential(credential);
        console.log('✅ Phone linked successfully');
      } catch (linkError: any) {
        // FIX: Also check for 'auth/unknown' with the specific message, as Firebase Android sometimes uses this instead of the specific code
        const isAlreadyLinked =
          linkError.code === 'auth/provider-already-linked' ||
          linkError.code === 'auth/credential-already-in-use' ||
          (linkError.code === 'auth/unknown' && linkError.message?.includes('already been linked'));

        if (isAlreadyLinked) {
          console.log('ℹ️ Phone already linked, fetching fresh token');
          return await currentUser.getIdToken(true);
        }
        throw linkError;
      }
    } else {
      console.log('📱 Verifying OTP...');
      if (typeof confirmationOrVerificationId === 'string') {
        const credential = PhoneAuthProvider.credential(
          confirmationOrVerificationId,
          otp
        );
        userCredential = await firebaseAuth.signInWithCredential(credential);
      } else {
        userCredential = await confirmationOrVerificationId.confirm(otp);
      }
      console.log('✅ OTP Verified');
    }

    if (!userCredential?.user) throw new Error('Verification failed');
    const firebaseToken = await userCredential.user.getIdToken(true);
    return firebaseToken;
  } catch (error: any) {
    console.error('❌ OTP Verify Failed:', error.message, error.code);
    throw error;
  }
};

// ─── Google Sign-In ─────────────────────────────────────────────────────────

export const signInWithGoogle = async (idToken: string): Promise<string> => {
  try {
    console.log('🔐 Signing in with Google...');
    const googleCredential = GoogleAuthProvider.credential(idToken);
    const userCredential = await firebaseAuth.signInWithCredential(googleCredential);
    const firebaseToken = await userCredential.user.getIdToken(true);
    console.log('✅ Google Sign-In Success');
    return firebaseToken;
  } catch (error: any) {
    console.error('❌ Google Sign-In Failed:', error.message, error.code);
    throw error;
  }
};

// ─── Link Google Account ────────────────────────────────────────────────────

export const linkGoogleAccount = async (idToken: string): Promise<string> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('No user signed in to link Google account');
    }

    console.log('🔗 Linking Google account...');
    const googleCredential = GoogleAuthProvider.credential(idToken);
    let firebaseToken: string;
    try {
      const userCredential = await currentUser.linkWithCredential(googleCredential);
      firebaseToken = await userCredential.user.getIdToken(true);
    } catch (linkError: any) {
      const isAlreadyLinked =
        linkError.code === 'auth/credential-already-in-use' ||
        linkError.code === 'auth/provider-already-linked' ||
        (linkError.code === 'auth/unknown' && linkError.message?.includes('already been linked')) ||
        linkError.message?.includes('already linked');

      if (isAlreadyLinked) {
        console.log('ℹ️ Google already linked in Firebase, getting fresh ID token...');
        return await currentUser.getIdToken(true);
      }
      throw linkError;
    }
    console.log('✅ Google Account Linked');
    return firebaseToken;
  } catch (error: any) {
    console.error('❌ Google Link Failed:', error.message, error.code);
    throw error;
  }
};

// ─── Link Phone Number ──────────────────────────────────────────────────────

export const linkPhoneNumber = async (
  verificationId: string,
  otp: string
): Promise<string> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('No user signed in to link phone number');
    }

    console.log('🔗 Linking phone number...');
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    const userCredential = await currentUser.linkWithCredential(credential);
    const firebaseToken = await userCredential.user.getIdToken(true);
    console.log('✅ Phone Number Linked');
    return firebaseToken;
  } catch (error: any) {
    console.error('❌ Phone Link Failed:', error.message, error.code);
    throw error;
  }
};

// ─── Sign Out ───────────────────────────────────────────────────────────────

export const firebaseSignOut = async (): Promise<void> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      await firebaseAuth.signOut();
      console.log('✅ Firebase Sign Out');
    }
  } catch (error: any) {
    console.error('❌ Sign Out Failed:', error.message);
  }
};

// ─── Get Current Token ──────────────────────────────────────────────────────

export const getCurrentFirebaseToken = async (): Promise<string | null> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken(true);
  } catch {
    return null;
  }
};

export default firebaseAuth;