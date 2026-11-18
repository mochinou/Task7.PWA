import { Database, KeyRound, Layers, RefreshCw, Smartphone, WifiOff } from 'lucide-react';
import { CachingStrategiesTable, PwaDashboard } from '../components/PwaDashboard';

export function AboutPage() {
  return (
    <div className="about-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Architecture &amp; Caching Overview</h1>
          <p className="page-subtitle">
            Clean separation between UI components, custom hooks, caching, and
            Firebase authentication services.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div className="profile-card">
          <h3 className="about-card-title">
            <Smartphone size={19} style={{ color: 'var(--primary)' }} />
            Progressive Web App status
          </h3>
          <p className="about-card-text">
            NovaStore is installable and works offline. A hand-written Service Worker
            precaches the application shell, keeps previously loaded catalog data available
            offline, and notifies you when a new version is ready.
          </p>
          <PwaDashboard />
        </div>

        <div className="profile-card">
          <h3 className="about-card-title">
            <WifiOff size={19} style={{ color: 'var(--primary)' }} />
            Offline caching strategies
          </h3>
          <p className="about-card-text">
            Every resource type uses a dedicated strategy. Runtime caches are limited by entry
            count and age, and authentication traffic is never stored.
          </p>
          <CachingStrategiesTable />
        </div>

        <div className="profile-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
            <KeyRound size={19} style={{ color: 'var(--primary)' }} />
            Firebase Authentication &amp; Context
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.94rem' }}>
            Firebase is initialized in a dedicated <code>src/firebase.js</code>{' '}
            module using <code>VITE_FIREBASE_*</code> environment variables.
            Authentication state is tracked via <code>onAuthStateChanged</code>{' '}
            inside <code>AuthContext</code> with <code>browserLocalPersistence</code>{' '}
            so sessions remain active across page refreshes.
          </p>
        </div>

        <div className="profile-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
            <Database size={19} style={{ color: 'var(--primary)' }} />
            TanStack Query Caching Strategy
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.94rem' }}>
            Product lists, individual product details, and categories are cached
            using structured hierarchical query keys (e.g.{' '}
            <code>[&apos;products&apos;, &apos;list&apos;, filters]</code>). Entries
            remain fresh for <strong>2 minutes</strong> (<code>staleTime</code>)
            and expire from memory after <strong>10 minutes</strong> (
            <code>gcTime</code>) of inactivity.
          </p>
        </div>

        <div className="profile-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
            <RefreshCw size={19} style={{ color: 'var(--primary)' }} />
            Cache Invalidation &amp; Race-Condition Protection
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.94rem' }}>
            Creating, updating, or deleting a product triggers{' '}
            <code>queryClient.invalidateQueries</code> on affected query keys so
            stale entries immediately revalidate. Every query forwards TanStack
            Query&apos;s <code>AbortSignal</code> to <code>fetch</code>,
            preventing outdated in-flight requests from overwriting newer
            filter or search results.
          </p>
        </div>

        <div className="profile-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
            <Layers size={19} style={{ color: 'var(--primary)' }} />
            Strict Service Layer Separation
          </h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.94rem' }}>
            UI components never invoke <code>fetch</code> or access{' '}
            <code>localStorage</code> directly. All network requests,
            authentication providers, and caching hooks live inside{' '}
            <code>src/services/</code> and <code>src/hooks/</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
