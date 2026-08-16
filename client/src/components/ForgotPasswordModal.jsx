import { useState } from 'react';
import { forgotPassword, resetPassword } from '../services/api';

const ForgotPasswordModal = ({ onClose, onResetSuccess }) => {
  // Stage: 'request' → enter email, 'reset' → enter token + new password
  const [stage, setStage] = useState('request');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  // Store the dev token if SMTP is not configured
  const [devToken, setDevToken] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const data = await forgotPassword(email.trim());
      setMessage(data.message);

      // If the server returned a dev token (no SMTP), pre-fill it
      if (data.resetToken) {
        setDevToken(data.resetToken);
        setResetToken(data.resetToken);
      }

      setStage('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!resetToken.trim()) {
      setError('Please enter the reset token');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword(resetToken.trim(), newPassword);
      setMessage(data.message);

      // After 2 seconds, close the modal
      setTimeout(() => {
        if (onResetSuccess) onResetSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      padding: '20px'
    }}>
      <div className="login-card glass-strong" style={{ maxWidth: '440px', width: '100%', animation: 'slideUp 0.3s ease-out' }}>
        <div className="login-card__header">
          <span className="login-card__icon">🔑</span>
          <h2 className="login-card__title">
            {stage === 'request' ? 'Forgot Password' : 'Reset Password'}
          </h2>
          <p className="login-card__subtitle">
            {stage === 'request'
              ? 'Enter your email address and we\'ll send you a reset link.'
              : 'Enter the reset token and your new password.'}
          </p>
        </div>

        {stage === 'request' ? (
          <form onSubmit={handleRequestReset}>
            <div className="form-group">
              <label htmlFor="forgot-email">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                id="forgot-email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: 'var(--space-4)' }}
            >
              {loading ? 'Sending…' : '📧 Send Reset Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            {devToken && (
              <div className="form-success" style={{ marginBottom: 'var(--space-4)', fontSize: '0.85rem' }}>
                ⚠️ Dev mode: Reset token has been pre-filled below.
              </div>
            )}

            <div className="form-group">
              <label htmlFor="reset-token">
                Reset Token <span className="required">*</span>
              </label>
              <input
                type="text"
                id="reset-token"
                className="form-input"
                placeholder="Paste your reset token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">
                New Password <span className="required">*</span>
              </label>
              <input
                type="password"
                id="new-password"
                className="form-input"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">
                Confirm Password <span className="required">*</span>
              </label>
              <input
                type="password"
                id="confirm-password"
                className="form-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: 'var(--space-4)' }}
            >
              {loading ? 'Resetting…' : '🔐 Reset Password'}
            </button>

            <div className="form-toggle" style={{ marginTop: 'var(--space-3)' }}>
              <button type="button" onClick={() => { setStage('request'); setError(''); setMessage(''); }}>
                ← Back to email entry
              </button>
            </div>
          </form>
        )}

        <div className="form-toggle" style={{ marginTop: 'var(--space-3)' }}>
          <button type="button" onClick={onClose}>
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
