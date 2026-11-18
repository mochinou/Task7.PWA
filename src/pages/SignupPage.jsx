import { AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  AuthLoadingScreen,
  FirebaseConfigBanner,
} from '../components/FeedbackStates';
import { useAuth } from '../hooks/useAuth';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.03-4.38 3.03-7.51 0-.72-.06-1.42-.19-2H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.98-3.45.98-2.65 0-4.9-1.79-5.7-4.2l-3.4 2.62C4.57 19.69 8.01 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.3 13.75A6.01 6.01 0 0 1 6 12c0-.61.11-1.2.3-1.75L2.9 7.63A9.96 9.96 0 0 0 2 12c0 1.61.39 3.14 1.07 4.37l3.23-2.62z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.05c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.05 3.02 14.75 2 12 2 8.01 2 4.57 4.31 2.9 7.63l3.4 2.62c.8-2.41 3.05-4.2 5.7-4.2z"
      />
    </svg>
  );
}

export function SignupPage() {
  const {
    isAuthenticated,
    loading,
    authActionLoading,
    error,
    clearError,
    signup,
    googleSignIn,
    isFirebaseConfigured,
  } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  const validateForm = () => {
    const errors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailPattern.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!validateForm()) return;

    try {
      await signup(email, password);
      navigate('/profile', { replace: true });
    } catch {
      // Error state is handled by AuthContext
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setFieldErrors({});
    try {
      await googleSignIn();
      navigate('/profile', { replace: true });
    } catch {
      // Error state is handled by AuthContext
    }
  };

  return (
    <div className="auth-wrapper">
      <FirebaseConfigBanner isFirebaseConfigured={isFirebaseConfigured} />

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">
            Sign up with your email and password or Google account
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="signup-email" className="form-label">
              Email Address
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              className={`input ${fieldErrors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
            />
            {fieldErrors.email && (
              <p className="field-error">{fieldErrors.email}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="signup-password" className="form-label">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              className={`input ${fieldErrors.password ? 'input-error' : ''}`}
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
            />
            {fieldErrors.password && (
              <p className="field-error">{fieldErrors.password}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="signup-confirm-password" className="form-label">
              Confirm Password
            </label>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              className={`input ${
                fieldErrors.confirmPassword ? 'input-error' : ''
              }`}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
              }}
            />
            {fieldErrors.confirmPassword && (
              <p className="field-error">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={authActionLoading}
            style={{ marginTop: '0.25rem' }}
          >
            {authActionLoading ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <UserPlus size={18} />
            )}
            Create Account
          </button>
        </form>

        <div className="divider">or sign up with</div>

        <button
          type="button"
          className="btn btn-secondary btn-full btn-lg"
          onClick={handleGoogleSignIn}
          disabled={authActionLoading}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="text-link">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
