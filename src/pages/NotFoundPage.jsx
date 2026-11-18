import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="state-box">
      <Compass
        size={44}
        style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}
      />
      <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.6rem' }}>
        404 — Page Not Found
      </h1>
      <p
        style={{
          margin: '0 0 1.35rem',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
        }}
      >
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <Link to="/" className="btn btn-primary">
          <ArrowLeft size={16} />
          Go Home
        </Link>
        <Link to="/products" className="btn btn-secondary">
          Browse Catalog
        </Link>
      </div>
    </div>
  );
}
