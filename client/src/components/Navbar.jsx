import { useAuth } from '../context/AuthContext';

const Navbar = ({ plantCount }) => {
  const { logout, user } = useAuth();

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar__brand">
        <span className="navbar__icon">🌱</span>
        <h1 className="navbar__title">
          Plant <span>Tracker</span>
        </h1>
      </div>

      <div className="navbar__right">
        <div className="navbar__counter" id="plant-counter">
          <span>🌿 Plants Planted</span>
          <span
            className={`navbar__counter-number ${plantCount > 0 ? 'pop' : ''}`}
            key={plantCount}
          >
            {plantCount}
          </span>
        </div>

        {user && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Hi, {user.email}
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: user.role === 'admin' ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.2)',
              color: user.role === 'admin' ? '#22c55e' : '#94a3b8',
            }}>
              {user.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </span>
        )}

        <button
          className="navbar__logout"
          onClick={logout}
          id="logout-btn"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
