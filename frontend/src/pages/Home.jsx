import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches, getRankedCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

/* ─── Legal Modal ─── */
function LegalModal({ type, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const content = type === 'privacy' ? {
    title: 'Privacy Policy', lastUpdated: 'May 2025',
    sections: [
      { heading: 'Information We Collect', body: 'We collect information you provide directly to us when you create an account, subscribe to a coach, or communicate with us. This includes your name, email address, payment information, fitness goals, and any content you upload or share on the platform.' },
      { heading: 'How We Use Your Information', body: 'We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, respond to your comments and questions, and send you marketing communications (with your consent).' },
      { heading: 'Information Sharing', body: 'We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website.' },
      { heading: 'Data Security', body: 'We implement a variety of security measures to maintain the safety of your personal information.' },
      { heading: 'Contact Us', body: 'If you have any questions about this Privacy Policy, please contact us at privacy@coachly.app.' },
    ],
  } : {
    title: 'Terms of Service', lastUpdated: 'May 2025',
    sections: [
      { heading: 'Acceptance of Terms', body: 'By accessing or using Coachly, you agree to be bound by these Terms of Service.' },
      { heading: 'Use of Service', body: 'Coachly provides a platform connecting clients with fitness and wellness coaches. You agree to use the service only for lawful purposes.' },
      { heading: 'Subscriptions & Payments', body: 'Subscriptions are billed monthly. You may cancel at any time.' },
      { heading: 'Coach Content', body: 'Coaches are independent professionals responsible for their content. Always consult a healthcare professional before starting any fitness program.' },
      { heading: 'Contact', body: 'For questions, contact us at legal@coachly.app.' },
    ],
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '20px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: '#F5F0E8' }}>{content.title}</div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #333', color: '#888', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '24px 28px 32px' }}>
          {content.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '700', color: '#C9A84C', marginBottom: '8px' }}>{s.heading}</h3>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.75', margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */
const AVATAR_COLORS = ['#C9A84C','#2a7a4f','#5a5ac8','#c94e2a','#2d6b47','#8b5cf6','#0891b2'];
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

/* ─── Coach Card ─── */
function CoachCard({ coach, onView, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onView(coach.slug || coach.id)}
      style={{
        background: '#111',
        border: `1px solid ${hovered ? '#C9A84C55' : '#222'}`,
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 20px 60px rgba(201,168,76,0.12)' : '0 2px 20px rgba(0,0,0,0.3)',
        animation: `fadeSlideUp 0.6s ease both`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ height: '180px', background: coach.banner ? `url(${coach.banner}) center/cover` : `linear-gradient(135deg, #1a1a1a, #2a2a2a)`, position: 'relative', overflow: 'hidden' }}>
        {/* Gold shimmer overlay on hover */}
        <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(201,168,76,0.08)' : 'transparent', transition: 'background 0.3s' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(to bottom, transparent, #111)' }} />
        <div style={{
          position: 'absolute', bottom: '-18px', left: '20px',
          width: '52px', height: '52px', borderRadius: '50%',
          border: `2px solid ${hovered ? '#C9A84C' : '#333'}`,
          background: coach.photo ? 'transparent' : avatarColor(coach.id),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: '700', color: '#fff', overflow: 'hidden',
          transition: 'border-color 0.3s',
        }}>
          {coach.photo ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(coach.name)}
        </div>
      </div>
      <div style={{ padding: '28px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: '#F5F0E8', marginBottom: '4px' }}>{coach.name}</div>
            {coach.category_name && <div style={{ fontSize: '11px', color: '#C9A84C', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{coach.category_name}</div>}
          </div>
          {coach.plan_price != null && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', color: '#C9A84C' }}>${Number(coach.plan_price).toFixed(0)}</div>
              <div style={{ fontSize: '10px', color: '#555' }}>/month</div>
            </div>
          )}
        </div>
        {coach.tagline && <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.5', marginBottom: '14px', marginTop: '8px' }}>{coach.tagline}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {coach.subscriber_count > 0 && <span style={{ fontSize: '11px', color: '#555' }}><strong style={{ color: '#888' }}>{coach.subscriber_count}</strong> clients</span>}
          {coach.rating > 0 && <span style={{ fontSize: '11px', color: '#C9A84C' }}>★ <strong>{coach.rating}</strong></span>}
          {coach.years_experience > 0 && <span style={{ fontSize: '11px', color: '#555' }}><strong style={{ color: '#888' }}>{coach.years_experience}</strong>y exp</span>}
        </div>
        <button
          style={{
            width: '100%', padding: '10px', borderRadius: '8px',
            border: `1px solid ${hovered ? '#C9A84C' : '#333'}`,
            background: hovered ? 'rgba(201,168,76,0.1)' : 'none',
            color: hovered ? '#C9A84C' : '#666',
            fontFamily: 'inherit', fontSize: '13px', fontWeight: '500',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          View profile →
        </button>
      </div>
    </div>
  );
}

/* ─── Animated word reveal ─── */
function AnimatedHeadline({ text, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const words = text.split(' ');
  return (
    <span>
      {words.map((word, i) => (
        <span key={i} style={{
          display: 'inline-block',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: `opacity 0.7s ease ${i * 100}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms`,
          marginRight: '0.28em',
        }}>{word}</span>
      ))}
    </span>
  );
}

/* ─── Main ─── */
export default function Home() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [legalModal, setLegalModal] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);

  // Inject styles
  useEffect(() => {
    const id = 'coachly-home-v2';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = `
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .gold-shimmer {
          background: linear-gradient(90deg, #C9A84C, #F0D080, #C9A84C, #A87830);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .nav-btn:hover { color: #C9A84C !important; }
        .cat-pill:hover { border-color: #C9A84C !important; color: #C9A84C !important; }
        @media (max-width: 768px) {
          .hero-headline { font-size: 40px !important; }
          .coaches-grid { grid-template-columns: 1fr !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .nav-for-coaches { display: none !important; }
        }
        @media (max-width: 500px) {
          .hero-headline { font-size: 32px !important; }
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([])).finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    setLoadingCoaches(true);
    (activeCategory ? getCoaches(activeCategory) : getRankedCoaches().catch(() => getCoaches(null)))
      .then(setCoaches).catch(() => { setCoaches([]); showToast('Failed to load coaches', 'error'); })
      .finally(() => setLoadingCoaches(false));
  }, [activeCategory]);

  const token = localStorage.getItem('coachly_token');
  const tokenType = localStorage.getItem('coachly_token_type');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F5F0E8', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>
      <Toast />
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      {/* ── NAVBAR ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
      }}>
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: '800', fontSize: '20px', color: '#F5F0E8', letterSpacing: '0.08em' }}>
            COACHLY<span style={{ color: '#C9A84C' }}>.</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="nav-btn nav-for-coaches" onClick={() => navigate('/coach/signup')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: '#666', cursor: 'pointer', padding: '8px 14px', transition: 'color 0.2s' }}>
            For coaches
          </button>
          {token && tokenType === 'user' ? (
            <button onClick={() => navigate('/dashboard')} style={{ padding: '9px 20px', borderRadius: '8px', background: '#C9A84C', color: '#0A0A0A', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              My dashboard
            </button>
          ) : token && tokenType === 'coach' ? (
            <button onClick={() => navigate('/coach/dashboard')} style={{ padding: '9px 20px', borderRadius: '8px', background: '#C9A84C', color: '#0A0A0A', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              Coach dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/user/login')} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #2a2a2a', background: 'none', fontFamily: 'inherit', fontSize: '13px', color: '#888', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#C9A84C'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888'; }}>
                Log in
              </button>
              <button onClick={() => navigate('/user/login')} style={{ padding: '9px 20px', borderRadius: '8px', background: '#C9A84C', color: '#0A0A0A', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Get started
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Video background */}
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          onLoadedData={() => setVideoLoaded(true)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: videoLoaded ? 0.35 : 0,
            transition: 'opacity 1.5s ease',
          }}
        >
          <source src="https://videos.pexels.com/video-files/4761789/4761789-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.2) 50%, rgba(10,10,10,0.9) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,10,10,0.6) 100%)' }} />

        {/* Gold line accent */}
        <div style={{ position: 'absolute', top: '64px', left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ animation: 'fadeSlideUp 0.6s ease both', fontSize: '11px', fontWeight: '700', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '24px', opacity: 0.9 }}>
            Every Sport · Every Level · Any Goal
          </div>

          <h1 className="hero-headline" style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '72px', fontWeight: '900', lineHeight: '1.04',
            color: '#F5F0E8', marginBottom: '0',
            letterSpacing: '-0.02em',
          }}>
            <AnimatedHeadline text="Find your coach." delay={200} />
            <br />
            <span className="gold-shimmer" style={{ fontStyle: 'italic' }}>
              <AnimatedHeadline text="Any sport. 24/7." delay={500} />
            </span>
          </h1>

          <p style={{ animation: 'fadeSlideUp 0.7s ease 0.8s both', fontSize: '17px', color: 'rgba(245,240,232,0.55)', lineHeight: '1.7', marginBottom: '48px', marginTop: '24px', fontWeight: '300', maxWidth: '520px', margin: '24px auto 48px' }}>
            Real coaches across every discipline — powered by AI.<br />Your program, community, and results, all in one place.
          </p>

          <div style={{ animation: 'fadeSlideUp 0.7s ease 1s both', display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => document.getElementById('coaches-grid')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '16px 36px', borderRadius: '8px', background: '#C9A84C', color: '#0A0A0A', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.2s', boxShadow: '0 4px 24px rgba(201,168,76,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F0D080'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(201,168,76,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#C9A84C'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(201,168,76,0.35)'; }}
            >
              Find a coach
            </button>
            <button
              onClick={() => navigate('/coach/signup')}
              style={{ padding: '16px 36px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.06)', fontFamily: 'inherit', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: '#C9A84C', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; }}
            >
              Become a coach
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', animation: 'fadeSlideUp 0.7s ease 1.4s both' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#444' }}>Scroll</span>
          <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, #C9A84C, transparent)', animation: 'pulse 2s ease infinite' }} />
        </div>
      </section>

      {/* ── COACHES SECTION ── */}
      <section id="coaches-grid" style={{ padding: '80px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '12px' }}>Our coaches</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: '#F5F0E8', lineHeight: '1.15', margin: 0 }}>
            Find the coach<br /><span style={{ color: '#444', fontStyle: 'italic' }}>that moves you.</span>
          </h2>
        </div>

        {/* Category filter */}
        {!loadingCategories && categories.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '40px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
            {[{ id: null, name: 'All', slug: null }].concat(categories).map(cat => {
              const isActive = cat.slug === null ? activeCategory === null : activeCategory === cat.slug;
              return (
                <button
                  key={cat.id ?? 'all'}
                  className="cat-pill"
                  onClick={() => setActiveCategory(cat.slug === activeCategory ? null : cat.slug)}
                  style={{
                    padding: '8px 18px', borderRadius: '100px', whiteSpace: 'nowrap', flexShrink: 0,
                    border: `1px solid ${isActive ? '#C9A84C' : '#2a2a2a'}`,
                    background: isActive ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: isActive ? '#C9A84C' : '#555',
                    fontFamily: 'inherit', fontSize: '13px', fontWeight: '500',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        {loadingCoaches ? (
          <div className="coaches-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {[1, 2, 3].map(i => <LoadingSkeleton key={i} type="card" />)}
          </div>
        ) : coaches.length === 0 ? (
          <EmptyState message="No coaches yet." cta="Become a coach" onCta={() => navigate('/coach/signup')} />
        ) : (
          <div className="coaches-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {coaches.map((coach, i) => (
              <CoachCard key={coach.id} coach={coach} onView={id => navigate(`/coach/${coach.slug || id}`)} delay={i * 80} />
            ))}
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px 32px', background: '#0D0D0D', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '14px' }}>How it works</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: '#F5F0E8', margin: 0 }}>
              Coaching, <span style={{ fontStyle: 'italic', color: '#C9A84C' }}>reimagined.</span>
            </h2>
          </div>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', background: '#1a1a1a', borderRadius: '16px', overflow: 'hidden' }}>
            {[
              { label: 'Subscribe', title: 'Choose your coach', body: 'Browse coaches across every sport and discipline. Pick a program built for your goals and subscribe monthly.' },
              { label: 'Train', title: 'Get your AI + plan', body: "Your coach's AI is available 24/7. A custom training plan, nutrition guidance, and daily check-ins — tailored to you." },
              { label: 'Grow', title: 'Track progress', body: 'Weekly reviews, direct coach messaging, and real progress tracking. Your coach adjusts your plan as you grow.' },
            ].map((step, i) => (
              <div key={i}
                style={{ background: '#0D0D0D', padding: '40px 32px', position: 'relative', overflow: 'hidden', transition: 'background 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#111'}
                onMouseLeave={e => e.currentTarget.style.background = '#0D0D0D'}
              >
                <div style={{ position: 'absolute', top: '20px', right: '24px', fontFamily: "'Playfair Display', serif", fontSize: '80px', fontWeight: '900', color: 'rgba(201,168,76,0.04)', lineHeight: 1 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '16px' }}>{step.label}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: '#F5F0E8', marginBottom: '14px', lineHeight: '1.3' }}>{step.title}</h3>
                <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.8', margin: 0, fontWeight: '300' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '120px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '20px' }}>Start today</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '900', color: '#F5F0E8', lineHeight: '1.1', marginBottom: '20px' }}>
            Ready to find<br /><span style={{ fontStyle: 'italic', color: '#C9A84C' }}>your coach?</span>
          </h2>
          <p style={{ fontSize: '15px', color: '#555', marginBottom: '40px', lineHeight: '1.7', fontWeight: '300' }}>
            Thousands of athletes are already training smarter. Your coach is waiting.
          </p>
          <button
            onClick={() => document.getElementById('coaches-grid')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '17px 44px', borderRadius: '8px', background: '#C9A84C', color: '#0A0A0A', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 40px rgba(201,168,76,0.3)', transition: 'all 0.2s', letterSpacing: '0.02em' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F0D080'; e.currentTarget.style.boxShadow = '0 8px 60px rgba(201,168,76,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#C9A84C'; e.currentTarget.style.boxShadow = '0 4px 40px rgba(201,168,76,0.3)'; e.currentTarget.style.transform = 'none'; }}
          >
            Browse coaches →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '32px', borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: '800', fontSize: '16px', color: '#F5F0E8', letterSpacing: '0.08em' }}>
          COACHLY<span style={{ color: '#C9A84C' }}>.</span>
        </span>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <button onClick={() => navigate('/coach/signup')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: '#444', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'} onMouseLeave={e => e.currentTarget.style.color = '#444'}>For coaches</button>
          <button onClick={() => setLegalModal('terms')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: '#444', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'} onMouseLeave={e => e.currentTarget.style.color = '#444'}>Terms</button>
          <button onClick={() => setLegalModal('privacy')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: '#444', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'} onMouseLeave={e => e.currentTarget.style.color = '#444'}>Privacy</button>
        </div>
        <div style={{ fontSize: '12px', color: '#333' }}>© {new Date().getFullYear()} Coachly</div>
      </footer>
    </div>
  );
}