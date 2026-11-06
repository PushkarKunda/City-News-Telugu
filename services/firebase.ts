// services/firebase.ts
import {
  getAuth,
  signInWithPhoneNumber,
  getIdToken,
  signInWithCredential,
  linkWithCredential,
  signOut,
  GoogleAuthProvider,
  PhoneAuthProvider,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';

export const firebaseAuth = getAuth();

// ─── Check Firebase Connection ────────────────────────────────────────────────
export const checkFirebaseConnection = async (): Promise<void> => {
  try {
    // Accessing the app instance forces the native Firebase module to
    // initialise at startup and surfaces configuration errors early.
    void firebaseAuth.app.name;
  } catch (error: any) {
    console.error('❌ Firebase Connection Error:', error.message);
  }
};

// ─── Phone Auth - Send OTP ──────────────────────────────────────────────────

export const sendPhoneOTP = async (
  phoneNumber: string
): Promise<FirebaseAuthTypes.ConfirmationResult> => {
  try {
    const confirmation = await signInWithPhoneNumber(firebaseAuth, phoneNumber);
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
      const credential =
        typeof confirmationOrVerificationId === 'string'
          ? PhoneAuthProvider.credential(confirmationOrVerificationId, otp)
          : PhoneAuthProvider.credential(
            confirmationOrVerificationId.verificationId,
            otp
          );

      try {
        userCredential = await linkWithCredential(currentUser, credential);
      } catch (linkError: any) {
        // FIX: Also check for 'auth/unknown' with the specific message, as Firebase Android sometimes uses this instead of the specific code
        const isAlreadyLinked =
          linkError.code === 'auth/provider-already-linked' ||
          linkError.code === 'auth/credential-already-in-use' ||
          (linkError.code === 'auth/unknown' && linkError.message?.includes('already been linked'));

        if (isAlreadyLinked) {
          return await getIdToken(currentUser, true);
        }
        throw linkError;
      }
    } else {
      if (typeof confirmationOrVerificationId === 'string') {
        const credential = PhoneAuthProvider.credential(
          confirmationOrVerificationId,
          otp
        );
        userCredential = await signInWithCredential(firebaseAuth, credential);
      } else {
        userCredential = await confirmationOrVerificationId.confirm(otp);
      }
    }

    if (!userCredential?.user) throw new Error('Verification failed');
    const firebaseToken = await getIdToken(userCredential.user, true);
    return firebaseToken;
  } catch (error: any) {
    console.error('❌ OTP Verify Failed:', error.message, error.code);
    throw error;
  }
};

// ─── Google Sign-In ─────────────────────────────────────────────────────────

export const signInWithGoogle = async (idToken: string): Promise<string> => {
  try {
    const googleCredential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(firebaseAuth, googleCredential);
    const firebaseToken = await getIdToken(userCredential.user, true);
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

    const googleCredential = GoogleAuthProvider.credential(idToken);
    let firebaseToken: string;
    try {
      const userCredential = await linkWithCredential(currentUser, googleCredential);
      firebaseToken = await getIdToken(userCredential.user, true);
    } catch (linkError: any) {
      const isAlreadyLinked =
        linkError.code === 'auth/credential-already-in-use' ||
        linkError.code === 'auth/provider-already-linked' ||
        (linkError.code === 'auth/unknown' && linkError.message?.includes('already been linked')) ||
        linkError.message?.includes('already linked');

      if (isAlreadyLinked) {
        return await getIdToken(currentUser, true);
      }
      throw linkError;
    }
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

    const credential = PhoneAuthProvider.credential(verificationId, otp);
    const userCredential = await linkWithCredential(currentUser, credential);
    const firebaseToken = await getIdToken(userCredential.user, true);
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
      await signOut(firebaseAuth);
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
    return await getIdToken(currentUser, true);
  } catch {
    return null;
  }
};

export default firebaseAuth;
