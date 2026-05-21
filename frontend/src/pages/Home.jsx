import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

/* ─── animation keyframes injected once ─── */
const STYLES = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.93); }
  to   { opacity: 1; transform: scale(1); }
}
.anim-fadeup   { animation: fadeUp  0.7s cubic-bezier(.22,1,.36,1) both; }
.anim-fadein   { animation: fadeIn  0.6s ease both; }
.anim-scalein  { animation: scaleIn 0.55s cubic-bezier(.22,1,.36,1) both; }
.hero-overlay  {
  background: linear-gradient(
    to bottom,
    rgba(10,18,10,0.45) 0%,
    rgba(10,18,10,0.20) 40%,
    rgba(10,18,10,0.75) 100%
  );
}
.coach-card:hover {
  box-shadow: 0 12px 40px rgba(0,0,0,0.13);
  transform: translateY(-3px);
}
.pill-btn:hover { opacity: 0.82; }
.nav-link:hover { color: var(--dark) !important; }
.cat-btn:hover { background: var(--dark) !important; color: #fff !important; }
`;

const AVATAR_COLORS = [
  '#E8633A','#2a7a4f','#5a5ac8','#c94e2a',
  '#2d6b47','#8b5cf6','#0891b2','#b45309',
];
function avatarColor(id) {
  if (!id) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

/* ─── Coach card ─── */
function CoachCard({ coach, onView, delay = 0 }) {
  return (
    <div
      className="coach-card anim-scalein"
      style={{
        background: 'var(--card)',
        borderRadius: '18px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.2s',
        cursor: 'pointer',
        animationDelay: `${delay}ms`,
      }}
      onClick={() => onView(coach.id)}
    >
      <div style={{
        height: '120px',
        background: coach.banner
          ? `url(${coach.banner}) center/cover`
          : `linear-gradient(135deg, #1e3a2a, #2d6b47)`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', bottom: '-20px', left: '20px',
          width: '48px', height: '48px', borderRadius: '50%',
          border: '3px solid var(--card)',
          background: coach.photo ? 'transparent' : avatarColor(coach.id),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: '700', color: '#fff',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {coach.photo
            ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials(coach.name)}
        </div>
      </div>
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
            width: '100%', padding: '10px', borderRadius: '100px',
            border: '1.5px solid var(--dark)', background: 'none',
            fontFamily: 'inherit', fontSize: '13px', fontWeight: '500',
            color: 'var(--dark)', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--dark)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--dark)'; }}
        >
          View profile
        </button>
      </div>
    </div>
  );
}

const HOW_IT_WORKS = [
  { num: '01', title: 'Subscribe to a coach', description: 'Browse coaches across every sport and discipline — fitness, football, tennis, swimming, and more. Pick your niche and subscribe to a monthly program built for your goals.' },
  { num: '02', title: 'Get your AI + program', description: "Your coach's AI is available 24/7. Get a custom training plan, nutrition guidance, and daily check-ins — always tailored to your sport and level." },
  { num: '03', title: 'Track progress together', description: 'Weekly reviews, progress tracking, and direct coach messaging keep you accountable. Your coach sees your data and adjusts your plan as you grow.' },
];

const STATS = [
  { value: '10K+', label: 'Active athletes' },
  { value: '200+', label: 'Expert coaches' },
  { value: '50+', label: 'Sports & disciplines' },
  { value: '24/7', label: 'AI availability' },
];

