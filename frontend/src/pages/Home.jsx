import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

const AVATAR_COLORS = [
  '#E8633A', '#2a7a4f', '#5a5ac8', '#c94e2a', '#2d6b47',
  '#8b5cf6', '#0891b2', '#b45309', '#be185d', '#065f46',
];

function avatarColor(id) {
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function CoachCard({ coach, onView }) {
  return (
    <div style={{
      background: 'var(--card)',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 0.15s, transform 0.15s',
      cursor: 'pointer',
    }}
      onClick={() => onView(coach.id)}
    >
      {/* Banner */}
      <div style={{
        height: '120px',
        background: coach.banner
          ? `url(${coach.banner}) center/cover`
          : `linear-gradient(135deg, #1e3a2a, #2d6b47)`,
        position: 'relative',
      }}>
        {/* Avatar */}
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '3px solid var(--card)',
          background: coach.photo ? 'transparent' : avatarColor(coach.id),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: '700',
          color: '#fff',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {coach.photo
            ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials(coach.name)}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '28px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', marginBottom: '3px' }}>
              {coach.name}
            </div>
            {coach.category_name && (
              <div style={{ fontSize: '11px', color: 'var(--orange)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {coach.category_name}
              </div>
            )}
          </div>
          {coach.plan_price != null && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', color: 'var(--dark)' }}>
                ${Number(coach.plan_price).toFixed(0)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>/month</div>
            </div>
          )}
        </div>

        {coach.tagline && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5', marginBottom: '14px', marginTop: '8px' }}>
            {coach.tagline}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {coach.subscriber_count != null && (
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--dark)' }}>{coach.subscriber_count}</strong> subscribers
            </span>
          )}
          {coach.years_experience != null && (
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--dark)' }}>{coach.years_experience}</strong> yrs exp
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onView(coach.id); }}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '100px',
            border: '1.5px solid var(--dark)',
            background: 'none',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: '500',
            color: 'var(--dark)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--dark)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--dark)'; }}
        >
          View profile
        </button>
      </div>
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    icon: '🎯',
    title: 'Subscribe to a coach',
    description: 'Browse real coaches, pick your niche, and subscribe to a monthly program tailored to your goals.',
  },
  {
    icon: '🤖',
    title: 'Get your AI + program',
    description: "Your coach's AI clone is available 24/7. Get your custom workout plan, meal plan, and daily guidance.",
  },
  {
    icon: '📈',
    title: 'Track progress together',
    description: 'Weekly check-ins, progress photos, and direct coach access keep you accountable every step of the way.',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCoaches, setLoadingCoaches] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    setLoadingCoaches(true);
    getCoaches(activeCategory)
      .then(setCoaches)
      .catch(() => { setCoaches([]); showToast('Failed to load coaches', 'error'); })
      .finally(() => setLoadingCoaches(false));
  }, [activeCategory]);

  const token = localStorage.getItem('coachly_token');
  const tokenType = localStorage.getItem('coachly_token_type');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowY: 'auto', overflowX: 'hidden' }}>
      <Toast />

      {/* ── Navbar ─────────────────────────────────── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(245,240,232,0.96)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: '500', fontSize: '16px', letterSpacing: '0.15em', color: 'var(--dark)' }}>
          COACH<span style={{ color: 'var(--orange)' }}>LY</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/coach/signup')}
            style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', padding: '6px 12px' }}
          >
            For coaches
          </button>

          {token && tokenType === 'user' ? (
            <button
              onClick={() => navigate('/dashboard')}
              style={{ padding: '8px 18px', borderRadius: '100px', background: 'var(--dark)', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
            >
              My dashboard
            </button>
          ) : token && tokenType === 'coach' ? (
            <button
              onClick={() => navigate('/coach/dashboard')}
              style={{ padding: '8px 18px', borderRadius: '100px', background: 'var(--dark)', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
            >
              Coach dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/coach/login')}
                style={{ padding: '8px 16px', borderRadius: '100px', border: '1.5px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: 'var(--dark)' }}
              >
                Log in
              </button>
              <button
                onClick={() => navigate('/coach/signup')}
                style={{ padding: '8px 18px', borderRadius: '100px', background: 'var(--orange)', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
              >
                Get started
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────── */}
      <section style={{
        padding: '80px 32px 64px',
        textAlign: 'center',
        maxWidth: '680px',
        margin: '0 auto',
      }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: '900', lineHeight: '1.05', color: 'var(--dark)', marginBottom: '20px' }}>
          Your coach.<br />Available 24/7.
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--muted)', lineHeight: '1.7', marginBottom: '32px', fontWeight: '300' }}>
          Subscribe to a real coach. Get your AI clone, your program, your community — all in one place.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => document.getElementById('coaches-grid')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '14px 28px', borderRadius: '100px', background: 'var(--orange)', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}
          >
            Find a coach
          </button>
          <button
            onClick={() => navigate('/coach/signup')}
            style={{ padding: '14px 28px', borderRadius: '100px', border: '1.5px solid var(--dark)', background: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: 'var(--dark)' }}
          >
            Become a coach
          </button>
        </div>
      </section>

      {/* ── Category strip ─────────────────────────── */}
      {!loadingCategories && categories.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '0 32px 32px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              padding: '8px 18px',
              borderRadius: '100px',
              border: '1.5px solid var(--border)',
              background: activeCategory === null ? 'var(--dark)' : 'var(--card)',
              color: activeCategory === null ? '#fff' : 'var(--muted)',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug === activeCategory ? null : cat.slug)}
              style={{
                padding: '8px 18px',
                borderRadius: '100px',
                border: '1.5px solid var(--border)',
                background: activeCategory === cat.slug ? 'var(--dark)' : 'var(--card)',
                color: activeCategory === cat.slug ? '#fff' : 'var(--muted)',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Coach grid ─────────────────────────────── */}
      <section
        id="coaches-grid"
        style={{ padding: '0 32px 80px', maxWidth: '1200px', margin: '0 auto' }}
      >
        {loadingCoaches ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[1, 2, 3].map((i) => <LoadingSkeleton key={i} type="card" />)}
          </div>
        ) : coaches.length === 0 ? (
          <EmptyState
            message="No coaches yet. Be the first to join Coachly."
            cta="Become a coach"
            onCta={() => navigate('/coach/signup')}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {coaches.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                onView={(id) => navigate(`/coach/${id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── How it works ───────────────────────────── */}
      <section style={{
        background: 'var(--dark)',
        padding: '80px 32px',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '12px' }}>
              How it works
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: '700', color: '#fff', lineHeight: '1.2' }}>
              Coaching, reimagined.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '28px 24px',
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '16px' }}>{step.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '10px' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.65', fontWeight: '300', margin: 0 }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer style={{
        padding: '32px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'var(--bg)',
      }}>
        <div style={{ fontWeight: '500', fontSize: '14px', letterSpacing: '0.12em', color: 'var(--dark)' }}>
          COACH<span style={{ color: 'var(--orange)' }}>LY</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button onClick={() => navigate('/coach/signup')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>
            For coaches
          </button>
          <span style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>Terms</span>
          <span style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>Privacy</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          © {new Date().getFullYear()} Coachly
        </div>
      </footer>
    </div>
  );
}
