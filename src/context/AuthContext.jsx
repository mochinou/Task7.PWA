import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, formatAuthError } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signup = useCallback(async (email, password, displayName = '') => {
    setError(null);
    setAuthActionLoading(true);
    try {
      const createdUser = await authService.signUpWithEmail(email, password, displayName);
      setUser(createdUser);
      return createdUser;
    } catch (err) {
      const message = formatAuthError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    setAuthActionLoading(true);
    try {
      const loggedInUser = await authService.loginWithEmail(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const message = formatAuthError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  const googleSignIn = useCallback(async () => {
    setError(null);
    setAuthActionLoading(true);
    try {
      const googleUser = await authService.signInWithGoogle();
      setUser(googleUser);
      return googleUser;
    } catch (err) {
      const message = formatAuthError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    setAuthActionLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      const message = formatAuthError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      authActionLoading,
      error,
      clearError,
      signup,
      login,
      googleSignIn,
      logout,
      isFirebaseConfigured: authService.isFirebaseConfigured,
    }),
    [
      user,
      loading,
      authActionLoading,
      error,
      clearError,
      signup,
      login,
      googleSignIn,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
