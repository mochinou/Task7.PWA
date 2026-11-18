import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const PLACEHOLDER_TOKENS = new Set([
  '',
  'undefined',
  'your_api_key_here',
  'your_project_id',
  'your_app_id',
]);

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    !PLACEHOLDER_TOKENS.has(String(firebaseConfig.apiKey).trim()) &&
    firebaseConfig.authDomain &&
    !String(firebaseConfig.authDomain).includes('your_project_id') &&
    firebaseConfig.projectId &&
    !PLACEHOLDER_TOKENS.has(String(firebaseConfig.projectId).trim()) &&
    firebaseConfig.appId &&
    !PLACEHOLDER_TOKENS.has(String(firebaseConfig.appId).trim())
);

let app = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  // Persist Firebase session across browser refreshes
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Firebase persistence configuration error:', error);
  });
}

export { app, auth, googleProvider };
