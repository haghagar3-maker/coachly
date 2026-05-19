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
      width: '100%',
      background: 'var(--dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{ position: 'absolute', top: '-80px', right: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'var(--lime)', opacity: 0.06, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-80px', left: '-40px', width: '260px', height: '260px', borderRadius: '50%', background: 'var(--coral)', opacity: 0.06, pointerEvents: 'none' }} />

      <Toast />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: "'Unbounded', sans-serif",
            fontSize: '20px',
            fontWeight: '800',
            color: '#fff',
            letterSpacing: '-0.5px',
            marginBottom: '10px',
          }}>
            Coachly<span style={{ color: 'var(--lime)' }}>.</span>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(200,255,0,0.1)',
            color: 'var(--lime)',
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            padding: '4px 12px',
            borderRadius: '100px',
            border: '1px solid rgba(200,255,0,0.2)',
          }}>
            Coach Portal
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '18px',
          padding: '32px',
          backdropFilter: 'blur(20px)',
        }}>
          <h1 style={{
            fontFamily: "'Unbounded', sans-serif",
            fontSize: '18px',
            fontWeight: '800',
            color: '#fff',
            margin: '0 0 6px',
            letterSpacing: '-0.3px',
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 26px', lineHeight: 1.5 }}>
            Log in to your coaching dashboard.
          </p>

          <form onSubmit={submit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                autoComplete="email"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(200,255,0,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(200,255,0,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: loading ? 'rgba(200,255,0,0.5)' : 'var(--lime)',
                color: 'var(--dark)',
                border: 'none',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '13px',
                fontWeight: '700',
                cursor: loading ? 'default' : 'pointer',
                transition: 'opacity 0.15s',
                letterSpacing: '0.02em',
              }}
            >
              {loading ? 'Logging in…' : 'Log in →'}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            Don't have an account?{' '}
            <span
              style={{ color: 'var(--lime)', cursor: 'pointer', fontWeight: '600' }}
              onClick={() => navigate('/coach/signup')}
            >
              Apply as a coach
            </span>
          </div>
          <span
            style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            ← Back to marketplace
          </span>
        </div>
      </div>
    </div>
  );
}