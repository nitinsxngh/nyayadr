import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginWithAccessKey } from '../services/apiService';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await loginWithAccessKey(accessKey.trim());
      login();
      const redirectTo = location.state?.from || '/intake';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid access key');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--background)',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--primary)',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <Lock size={28} />
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Nyay ADR Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Enter the access key provided by your administrator to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="access-key">Access key</label>
          <input
            id="access-key"
            type="password"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            placeholder="Enter access key"
            autoComplete="off"
            required
            style={{ marginTop: '0.5rem', marginBottom: '1rem' }}
          />

          {error && (
            <div
              style={{
                padding: '0.75rem',
                background: '#ffebee',
                color: '#c62828',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || !accessKey.trim()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem',
            }}
          >
            <LogIn size={18} />
            {isSubmitting ? 'Verifying…' : 'Enter portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
