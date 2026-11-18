import { AlertCircle, Inbox, Info, Loader2, RefreshCw } from 'lucide-react';

export function AuthLoadingScreen() {
  return (
    <div className="state-box" role="status" aria-live="polite">
      <Loader2
        size={34}
        className="spin"
        style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}
      />
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem' }}>
        Restoring your session...
      </h3>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Checking authentication state
      </p>
    </div>
  );
}

export function ProductsLoadingSkeleton({ count = 9 }) {
  return (
    <div className="products-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="product-card">
          <div className="skeleton" style={{ aspectRatio: '4 / 3', borderRadius: 0 }} />
          <div className="product-body">
            <div
              className="skeleton"
              style={{ height: '14px', width: '40%', marginBottom: '0.6rem' }}
            />
            <div
              className="skeleton"
              style={{ height: '20px', width: '80%', marginBottom: '0.5rem' }}
            />
            <div
              className="skeleton"
              style={{ height: '14px', width: '95%', marginBottom: '0.35rem' }}
            />
            <div
              className="skeleton"
              style={{ height: '14px', width: '70%', marginBottom: '1.1rem' }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'auto',
              }}
            >
              <div className="skeleton" style={{ height: '24px', width: '70px' }} />
              <div className="skeleton" style={{ height: '34px', width: '96px' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailLoadingSkeleton() {
  return (
    <div className="detail-card" aria-busy="true">
      <div className="skeleton" style={{ aspectRatio: '4 / 3', width: '100%' }} />
      <div>
        <div
          className="skeleton"
          style={{ height: '24px', width: '110px', marginBottom: '0.85rem' }}
        />
        <div
          className="skeleton"
          style={{ height: '34px', width: '75%', marginBottom: '0.75rem' }}
        />
        <div
          className="skeleton"
          style={{ height: '16px', width: '95%', marginBottom: '0.4rem' }}
        />
        <div
          className="skeleton"
          style={{ height: '16px', width: '85%', marginBottom: '1.5rem' }}
        />
        <div className="detail-specs">
          <div className="skeleton" style={{ height: '64px' }} />
          <div className="skeleton" style={{ height: '64px' }} />
          <div className="skeleton" style={{ height: '64px' }} />
          <div className="skeleton" style={{ height: '64px' }} />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ title = 'Unable to load data', message, onRetry }) {
  return (
    <div className="state-box" role="alert">
      <AlertCircle
        size={38}
        style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}
      />
      <h3 style={{ margin: '0 0 0.45rem', fontSize: '1.2rem' }}>{title}</h3>
      <p
        style={{
          margin: '0 0 1.25rem',
          color: 'var(--text-secondary)',
          fontSize: '0.92rem',
        }}
      >
        {message || 'Something went wrong while communicating with the server.'}
      </p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = 'No matching products found',
  message = 'Try adjusting your search keywords or clearing active category filters.',
  onReset,
}) {
  return (
    <div className="state-box">
      <Inbox
        size={40}
        style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}
      />
      <h3 style={{ margin: '0 0 0.45rem', fontSize: '1.2rem' }}>{title}</h3>
      <p
        style={{
          margin: '0 0 1.25rem',
          color: 'var(--text-secondary)',
          fontSize: '0.92rem',
        }}
      >
        {message}
      </p>
      {onReset && (
        <button type="button" className="btn btn-secondary" onClick={onReset}>
          Clear All Filters
        </button>
      )}
    </div>
  );
}

export function FirebaseConfigBanner({ isFirebaseConfigured }) {
  if (isFirebaseConfigured) return null;

  return (
    <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
      <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        <strong>Demo Auth Mode Active:</strong> Add your real{' '}
        <code>VITE_FIREBASE_*</code> keys in <code>.env.local</code> to switch
        automatically to live Firebase Authentication.
      </div>
    </div>
  );
}
