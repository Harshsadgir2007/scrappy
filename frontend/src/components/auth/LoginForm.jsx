import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import logoSvg from '../../assets/logo.svg';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'warning');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      addToast('Logged in successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to login. Please check credentials.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="scrappy-card"
      style={{
        maxWidth: '440px',
        width: '100%',
        padding: '36px',
        boxShadow: '0 8px 32px rgba(20, 45, 37, 0.08)',
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img
          src={logoSvg}
          alt="Scrappy"
          style={{ width: '44px', height: '44px', margin: '0 auto 12px' }}
        />
        <h2 style={{ fontSize: '24px', color: '#142D25', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          scrappy
        </h2>
        <span
          style={{
            display: 'block',
            fontSize: '10px',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#7B958B',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            marginTop: '4px',
          }}
        >
          Turn surplus into opportunity
        </span>
        <p style={{ color: '#68756D', fontSize: '13px', marginTop: '10px', marginBottom: 0 }}>
          Sign in to access cluster exchange & circular intelligence
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#252D29', marginBottom: '6px' }}>
            Enterprise Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@plant.com"
            required
            className="scrappy-input"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#252D29', marginBottom: '6px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="scrappy-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '4px' }}
        >
          {loading ? 'Authenticating...' : 'Sign In to Console'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#68756D' }}>
        New industrial facility?{' '}
        <Link to="/register" style={{ color: '#142D25', fontWeight: 700, textDecoration: 'underline' }}>
          Register enterprise plant
        </Link>
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '14px',
          backgroundColor: '#F4F4EB',
          border: '1px solid #E1E6DF',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#252D29',
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: '10px',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#68756D',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: '6px',
          }}
        >
          Demo Corridor Accounts:
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
          <div>
            • <strong>Admin:</strong> admin@scrappy.com / admin123
          </div>
          <div>
            • <strong>GreenSteel:</strong> seller@greensteel.com / seller123
          </div>
          <div>
            • <strong>EcoBuild:</strong> buyer@ecobuild.com / buyer123
          </div>
          <div>
            • <strong>TexTech:</strong> ops@textech.com / textech123
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
