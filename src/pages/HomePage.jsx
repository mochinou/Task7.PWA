import { ArrowRight, Database, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ProductsLoadingSkeleton } from '../components/FeedbackStates';
import { useAuth } from '../hooks/useAuth';
import { useProductCategories, useProductsList } from '../hooks/useProducts';
import { useOfflineRedirect } from '../hooks/usePwa';

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const featuredQuery = useProductsList({
    page: 1,
    limit: 3,
    sortBy: 'rating',
    order: 'desc',
  });
  const { data: featuredData, isLoading } = featuredQuery;

  // First visit while offline (nothing cached yet) -> dedicated offline page.
  useOfflineRedirect(featuredQuery);
  const { data: categories = [] } = useProductCategories();

  return (
    <div>
      <section className="hero-card">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} />
            React Router + TanStack Query + Firebase
          </span>
          <h1 className="hero-title">
            Explore Curated Tech &amp; Lifestyle Products
          </h1>
          <p className="hero-subtitle">
            Browse a responsive product catalog with URL-synced search,
            category filtering, sorting, pagination, intelligent server-data
            caching, and persistent Firebase authentication.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-lg btn-primary">
              Browse Catalog
              <ArrowRight size={17} />
            </Link>
            {isAuthenticated ? (
              <Link to="/profile" className="btn btn-lg btn-secondary">
                View My Profile
              </Link>
            ) : (
              <Link to="/signup" className="btn btn-lg btn-secondary">
                Create Free Account
              </Link>
            )}
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <Database
              size={20}
              style={{ color: 'var(--primary)', marginBottom: '0.4rem' }}
            />
            <div className="stat-value">2 min TTL</div>
            <div className="stat-label">Smart Query Cache Freshness</div>
          </div>
          <div className="stat-card">
            <ShieldCheck
              size={20}
              style={{ color: 'var(--success)', marginBottom: '0.4rem' }}
            />
            <div className="stat-value">Firebase</div>
            <div className="stat-label">Email &amp; Google Sign-In</div>
          </div>
          <div className="stat-card">
            <Lock
              size={20}
              style={{ color: 'var(--warning)', marginBottom: '0.4rem' }}
            />
            <div className="stat-value">Protected</div>
            <div className="stat-label">Persistent Session Routes</div>
          </div>
          <div className="stat-card">
            <Sparkles
              size={20}
              style={{ color: 'var(--primary)', marginBottom: '0.4rem' }}
            />
            <div className="stat-value">190+ Items</div>
            <div className="stat-label">Live REST API + CRUD</div>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="page-header" style={{ marginBottom: '0.9rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                Popular Categories
              </h2>
              <p className="page-subtitle">
                Jump directly into a filtered catalog view
              </p>
            </div>
          </div>
          <div className="category-pills">
            {categories.slice(0, 10).map((cat) => (
              <Link
                key={cat}
                to={`/products?category=${encodeURIComponent(cat)}`}
                className="category-pill-link"
              >
                {String(cat).replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="page-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem' }}>
              Top-Rated Products
            </h2>
            <p className="page-subtitle">
              Cached via TanStack Query for instant navigation
            </p>
          </div>
          <Link to="/products" className="btn btn-sm btn-secondary">
            View All Products
            <ArrowRight size={14} />
          </Link>
        </div>

        {!featuredData && isLoading ? (
          <ProductsLoadingSkeleton count={3} />
        ) : (
          <div className="products-grid">
            {(featuredData?.products || []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
