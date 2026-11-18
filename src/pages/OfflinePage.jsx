import { ArrowRight, CheckCircle2, Home, LayoutGrid, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useNetworkStatus } from '../hooks/usePwa';
import { checkConnection } from '../services/networkMonitor';
import { getOfflineProducts } from '../services/offlineCacheService';
import { imageCorsProps } from '../utils/image';

function safeReturnPath(raw) {
  // Only allow in-app paths (prevents open redirects via ?from=https://…)
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/offline')) {
    return '/';
  }
  return raw;
}

export function OfflinePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = safeReturnPath(searchParams.get('from'));
  const { status, checking } = useNetworkStatus();
  const isOnline = status === 'online';

  const [attempted, setAttempted] = useState(false);
  const [offlineProducts, setOfflineProducts] = useState([]);

  useEffect(() => {
    let active = true;
    getOfflineProducts(6).then((items) => {
      if (active) setOfflineProducts(items);
    });
    return () => {
      active = false;
    };
  }, []);

  // Connection restored -> automatically go back to where the user was heading.
  useEffect(() => {
    if (!isOnline || !searchParams.get('from')) return undefined;
    const timer = setTimeout(() => navigate(from, { replace: true }), 1200);
    return () => clearTimeout(timer);
  }, [isOnline, from, navigate, searchParams]);

  const handleRetry = async () => {
    setAttempted(true);
    const online = await checkConnection();
    if (online) navigate(from, { replace: true });
  };

  if (isOnline) {
    return (
      <div className="offline-page">
        <div className="offline-card">
          <div className="offline-icon offline-icon-online">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="offline-title">You&apos;re back online</h1>
          <p className="offline-text">
            The connection is working again.
            {searchParams.get('from') ? ' Taking you back…' : ''}
          </p>
          <div className="offline-actions">
            <Link to={from} replace className="btn btn-lg btn-primary">
              Continue
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="offline-page">
      <div className="offline-card">
        <div className="offline-icon">
          <WifiOff size={40} />
        </div>
        <h1 className="offline-title">You&apos;re offline</h1>
        <p className="offline-text">
          This page can&apos;t be loaded right now because there is no internet connection and
          it hasn&apos;t been saved for offline use yet. Check your Wi-Fi or mobile data and try
          again.
        </p>

        {from !== '/' && (
          <p className="offline-target">
            Requested page: <code>{from}</code>
          </p>
        )}

        <div className="offline-actions">
          <button
            type="button"
            className="btn btn-lg btn-primary"
            onClick={handleRetry}
            disabled={checking}
          >
            {checking ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
            {checking ? 'Checking connection…' : 'Retry Connection'}
          </button>
          <Link to="/" className="btn btn-lg btn-secondary">
            <Home size={18} />
            Go Home
          </Link>
        </div>

        {attempted && !checking && (
          <p className="offline-hint" role="status">
            Still offline. We&apos;ll keep checking and bring you back automatically once the
            connection returns.
          </p>
        )}
      </div>

      <section className="offline-available">
        <h2>Available offline</h2>
        <p className="page-subtitle" style={{ marginBottom: '0.9rem' }}>
          Pages and data you have already opened are stored on this device.
        </p>

        <div className="offline-links">
          <Link to="/" className="offline-link">
            <Home size={18} /> Home
          </Link>
          <Link to="/products" className="offline-link">
            <LayoutGrid size={18} /> Catalog (saved pages)
          </Link>
          <Link to="/about" className="offline-link">
            About &amp; PWA status
          </Link>
        </div>

        {offlineProducts.length > 0 && (
          <>
            <h3 className="offline-subheading">Saved products</h3>
            <ul className="offline-products">
              {offlineProducts.map((product) => (
                <li key={product.id}>
                  <Link to={`/products/${product.id}`} className="offline-product">
                    <img
                      src={product.thumbnail}
                      alt=""
                      loading="lazy"
                      {...imageCorsProps(product.thumbnail)}
                    />
                    <span className="offline-product-title">{product.title}</span>
                    <span className="offline-product-price">
                      ${Number(product.price || 0).toFixed(2)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
