import { useState } from 'react';
import { loginUser, registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LoginForm = () => {
  // Step 1 → choose role (admin / user). Step 2 → enter credentials.
  const [role, setRole] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const resetState = () => {
    setEmail('');
    setPassword('');
    setError('');
    setIsRegister(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      let data;
      if (isRegister) {
        // Registration only creates regular users
        data = await registerUser(email.trim(), password);
      } else {
        data = await loginUser(email.trim(), password, role);
      }
      login(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (isRegister ? 'Registration failed' : 'Invalid credentials')
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------- STEP 1: Role selection ----------
  if (!role) {
    return (
      <div className="login-card glass-strong" id="login-card">
        <div className="login-card__header">
          <span className="login-card__icon">🌱</span>
          <h2 className="login-card__title">Plant Tracker</h2>
          <p className="login-card__subtitle">How would you like to sign in?</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
          <button
            type="button"
            className="btn btn-primary"
            id="choose-admin"
            onClick={() => { setRole('admin'); resetState(); }}
            style={{ padding: 'var(--space-4)', fontSize: '1rem' }}
          >
            👑 Continue as Admin
          </button>
          <button
            type="button"
            className="btn btn-outline"
            id="choose-user"
            onClick={() => { setRole('user'); resetState(); }}
            style={{ padding: 'var(--space-4)', fontSize: '1rem' }}
          >
            🌿 Continue as User
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-5)' }}>
          Admins can add and manage trees. Users can view all trees and add growth updates.
        </p>
      </div>
    );
  }

  // ---------- STEP 2: Credentials ----------
  const isAdminLogin = role === 'admin';

  return (
    <div className="login-card glass-strong" id="login-card">
      <div className="login-card__header">
        <span className="login-card__icon">{isAdminLogin ? '👑' : '🌿'}</span>
        <h2 className="login-card__title">
          {isRegister
            ? 'Create Account'
            : isAdminLogin ? 'Admin Sign In' : 'User Sign In'}
        </h2>
        <p className="login-card__subtitle">
          {isRegister
            ? 'Set up your Plant Tracker user account'
            : isAdminLogin
              ? 'Sign in with your admin credentials'
              : 'Sign in to view trees and post updates'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">
            Email <span className="required">*</span>
          </label>
          <input
            type="email"
            id="email"
            className="form-input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">
            Password <span className="required">*</span>
          </label>
          <input
            type="password"
            id="password"
            className="form-input"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          id="login-submit-btn"
          style={{ marginTop: 'var(--space-6)' }}
        >
          {loading
            ? (isRegister ? 'Creating Account...' : 'Signing In...')
            : (isRegister ? '🌱 Create Account' : '🌱 Sign In')}
        </button>
      </form>

      {/* Only regular users can self-register; admins are provisioned separately */}
      {!isAdminLogin && (
        <div className="form-toggle">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            id="toggle-auth-mode"
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>
      )}

      <div className="form-toggle">
        <button
          onClick={() => { setRole(null); resetState(); }}
          id="back-to-role"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
