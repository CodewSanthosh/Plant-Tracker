import { useState } from 'react';
import { loginUser, registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LoginForm = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
        data = await registerUser(email.trim(), password);
      } else {
        data = await loginUser(email.trim(), password);
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

  return (
    <div className="login-card glass-strong" id="login-card">
      <div className="login-card__header">
        <span className="login-card__icon">🌱</span>
        <h2 className="login-card__title">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="login-card__subtitle">
          {isRegister
            ? 'Set up your Plant Tracker account'
            : 'Sign in to your Plant Tracker'}
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
    </div>
  );
};

export default LoginForm;
