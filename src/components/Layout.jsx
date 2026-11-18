import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';
import { NetworkBanner, UpdatePrompt } from './PwaStatus';

export function Layout() {
  return (
    <div className="app-shell">
      <NavBar />
      <NetworkBanner />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <span>
            <strong>NovaStore</strong> — React Router, TanStack Query Caching &amp;
            Firebase Authentication
          </span>
          <span>Installable PWA · Powered by Vite + DummyJSON REST API</span>
        </div>
      </footer>
      <UpdatePrompt />
    </div>
  );
}
