import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCoach,
  getPublicPosts,
  createSubscription,
  getUserMe,
  userSignup,
  userLogin,
  saveToken,
} from '../api';
import Toast, { showToast } from '../components/Toast';
import LoadingSkeleton from '../components/LoadingSkeleton';

// ─── helpers ────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#E8633A', '#2a7a4f', '#5a5ac8', '#c94e2a', '#2d6b47',
  '#8b5cf6', '#0891b2', '#b45309', '#be185d', '#065f46',
];
function avatarColor(id) {
  if (!id) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}
function fmt(n) {
  return n ? new Intl.NumberFormat().format(n) : '0';
}
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Plan card ───────────────────────────────────────────────────
function PlanCard({ months, price, selected, onSelect }) {
  const label = months === 3 ? '3 Months' : months === 6 ? '6 Months' : '12 Months';
  const badge = months === 6 ? 'Popular' : months === 12 ? 'Best Value' : null;
  const perMonth = price ? (price / months).toFixed(0) : null;

  return (
    <div
      onClick={() => onSelect(months)}
      style={{
        border: `2px solid ${selected ? 'var(--orange)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        background: selected ? 'rgba(232,99,58,0.07)' : 'var(--card)',
        transition: 'border-color 0.15s, background 0.15s',
        position: 'relative',
      }}
    >
      {badge && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--orange)',
          color: '#fff',
          fontSize: '10px',
          fontWeight: '700',
          padding: '2px 10px',
          borderRadius: '20px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}>{badge}</div>
      )}
      <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{label}</div>
      {price ? (
        <>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--orange)' }}>
            ${price}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            ${perMonth}/mo
          </div>
        </>
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Contact for pricing</div>
      )}
    </div>
  );
}

// ─── Auth modal (sign up or log in to subscribe) ─────────────────
function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (mode === 'signup') {
        if (!form.name || !form.email || !form.password) throw new Error('All fields required');
        res = await userSignup({ name: form.name, email: form.email, password: form.password });
      } else {
        res = await userLogin(form.email, form.password);
      }
      saveToken(res.token, 'user');
      onSuccess(res.user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', borderRadius: '20px', padding: '32px',
        width: '100%', maxWidth: '420px',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
          {mode === 'signup' ? 'Sign up to subscribe to this coach.' : 'Log in to continue.'}
        </div>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Full name</label>
              <input
                className="input"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>
          )}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--muted)' }}>
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <span
            style={{ color: 'var(--orange)', cursor: 'pointer', fontWeight: '600' }}
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          >
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Intake modal ────────────────────────────────────────────────
function IntakeModal({ coach, planMonths, planPrice, onClose, onDone }) {
  const [form, setForm] = useState({
    goal: '', weight: '', calorie_target: '', food_restrictions: '', injuries: '',
  });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await createSubscription(coach.id, planMonths, planPrice, form);
      onDone();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, padding: '20px', overflowY: 'auto',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', borderRadius: '20px', padding: '32px',
        width: '100%', maxWidth: '480px', margin: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>
          Tell {coach.name} about yourself
        </div>
        <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
          This helps your coach personalise your plan from day one.
        </div>

        <form onSubmit={submit}>
          {[
            { key: 'goal', label: 'Your main goal', placeholder: 'e.g. Lose 10kg, run a marathon…' },
            { key: 'weight', label: 'Current weight (optional)', placeholder: 'e.g. 85kg' },
            { key: 'calorie_target', label: 'Daily calorie target (optional)', placeholder: 'e.g. 2200' },
            { key: 'food_restrictions', label: 'Food restrictions / allergies (optional)', placeholder: 'e.g. Vegetarian, lactose intolerant…' },
            { key: 'injuries', label: 'Injuries or physical limitations (optional)', placeholder: 'e.g. Lower back pain, knee surgery…' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{label}</label>
              <input
                className="input"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px', opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Subscribing…' : `Subscribe — ${planMonths} months${planPrice ? ` · $${planPrice}` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Store page ─────────────────────────────────────────────
export default function Store() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [coach, setCoach] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [planMonths, setPlanMonths] = useState(3);

  const [showAuth, setShowAuth] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [alreadySubbed, setAlreadySubbed] = useState(false);

  // load coach + check auth
  useEffect(() => {
    setLoading(true);
    getCoach(id)
      .then((c) => {
        setCoach(c);
        return getPublicPosts(c.id);
      })
      .then(setPosts)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));

    const token = localStorage.getItem('coachly_token');
    const tokenType = localStorage.getItem('coachly_token_type');
    if (token && tokenType === 'user') {
      getUserMe()
        .then(setCurrentUser)
        .catch(() => {});
    }
  }, [id]);

  function getPlanPrice(months) {
    if (!coach) return null;
    const base = parseFloat(coach.plan_price) || null;
    if (!base) return null;
    if (months === 3) return base * 3;
    if (months === 6) return base * 6;
    if (months === 12) return base * 12;
    return base;
  }

  function handleSubscribeClick() {
    const tokenType = localStorage.getItem('coachly_token_type');
    if (tokenType === 'coach') {
      showToast('Log in as a user to subscribe', 'error');
      return;
    }
    if (!currentUser) {
      setShowAuth(true);
      return;
    }
    setShowIntake(true);
  }

  function onAuthSuccess(user) {
    setCurrentUser(user);
    setShowAuth(false);
    setShowIntake(true);
  }

  function onSubDone() {
    setShowIntake(false);
    setAlreadySubbed(true);
    showToast('Subscription active! Welcome aboard.', 'success');
    setTimeout(() => navigate('/dashboard'), 1500);
  }

  const plans = [3, 6, 12].filter((m) => {
    if (m === 3) return coach?.price_3m;
    if (m === 6) return coach?.price_6m;
    if (m === 12) return coach?.price_12m;
    return false;
  });
  // always show at least one plan option
  const planOptions = plans.length > 0 ? plans : [3, 6, 12];

  if (loading) return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 20px' }}>
      <LoadingSkeleton type="card" count={3} />
    </div>
  );

  if (!coach) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
      Coach not found.
    </div>
  );

  const tabs = [
    { key: 'about', label: 'About' },
    { key: 'plans', label: 'Plans' },
    { key: 'community', label: `Community (${posts.length})` },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Toast />

      {/* ── Banner + Avatar ── */}
      <div style={{
        height: '240px',
        background: coach.banner
          ? `url(${coach.banner}) center/cover`
          : `linear-gradient(135deg, #1e3a2a, #2d6b47)`,
        position: 'relative',
      }}>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
            borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
          }}
        >
          ← Back
        </button>

        {/* Avatar */}
        <div style={{
          position: 'absolute', bottom: '-36px', left: '28px',
          width: '72px', height: '72px',
          borderRadius: '50%', border: '4px solid var(--bg)',
          background: coach.photo ? 'transparent' : avatarColor(coach.id),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: '800', color: '#fff',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {coach.photo
            ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials(coach.name)}
        </div>
      </div>

      {/* ── Header info ── */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ paddingTop: '52px', marginBottom: '20px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px',
          }}>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: '700', margin: '0 0 4px' }}>
                {coach.name}
              </h1>
              {coach.sport && (
                <div style={{ fontSize: '12px', color: 'var(--orange)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {coach.sport}
                </div>
              )}
            </div>
            <button
              className="btn-primary"
              onClick={handleSubscribeClick}
              disabled={alreadySubbed}
              style={{ minWidth: '160px', opacity: alreadySubbed ? 0.7 : 1 }}
            >
              {alreadySubbed ? '✓ Subscribed' : 'Subscribe'}
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
            {[
              { label: 'Clients', value: fmt(coach.subscriber_count) },
              { label: 'Experience', value: coach.experience ? `${coach.experience}y` : '—' },
              { label: 'Location', value: coach.location || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '18px', fontWeight: '700' }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '28px' }}>
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 18px', fontSize: '14px', fontWeight: '600',
                color: activeTab === key ? 'var(--orange)' : 'var(--muted)',
                borderBottom: `2px solid ${activeTab === key ? 'var(--orange)' : 'transparent'}`,
                marginBottom: '-1px', transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'about' && (
          <div style={{ maxWidth: '600px', paddingBottom: '60px' }}>
            {coach.bio && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', color: 'var(--muted)' }}>About</h3>
                <p style={{ lineHeight: '1.7', color: 'var(--text)' }}>{coach.bio}</p>
              </div>
            )}
            {coach.philosophy && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', color: 'var(--muted)' }}>Coaching Philosophy</h3>
                <p style={{ lineHeight: '1.7', color: 'var(--text)' }}>{coach.philosophy}</p>
              </div>
            )}
            {coach.credentials && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', color: 'var(--muted)' }}>Credentials</h3>
                <p style={{ lineHeight: '1.7', color: 'var(--text)' }}>{coach.credentials}</p>
              </div>
            )}
            {!coach.bio && !coach.philosophy && !coach.credentials && (
              <p style={{ color: 'var(--muted)' }}>No additional information provided yet.</p>
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <div style={{ paddingBottom: '60px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
              Choose a plan that works for you. All plans include AI coaching support, weekly check-ins, and personalised programming.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', maxWidth: '600px', marginBottom: '28px' }}>
              {planOptions.map((m) => (
                <PlanCard
                  key={m}
                  months={m}
                  price={getPlanPrice(m)}
                  selected={planMonths === m}
                  onSelect={setPlanMonths}
                />
              ))}
            </div>
            <button
              className="btn-primary"
              onClick={handleSubscribeClick}
              disabled={alreadySubbed}
              style={{ minWidth: '200px' }}
            >
              {alreadySubbed ? '✓ Already subscribed' : `Get started — ${planMonths} months`}
            </button>
          </div>
        )}

        {activeTab === 'community' && (
          <div style={{ paddingBottom: '60px' }}>
            {posts.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No community posts yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '620px' }}>
                {posts.map((post) => (
                  <div key={post.id} style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '14px', padding: '18px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: post.user?.photo ? 'transparent' : avatarColor(post.user_id),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0, overflow: 'hidden',
                      }}>
                        {post.user?.photo
                          ? <img src={post.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : initials(post.user?.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>{post.user?.name || 'Member'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{timeAgo(post.created_at)}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text)', margin: 0 }}>{post.content}</p>
                    {post.photo && (
                      <img src={post.photo} alt="post" style={{ marginTop: '12px', borderRadius: '10px', maxWidth: '100%' }} />
                    )}
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '16px' }}>
                      <span>♥ {fmt(post.likes_count)}</span>
                      <span>💬 {post.comment_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={onAuthSuccess} />
      )}

      {showIntake && coach && (
        <IntakeModal
          coach={coach}
          planMonths={planMonths}
          planPrice={getPlanPrice(planMonths)}
          onClose={() => setShowIntake(false)}
          onDone={onSubDone}
        />
      )}
    </div>
  );
}
