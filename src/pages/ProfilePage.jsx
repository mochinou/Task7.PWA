import { Check, Copy, LogOut, Mail, ShieldCheck, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FirebaseConfigBanner } from '../components/FeedbackStates';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { user, authActionLoading, logout, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [copiedUid, setCopiedUid] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      // Handled by AuthContext
    }
  };

  const handleCopyUid = async () => {
    if (!user?.uid || !navigator.clipboard) return;
    await navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const initialLetter = (
    user?.displayName?.[0] ||
    user?.email?.[0] ||
    'U'
  ).toUpperCase();

  const providerId =
    user?.providerData?.[0]?.providerId === 'google.com'
      ? 'Google (google.com)'
      : 'Email & Password';

  return (
    <div className="profile-container">
      <FirebaseConfigBanner isFirebaseConfigured={isFirebaseConfigured} />

      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">
            Protected account details managed via Firebase Authentication
          </p>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-top">
          <div className="profile-avatar-group">
            <div className="profile-avatar">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.email} />
              ) : (
                initialLetter
              )}
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.2rem' }}>
                {user?.displayName || user?.email?.split('@')[0] || 'Authenticated User'}
              </h2>
              <span className="status-badge status-fresh">
                <ShieldCheck size={13} />
                Active Persistent Session
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleLogout}
            disabled={authActionLoading}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        <div className="info-list">
          <div className="info-row">
            <div>
              <div className="info-key">Email Address</div>
              <div
                className="info-val"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  marginTop: '0.25rem',
                }}
              >
                <Mail size={15} style={{ color: 'var(--primary)' }} />
                {user?.email || 'No email available'}
              </div>
            </div>
          </div>

          <div className="info-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="info-key">Firebase User ID (UID)</div>
              <div className="info-val mono" style={{ marginTop: '0.25rem' }}>
                {user?.uid}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleCopyUid}
            >
              {copiedUid ? <Check size={14} /> : <Copy size={14} />}
              {copiedUid ? 'Copied' : 'Copy UID'}
            </button>
          </div>

          <div className="info-row">
            <div>
              <div className="info-key">Authentication Provider</div>
              <div
                className="info-val"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  marginTop: '0.25rem',
                }}
              >
                <UserCheck size={15} style={{ color: 'var(--success)' }} />
                {providerId}
              </div>
            </div>
          </div>

          {user?.metadata?.lastSignInTime && (
            <div className="info-row">
              <div>
                <div className="info-key">Last Sign-In</div>
                <div className="info-val" style={{ marginTop: '0.25rem' }}>
                  {new Date(user.metadata.lastSignInTime).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
