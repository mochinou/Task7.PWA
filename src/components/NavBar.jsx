import { Info, LayoutGrid, Home, LogIn, LogOut, Menu, User, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ConnectivityIndicator, InstallButton } from './PwaStatus';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/products', label: 'Catalog', icon: LayoutGrid },
  { to: '/about', label: 'About', icon: Info },
];

export function NavBar() {
  const { user, isAuthenticated, loading, authActionLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // The menu remembers the route it was opened on, so navigating closes it automatically.
  const currentRoute = `${location.pathname}${location.search}`;
  const [openedOnRoute, setOpenedOnRoute] = useState(null);
  const menuOpen = openedOnRoute === currentRoute;
  const setMenuOpen = (next) => {
    setOpenedOnRoute((prev) => {
      const shouldOpen = typeof next === 'function' ? next(prev === currentRoute) : next;
      return shouldOpen ? currentRoute : null;
    });
  };

  // Escape closes the menu; body scroll is locked while it is open.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenedOnRoute(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  // Close the drawer if the viewport grows to desktop size (e.g. rotation).
  useEffect(() => {
    const media = window.matchMedia('(min-width: 861px)');
    const onChange = (event) => {
      if (event.matches) setOpenedOnRoute(null);
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      // Handled via AuthContext error state
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand-link">
          <span className="brand-mark">N</span>
          <span>NovaStore</span>
        </Link>

        <nav className="nav-links desktop-only" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-right">
          <ConnectivityIndicator />

          <div className="nav-auth desktop-only">
            <InstallButton />
            {loading ? (
              <div
                className="skeleton"
                style={{ width: '150px', height: '36px', borderRadius: '8px' }}
              />
            ) : isAuthenticated ? (
              <>
                <span className="user-pill" title={user?.email}>
                  <User size={14} />
                  {user?.email}
                </span>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`
                  }
                >
                  <User size={15} />
                  Profile
                </NavLink>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={handleLogout}
                  disabled={authActionLoading}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `btn btn-sm ${isActive ? 'btn-secondary' : 'btn-ghost'}`
                  }
                >
                  <LogIn size={15} />
                  Login
                </NavLink>
                <NavLink to="/signup" className="btn btn-sm btn-primary">
                  <UserPlus size={15} />
                  Signup
                </NavLink>
              </>
            )}
          </div>

          <button
            type="button"
            className="menu-toggle mobile-only"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="mobile-menu-backdrop mobile-only"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="mobile-menu"
        className={`mobile-menu mobile-only ${menuOpen ? 'open' : ''}`}
        hidden={!menuOpen}
      >
        <nav className="mobile-menu-links" aria-label="Mobile navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mobile-menu-section">
          {loading ? (
            <div className="skeleton" style={{ height: '44px' }} />
          ) : isAuthenticated ? (
            <>
              <div className="mobile-user" title={user?.email}>
                <User size={16} />
                <span>{user?.email}</span>
              </div>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `btn btn-full ${isActive ? 'btn-primary' : 'btn-secondary'}`
                }
              >
                <User size={16} />
                Profile
              </NavLink>
              <button
                type="button"
                className="btn btn-full btn-danger"
                onClick={handleLogout}
                disabled={authActionLoading}
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <div className="mobile-auth-row">
              <NavLink to="/login" className="btn btn-secondary">
                <LogIn size={16} />
                Login
              </NavLink>
              <NavLink to="/signup" className="btn btn-primary">
                <UserPlus size={16} />
                Signup
              </NavLink>
            </div>
          )}
          <InstallButton className="btn btn-secondary" fullWidth />
        </div>
      </div>
    </header>
  );
}