/* ─── Privacy & Terms modal ─── */
function LegalModal({ type, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const content = type === 'privacy' ? {
    title: 'Privacy Policy',
    lastUpdated: 'May 2025',
    sections: [
      { heading: 'Information We Collect', body: 'We collect information you provide directly to us when you create an account, subscribe to a coach, or communicate with us. This includes your name, email address, payment information, fitness goals, and any content you upload or share on the platform.' },
      { heading: 'How We Use Your Information', body: 'We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, respond to your comments and questions, and send you marketing communications (with your consent).' },
      { heading: 'Information Sharing', body: 'We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website, conducting our business, or servicing you, so long as those parties agree to keep this information confidential.' },
      { heading: 'Data Security', body: 'We implement a variety of security measures to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems.' },
      { heading: 'Cookies', body: 'We use cookies to enhance your experience, gather general visitor information, and track visits to our website. You can choose to disable cookies through your browser settings, though this may affect your experience on our platform.' },
      { heading: 'Contact Us', body: 'If you have any questions about this Privacy Policy, please contact us at privacy@coachly.app.' },
    ],
  } : {
    title: 'Terms of Service',
    lastUpdated: 'May 2025',
    sections: [
      { heading: 'Acceptance of Terms', body: 'By accessing or using Coachly, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.' },
      { heading: 'Use of Service', body: 'Coachly provides a platform connecting clients with fitness and wellness coaches. You agree to use the service only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the service.' },
      { heading: 'Account Responsibilities', body: 'You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. Notify us immediately of any unauthorized use of your account.' },
      { heading: 'Subscriptions & Payments', body: 'Subscriptions are billed on a monthly basis. You may cancel at any time, and cancellation takes effect at the end of the current billing period. Refunds are issued at our discretion for unused portions of a subscription period.' },
      { heading: 'Coach Content', body: 'Coaches are independent professionals and are solely responsible for the content, advice, and programs they provide. Coachly does not endorse any specific coach or guarantee results. Always consult a qualified healthcare professional before starting any fitness program.' },
      { heading: 'Limitation of Liability', body: 'Coachly shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability shall not exceed the amount paid by you in the past 12 months.' },
      { heading: 'Changes to Terms', body: 'We reserve the right to modify these terms at any time. We will notify users of significant changes via email or a prominent notice on our platform. Continued use of the service after changes constitutes acceptance of the new terms.' },
      { heading: 'Contact', body: 'For questions about these Terms of Service, contact us at legal@coachly.app.' },
    ],
  };

  return (
    <div
      className="anim-fadein"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="anim-scalein"
        style={{
          background: 'var(--bg)', borderRadius: '20px',
          maxWidth: '640px', width: '100%', maxHeight: '80vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '700', color: 'var(--dark)' }}>
              {content.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              Last updated: {content.lastUpdated}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '1.5px solid var(--border)', background: 'none',
              cursor: 'pointer', fontSize: '18px', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--dark)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            ×
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '24px 28px 32px' }}>
          {content.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: '24px' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '700', color: 'var(--dark)', marginBottom: '8px' }}>
                {i + 1}. {s.heading}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.75', margin: 0 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Home component ─── */
export default function Home() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [legalModal, setLegalModal] = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Multi-sport coaching image — group training / athletic collage
  const HERO_URL = 'https://images.unsplash.com/photo-1547060827-e2b799f1f515?w=1600&q=80';

  useEffect(() => {
    if (!document.getElementById('coachly-home-styles')) {
      const s = document.createElement('style');
      s.id = 'coachly-home-styles';
      s.textContent = STYLES;
      document.head.appendChild(s);
    }
    const img = new Image();
    img.src = HERO_URL;
    img.onload = () => setHeroLoaded(true);
  }, []);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([])).finally(() => setLoadingCategories(false));
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
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      {/* ── Navbar ─── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(245,240,232,0.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo — plain text, no background */}
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: '800', fontSize: '18px',
            color: 'var(--dark)', letterSpacing: '0.06em',
          }}>
            COACHLY<span style={{ color: 'var(--orange)' }}>.</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="nav-link"
            onClick={() => navigate('/coach/signup')}
            style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', padding: '6px 12px', transition: 'color 0.15s' }}
          >
            For coaches
          </button>
          {token && tokenType === 'user' ? (
            <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 18px', borderRadius: '100px', background: 'var(--dark)', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              My dashboard
            </button>
          ) : token && tokenType === 'coach' ? (
            <button onClick={() => navigate('/coach/dashboard')} style={{ padding: '8px 18px', borderRadius: '100px', background: 'var(--dark)', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              Coach dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/user/login')} style={{ padding: '8px 16px', borderRadius: '100px', border: '1.5px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: 'var(--dark)' }}>
                Log in
              </button>
              <button onClick={() => navigate('/coach/signup')} style={{ padding: '8px 18px', borderRadius: '100px', background: 'var(--orange)', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                Get started
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ─── */}
      <section style={{
        position: 'relative',
        minHeight: '580px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        background: '#0f1f14',
      }}>
        {/* Background — multi-sport coaching image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: heroLoaded ? `url('${HERO_URL}')` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          transition: 'opacity 0.8s ease',
          opacity: heroLoaded ? 1 : 0,
        }} />
        <div className="hero-overlay" style={{ position: 'absolute', inset: 0 }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '80px 32px 60px', maxWidth: '720px', margin: '0 auto' }}>
          <div className="anim-fadeup" style={{ animationDelay: '0ms', fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: '18px' }}>
            Every sport · Every level · Any goal
          </div>
          <h1 className="anim-fadeup" style={{
            animationDelay: '80ms',
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(38px, 6.5vw, 64px)',
            fontWeight: '900', lineHeight: '1.06',
            color: '#fff', marginBottom: '20px',
            textShadow: '0 2px 24px rgba(0,0,0,0.4)',
          }}>
            Find your coach.<br />Any sport. 24/7.
          </h1>
          <p className="anim-fadeup" style={{
            animationDelay: '160ms',
            fontSize: '16px', color: 'rgba(255,255,255,0.75)',
            lineHeight: '1.7', marginBottom: '36px', fontWeight: '300',
          }}>
            Real coaches across every discipline. Powered by AI.<br />Your program, community, and coach — all in one place.
          </p>

          <div className="anim-fadeup" style={{ animationDelay: '240ms', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="pill-btn"
              onClick={() => document.getElementById('coaches-grid')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '15px 32px', borderRadius: '100px', background: 'var(--orange)', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.15s', boxShadow: '0 4px 20px rgba(232,99,58,0.5)' }}
            >
              Find a coach
            </button>
            <button
              className="pill-btn"
              onClick={() => navigate('/coach/signup')}
              style={{ padding: '15px 32px', borderRadius: '100px', border: '2px solid rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', fontFamily: 'inherit', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: '#fff', transition: 'opacity 0.15s' }}
            >
              Become a coach
            </button>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to bottom, transparent, var(--bg))' }} />
      </section>

      {/* ── Stats strip ─── */}
      <section style={{ background: 'var(--card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {STATS.map((s, i) => (
            <div key={i} className="anim-fadeup" style={{ textAlign: 'center', animationDelay: `${i * 80}ms` }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: '800', color: 'var(--dark)' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px', fontWeight: '500' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Category strip ─── */}
      {!loadingCategories && categories.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', padding: '32px 32px 24px', overflowX: 'auto', scrollbarWidth: 'none', maxWidth: '1200px', margin: '0 auto' }}>
          {[{ id: null, name: 'All', slug: null }].concat(categories).map((cat) => (
            <button
              key={cat.id ?? 'all'}
              className="cat-btn"
              onClick={() => setActiveCategory(cat.slug === activeCategory ? null : cat.slug)}
              style={{
                padding: '8px 18px', borderRadius: '100px',
                border: '1.5px solid var(--border)',
                background: (cat.slug === null ? activeCategory === null : activeCategory === cat.slug) ? 'var(--dark)' : 'var(--card)',
                color: (cat.slug === null ? activeCategory === null : activeCategory === cat.slug) ? '#fff' : 'var(--muted)',
                fontFamily: 'inherit', fontSize: '13px', fontWeight: '500',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Coach grid ─── */}
      <section id="coaches-grid" style={{ padding: '0 32px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        {loadingCoaches ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[1, 2, 3].map(i => <LoadingSkeleton key={i} type="card" />)}
          </div>
        ) : coaches.length === 0 ? (
          <EmptyState message="No coaches yet. Be the first to join Coachly." cta="Become a coach" onCta={() => navigate('/coach/signup')} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {coaches.map((coach, i) => (
              <CoachCard key={coach.id} coach={coach} onView={id => navigate(`/coach/${id}`)} delay={i * 60} />
            ))}
          </div>
        )}
      </section>

      {/* ── How it works ─── */}
      <section style={{ background: 'var(--dark)', padding: '80px 32px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '14px' }}>
              How it works
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: '700', color: '#fff', lineHeight: '1.2' }}>
              Coaching, reimagined.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="anim-scalein" style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '20px', padding: '32px 28px',
                animationDelay: `${i * 100}ms`,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'var(--orange)', marginBottom: '20px',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '15px', fontWeight: '800', color: '#fff',
                }}>
                  {step.num}
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '19px', fontWeight: '700', color: '#fff', marginBottom: '12px', lineHeight: '1.3' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.7', fontWeight: '300', margin: 0 }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ─── */}
      <section style={{ background: 'var(--orange)', padding: '64px 32px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: '800', color: '#fff', marginBottom: '14px' }}>
          Ready to find your coach?
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', marginBottom: '32px', fontWeight: '300' }}>
          Join thousands of athletes already training smarter with Coachly.
        </p>
        <button
          onClick={() => document.getElementById('coaches-grid')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ padding: '15px 36px', borderRadius: '100px', background: '#fff', color: 'var(--orange)', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          Browse coaches →
        </button>
      </section>

      {/* ── Footer ─── */}
      <footer style={{
        padding: '32px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', background: 'var(--bg)',
      }}>
        {/* Logo — plain text, no background */}
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: '800', fontSize: '16px',
          color: 'var(--dark)', letterSpacing: '0.06em',
        }}>
          COACHLY<span style={{ color: 'var(--orange)' }}>.</span>
        </span>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button onClick={() => navigate('/coach/signup')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>
            For coaches
          </button>
          <button onClick={() => setLegalModal('terms')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>
            Terms
          </button>
          <button onClick={() => setLegalModal('privacy')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>
            Privacy
          </button>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          © {new Date().getFullYear()} Coachly
        </div>
      </footer>
    </div>
  );
}