import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, saveAdminToken } from '../api';
import Toast, { showToast } from '../components/Toast';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { showToast('Fill in all fields', 'error'); return; }
    setLoading(true);
    try {
      const res = await adminLogin(form.email, form.password);
      saveAdminToken(res.token);
      navigate('/admin', { replace: true });
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'var(--dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      flex: 1,
    }}>
      <Toast />

      <div style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(255,77,28,0.07) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 1 }}>
        <div style={{
          textAlign: 'center', marginBottom: '36px',
          fontFamily: "'Unbounded', sans-serif", fontSize: '18px',
          fontWeight: '800', color: '#fff', letterSpacing: '-0.5px',
        }}>
          Coachly<span style={{ color: 'var(--coral)' }}>.</span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '36px 32px',
          backdropFilter: 'blur(20px)',
        }}>
          <h2 style={{
            fontFamily: "'Unbounded', sans-serif",
            fontSize: '18px', fontWeight: '800',
            color: '#fff', marginBottom: '6px', letterSpacing: '-0.4px',
          }}>Admin login</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px' }}>
            Restricted access.
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {['email', 'password'].map(field => (
              <div key={field}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '7px' }}>
                  {field}
                </label>
                <input
                  type={field}
                  value={form[field]}
                  onChange={e => set(field, e.target.value)}
                  placeholder={field === 'email' ? 'admin@coachly.com' : '••••••••'}
                  autoComplete={field === 'email' ? 'email' : 'current-password'}
                  style={{
                    width: '100%', padding: '12px 14px',
                    borderRadius: '11px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '14px', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(255,77,28,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px', width: '100%', padding: '13px',
                borderRadius: '11px',
                background: loading ? 'rgba(255,77,28,0.5)' : 'var(--coral)',
                color: '#fff', border: 'none',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '14px', fontWeight: '700',
                cursor: loading ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Signing in…' : 'Access admin →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}