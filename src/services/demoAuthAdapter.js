/**
 * Fallback demo authentication adapter used ONLY when `.env.local` still
 * contains placeholder Firebase keys. Once real `VITE_FIREBASE_*` keys are
 * configured, `authService.js` uses Firebase Authentication exclusively.
 */

const SESSION_KEY = 'novastore_demo_auth_session_v1';
const USERS_KEY = 'novastore_demo_auth_users_v1';

const listeners = new Set();

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

function notifyListeners(user) {
  listeners.forEach((callback) => {
    try {
      callback(user);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  });
}

function generateUid(prefix = 'uid') {
  const randomPart = Math.random().toString(36).slice(2, 12);
  const timePart = Date.now().toString(36);
  return `${prefix}_${timePart}${randomPart}`;
}

export const demoAuthAdapter = {
  subscribe(callback) {
    listeners.add(callback);
    const currentUser = readJson(SESSION_KEY, null);
    queueMicrotask(() => callback(currentUser));
    return () => {
      listeners.delete(callback);
    };
  },

  async signUp(email, password, displayName = '') {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const normalizedEmail = email.trim().toLowerCase();
    const users = readJson(USERS_KEY, {});

    if (users[normalizedEmail]) {
      const error = new Error('Email already in use');
      error.code = 'auth/email-already-in-use';
      throw error;
    }

    if (password.length < 6) {
      const error = new Error('Weak password');
      error.code = 'auth/weak-password';
      throw error;
    }

    const nowIso = new Date().toISOString();
    const userRecord = {
      uid: generateUid('usr'),
      email: normalizedEmail,
      displayName: displayName.trim() || normalizedEmail.split('@')[0],
      photoURL: null,
      emailVerified: false,
      providerData: [{ providerId: 'password' }],
      metadata: {
        creationTime: nowIso,
        lastSignInTime: nowIso,
      },
    };

    users[normalizedEmail] = {
      ...userRecord,
      passwordHash: btoa(encodeURIComponent(password)),
    };
    writeJson(USERS_KEY, users);
    writeJson(SESSION_KEY, userRecord);
    notifyListeners(userRecord);
    return userRecord;
  },

  async login(email, password) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const normalizedEmail = email.trim().toLowerCase();
    const users = readJson(USERS_KEY, {});
    const stored = users[normalizedEmail];

    if (!stored || stored.passwordHash !== btoa(encodeURIComponent(password))) {
      const error = new Error('Invalid credentials');
      error.code = 'auth/invalid-credential';
      throw error;
    }

    const { passwordHash: _unused, ...publicUser } = stored;
    const updatedUser = {
      ...publicUser,
      metadata: {
        ...publicUser.metadata,
        lastSignInTime: new Date().toISOString(),
      },
    };

    writeJson(SESSION_KEY, updatedUser);
    notifyListeners(updatedUser);
    return updatedUser;
  },

  async googleSignIn() {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const nowIso = new Date().toISOString();
    const googleUser = {
      uid: generateUid('google'),
      email: 'demo.google.user@gmail.com',
      displayName: 'Google Demo User',
      photoURL: null,
      emailVerified: true,
      providerData: [{ providerId: 'google.com' }],
      metadata: {
        creationTime: nowIso,
        lastSignInTime: nowIso,
      },
    };

    writeJson(SESSION_KEY, googleUser);
    notifyListeners(googleUser);
    return googleUser;
  },

  async logout() {
    await new Promise((resolve) => setTimeout(resolve, 150));
    writeJson(SESSION_KEY, null);
    notifyListeners(null);
  },
};
