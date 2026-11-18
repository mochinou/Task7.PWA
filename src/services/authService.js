import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';
import { demoAuthAdapter } from './demoAuthAdapter';

const FIREBASE_ERROR_MESSAGES = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This user account has been disabled.',
  'auth/user-not-found': 'Invalid email or password. Please check your credentials.',
  'auth/wrong-password': 'Invalid email or password. Please check your credentials.',
  'auth/invalid-credential': 'Invalid email or password. Please check your credentials.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/weak-password': 'Password must be at least 6 characters long.',
  'auth/popup-closed-by-user': 'Google sign-in popup was closed before completing authentication.',
  'auth/cancelled-popup-request': 'Sign-in popup request was cancelled.',
  'auth/popup-blocked': 'Sign-in popup was blocked by the browser. Please allow popups for this site.',
  'auth/unauthorized-domain':
    'This domain is not authorized in Firebase Console yet. Add it under Authentication -> Settings -> Authorized domains.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
};

export function formatAuthError(error) {
  if (!error) return 'An unexpected authentication error occurred.';
  if (error.code && FIREBASE_ERROR_MESSAGES[error.code]) {
    return FIREBASE_ERROR_MESSAGES[error.code];
  }
  return error.message || 'Authentication failed. Please try again.';
}

function serializeUser(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || null,
    emailVerified: Boolean(firebaseUser.emailVerified),
    providerData: firebaseUser.providerData || [],
    metadata: {
      creationTime: firebaseUser.metadata?.creationTime || null,
      lastSignInTime: firebaseUser.metadata?.lastSignInTime || null,
    },
  };
}

export const authService = {
  isFirebaseConfigured,

  subscribeToAuthChanges(callback) {
    if (!isFirebaseConfigured) {
      return demoAuthAdapter.subscribe(callback);
    }
    return onAuthStateChanged(auth, (firebaseUser) => {
      callback(serializeUser(firebaseUser));
    });
  },

  async signUpWithEmail(email, password, displayName = '') {
    if (!isFirebaseConfigured) {
      return demoAuthAdapter.signUp(email, password, displayName);
    }

    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && displayName.trim()) {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    }
    return serializeUser(auth.currentUser || credential.user);
  },

  async loginWithEmail(email, password) {
    if (!isFirebaseConfigured) {
      return demoAuthAdapter.login(email, password);
    }

    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return serializeUser(credential.user);
  },

  async signInWithGoogle() {
    if (!isFirebaseConfigured) {
      return demoAuthAdapter.googleSignIn();
    }

    const credential = await signInWithPopup(auth, googleProvider);
    return serializeUser(credential.user);
  },

  async logout() {
    if (!isFirebaseConfigured) {
      return demoAuthAdapter.logout();
    }

    await signOut(auth);
  },
};
