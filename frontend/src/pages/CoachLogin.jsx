import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coachLogin, saveToken } from '../api';
import Toast, { showToast } from '../components/Toast';

export default function CoachLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      showToast('Email and password are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await coachLogin(form.email.trim(), form.password);
      saveToken(res.token, 'coach');
      showToast('Welcome back!', 'success');
      setTimeout(() => navigate('/coach/dashboard'), 800);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <Toast />

      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '30px',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            marginBottom: '8px',
          }}>
            Coachly
          </div>
          <div style={{ fontSize: '15px', color: 'var(--muted)' }}>
            Coach portal
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '36px 32px',
        }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '22px',
            fontWeight: '700',
            margin: '0 0 6px',
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 28px' }}>
            Log in to your coaching dashboard.
          </p>

          <form onSubmit={submit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '13px',
          color: 'var(--muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div>
            Don't have an account?{' '}
            <span
              style={{ color: 'var(--orange)', cursor: 'pointer', fontWeight: '600' }}
              onClick={() => navigate('/coach/signup')}
            >
              Apply as a coach
            </span>
          </div>
          <div>
            <span
              style={{ color: 'var(--orange)', cursor: 'pointer', fontWeight: '600' }}
              onClick={() => navigate('/')}
            >
              ← Back to marketplace
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
