import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches, getRankedCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

/* ─── Theme tokens ───
   Lighter than v1: base lifted from #0A0A0A -> #15140F (warm charcoal, not pure black)
   Surfaces lifted too so cards read as "dark warm" rather than "void black"
*/
const BG = '#15140F';
const SURFACE = '#1E1C16';
const SURFACE_2 = '#252319';
const BORDER = '#332F22';
const GOLD = '#C9A84C';
const GOLD_LIGHT = '#F0D080';
const TEXT = '#F5F0E8';
const TEXT_DIM = '#8C887A';
const TEXT_FAINT = '#5C5848';

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '20px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: TEXT }}>{content.title}</div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${BORDER}`, color: TEXT_DIM, cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '24px 28px 32px' }}>
          {content.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '700', color: GOLD, marginBottom: '8px' }}>{s.heading}</h3>
              <p style={{ fontSize: '13px', color: TEXT_DIM, lineHeight: '1.75', margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */
const AVATAR_COLORS = ['#C9A84C', '#3a8a5f', '#6a6ad8', '#d9603a', '#3d7b57', '#9b6cf6', '#1ba1c2'];
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

/* ─── Coach Card ───
   Note: removed any default browser :active/:focus tap-highlight (the "beige flash" on tap)
   by setting WebkitTapHighlightColor: 'transparent' and never relying on browser default
   focus/active backgrounds — all states are explicit inline styles driven by React state.
*/
function CoachCard({ coach, onView, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onClick={() => onView(coach.slug || coach.id)}
      style={{
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
        background: SURFACE,
        border: `1px solid ${hovered ? GOLD + '66' : BORDER}`,
        borderRadius: '18px',
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
        transform: pressed ? 'scale(0.985) translateY(0)' : hovered ? 'translateY(-5px)' : 'none',
        boxShadow: hovered ? `0 24px 60px -20px rgba(201,168,76,0.25)` : '0 2px 16px rgba(0,0,0,0.25)',
        animation: 'fadeSlideUp 0.6s ease both',
        animationDelay: `${delay}ms`,
        flexShrink: 0,
        width: '300px',
        scrollSnapAlign: 'start',
      }}
    >
      <div style={{ height: '170px', background: coach.banner ? `url(${coach.banner}) center/cover` : `linear-gradient(135deg, ${SURFACE_2}, #2e2b1f)`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0)', transition: 'background 0.3s' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '56px', background: `linear-gradient(to bottom, transparent, ${SURFACE})` }} />
        <div style={{
          position: 'absolute', bottom: '-18px', left: '20px',
          width: '52px', height: '52px', borderRadius: '50%',
          border: `2px solid ${hovered ? GOLD : BORDER}`,
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
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: TEXT, marginBottom: '4px' }}>{coach.name}</div>
            {coach.category_name && <div style={{ fontSize: '11px', color: GOLD, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{coach.category_name}</div>}
          </div>
          {coach.plan_price != null && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', color: GOLD }}>${Number(coach.plan_price).toFixed(0)}</div>
              <div style={{ fontSize: '10px', color: TEXT_FAINT }}>/month</div>
            </div>
          )}
        </div>
        {coach.tagline && <p style={{ fontSize: '12px', color: TEXT_DIM, lineHeight: '1.5', marginBottom: '14px', marginTop: '8px' }}>{coach.tagline}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {coach.subscriber_count > 0 && <span style={{ fontSize: '11px', color: TEXT_FAINT }}><strong style={{ color: TEXT_DIM }}>{coach.subscriber_count}</strong> clients</span>}
          {coach.rating > 0 && <span style={{ fontSize: '11px', color: GOLD }}>★ <strong>{coach.rating}</strong></span>}
          {coach.years_experience > 0 && <span style={{ fontSize: '11px', color: TEXT_FAINT }}><strong style={{ color: TEXT_DIM }}>{coach.years_experience}</strong>y exp</span>}
        </div>
        <button
          tabIndex={-1}
          style={{
            width: '100%', padding: '10px', borderRadius: '8px',
            border: `1px solid ${hovered ? GOLD : BORDER}`,
            background: hovered ? 'rgba(201,168,76,0.1)' : 'none',
            color: hovered ? GOLD : TEXT_DIM,
            fontFamily: 'inherit', fontSize: '13px', fontWeight: '500',
            cursor: 'pointer', transition: 'all 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          View profile →
        </button>
      </div>
    </div>
  );
}

/* ─── Coach Carousel ─── */
function CoachCarousel({ coaches, onView }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [coaches]);

  const scrollByCards = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = 300 + 20; // card width + gap
    el.scrollBy({ left: dir * cardWidth * 2, behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Edge fades */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40px', background: `linear-gradient(to right, ${BG}, transparent)`, zIndex: 2, pointerEvents: 'none', opacity: canLeft ? 1 : 0, transition: 'opacity 0.3s' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '40px', background: `linear-gradient(to left, ${BG}, transparent)`, zIndex: 2, pointerEvents: 'none', opacity: canRight ? 1 : 0, transition: 'opacity 0.3s' }} />

      {/* Arrows */}
      <button
        onClick={() => scrollByCards(-1)}
        aria-label="Scroll left"
        className="carousel-arrow"
        style={{
          position: 'absolute', left: '-18px', top: '70px', zIndex: 3,
          width: '40px', height: '40px', borderRadius: '50%',
          border: `1px solid ${BORDER}`, background: SURFACE_2, color: canLeft ? GOLD : TEXT_FAINT,
          cursor: canLeft ? 'pointer' : 'default', fontSize: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: canLeft ? 1 : 0.3, transition: 'opacity 0.3s, border-color 0.2s',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
        disabled={!canLeft}
      >
        ←
      </button>
      <button
        onClick={() => scrollByCards(1)}
        aria-label="Scroll right"
        className="carousel-arrow"
        style={{
          position: 'absolute', right: '-18px', top: '70px', zIndex: 3,
          width: '40px', height: '40px', borderRadius: '50%',
          border: `1px solid ${BORDER}`, background: SURFACE_2, color: canRight ? GOLD : TEXT_FAINT,
          cursor: canRight ? 'pointer' : 'default', fontSize: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: canRight ? 1 : 0.3, transition: 'opacity 0.3s, border-color 0.2s',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
        disabled={!canRight}
      >
        →
      </button>

      <div
        ref={trackRef}
        className="carousel-track"
        style={{
          display: 'flex', gap: '20px', overflowX: 'auto', scrollSnapType: 'x proximity',
          paddingBottom: '12px', scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {coaches.map((coach, i) => (
          <CoachCard key={coach.id} coach={coach} onView={onView} delay={i * 70} />
        ))}
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
    const id = 'coachly-home-v3';
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
        * { -webkit-tap-highlight-color: transparent; }
        button { -webkit-tap-highlight-color: transparent; outline: none; }
        button:focus { outline: none; }
        .gold-shimmer {
          background: linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD}, #A87830);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .nav-btn:hover { color: ${GOLD} !important; }
        .cat-pill:hover { border-color: ${GOLD} !important; color: ${GOLD} !important; }
        .carousel-track::-webkit-scrollbar { display: none; }
        .carousel-arrow:hover { border-color: ${GOLD} !important; }
        @media (max-width: 768px) {
          .hero-headline { font-size: 40px !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .nav-for-coaches { display: none !important; }
          .carousel-arrow { display: none !important; }
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
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>
      <Toast />
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      {/* ── NAVBAR ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: 'rgba(21,20,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${BORDER}66`,
      }}>
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: '800', fontSize: '20px', color: TEXT, letterSpacing: '0.08em' }}>
            COACHLY<span style={{ color: GOLD }}>.</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="nav-btn nav-for-coaches" onClick={() => navigate('/coach/signup')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_DIM, cursor: 'pointer', padding: '8px 14px', transition: 'color 0.2s' }}>
            For coaches
          </button>
          {token && tokenType === 'user' ? (
            <button onClick={() => navigate('/dashboard')} style={{ padding: '9px 20px', borderRadius: '8px', background: GOLD, color: BG, border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              My dashboard
            </button>
          ) : token && tokenType === 'coach' ? (
            <button onClick={() => navigate('/coach/dashboard')} style={{ padding: '9px 20px', borderRadius: '8px', background: GOLD, color: BG, border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              Coach dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/user/login')} style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_DIM, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}>
                Log in
              </button>
              <button onClick={() => navigate('/user/login')} style={{ padding: '9px 20px', borderRadius: '8px', background: GOLD, color: BG, border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s' }}
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
            objectFit: 'cover', opacity: videoLoaded ? 0.4 : 0,
            transition: 'opacity 1.5s ease',
          }}
        >
          <source src="https://videos.pexels.com/video-files/4761789/4761789-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlays — lighter than before so the video reads through more */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(21,20,15,0.4) 0%, rgba(21,20,15,0.15) 50%, rgba(21,20,15,0.92) 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, transparent 40%, rgba(21,20,15,0.5) 100%)` }} />

        {/* Gold line accent */}
        <div style={{ position: 'absolute', top: '64px', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${GOLD}4D, transparent)` }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ animation: 'fadeSlideUp 0.6s ease both', fontSize: '11px', fontWeight: '700', letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, marginBottom: '24px', opacity: 0.9 }}>
            Every Sport · Every Level · Any Goal
          </div>

          <h1 className="hero-headline" style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '72px', fontWeight: '900', lineHeight: '1.04',
            color: TEXT, marginBottom: '0',
            letterSpacing: '-0.02em',
          }}>
            <AnimatedHeadline text="Find your coach." delay={200} />
            <br />
            <span className="gold-shimmer" style={{ fontStyle: 'italic' }}>
              <AnimatedHeadline text="Any sport. 24/7." delay={500} />
            </span>
          </h1>

          <p style={{ animation: 'fadeSlideUp 0.7s ease 0.8s both', fontSize: '17px', color: 'rgba(245,240,232,0.6)', lineHeight: '1.7', marginBottom: '48px', marginTop: '24px', fontWeight: '300', maxWidth: '520px', margin: '24px auto 48px' }}>
            Real coaches across every discipline — powered by AI.<br />Your program, community, and results, all in one place.
          </p>

          <div style={{ animation: 'fadeSlideUp 0.7s ease 1s both', display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => document.getElementById('coaches-grid')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '16px 36px', borderRadius: '8px', background: GOLD, color: BG, border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.2s', boxShadow: `0 4px 24px rgba(201,168,76,0.35)` }}
              onMouseEnter={e => { e.currentTarget.style.background = GOLD_LIGHT; e.currentTarget.style.boxShadow = '0 8px 40px rgba(201,168,76,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.boxShadow = '0 4px 24px rgba(201,168,76,0.35)'; }}
            >
              Find a coach
            </button>
            <button
              onClick={() => navigate('/coach/signup')}
              style={{ padding: '16px 36px', borderRadius: '8px', border: `1px solid ${GOLD}66`, background: 'rgba(201,168,76,0.08)', fontFamily: 'inherit', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: GOLD, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = 'rgba(201,168,76,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = GOLD + '66'; e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; }}
            >
              Become a coach
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', animation: 'fadeSlideUp 0.7s ease 1.4s both' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: TEXT_FAINT }}>Scroll</span>
          <div style={{ width: '1px', height: '40px', background: `linear-gradient(to bottom, ${GOLD}, transparent)`, animation: 'pulse 2s ease infinite' }} />
        </div>
      </section>

      {/* ── COACHES SECTION ── */}
      <section id="coaches-grid" style={{ padding: '80px 32px', maxWidth: '1240px', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '12px' }}>Our coaches</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: TEXT, lineHeight: '1.15', margin: 0 }}>
              Find the coach<br /><span style={{ color: TEXT_FAINT, fontStyle: 'italic' }}>that moves you.</span>
            </h2>
          </div>
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
                    border: `1px solid ${isActive ? GOLD : BORDER}`,
                    background: isActive ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: isActive ? GOLD : TEXT_DIM,
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

        {/* Carousel */}
        {loadingCoaches ? (
          <div style={{ display: 'flex', gap: '20px', overflow: 'hidden' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ width: '300px', flexShrink: 0 }}><LoadingSkeleton type="card" /></div>)}
          </div>
        ) : coaches.length === 0 ? (
          <EmptyState message="No coaches yet." cta="Become a coach" onCta={() => navigate('/coach/signup')} />
        ) : (
          <CoachCarousel coaches={coaches} onView={id => navigate(`/coach/${id}`)} />
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px 32px', background: SURFACE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '14px' }}>How it works</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: TEXT, margin: 0 }}>
              Coaching, <span style={{ fontStyle: 'italic', color: GOLD }}>reimagined.</span>
            </h2>
          </div>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', background: BORDER, borderRadius: '16px', overflow: 'hidden' }}>
            {[
              { label: 'Subscribe', title: 'Choose your coach', body: 'Browse coaches across every sport and discipline. Pick a program built for your goals and subscribe monthly.' },
              { label: 'Train', title: 'Get your AI + plan', body: "Your coach's AI is available 24/7. A custom training plan, nutrition guidance, and daily check-ins — tailored to you." },
              { label: 'Grow', title: 'Track progress', body: 'Weekly reviews, direct coach messaging, and real progress tracking. Your coach adjusts your plan as you grow.' },
            ].map((step, i) => (
              <div key={i}
                style={{ background: SURFACE, padding: '40px 32px', position: 'relative', overflow: 'hidden', transition: 'background 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.background = SURFACE_2}
                onMouseLeave={e => e.currentTarget.style.background = SURFACE}
              >
                <div style={{ position: 'absolute', top: '20px', right: '24px', fontFamily: "'Playfair Display', serif", fontSize: '80px', fontWeight: '900', color: 'rgba(201,168,76,0.06)', lineHeight: 1 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: '16px' }}>{step.label}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: TEXT, marginBottom: '14px', lineHeight: '1.3' }}>{step.title}</h3>
                <p style={{ fontSize: '13px', color: TEXT_DIM, lineHeight: '1.8', margin: 0, fontWeight: '300' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '120px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '20px' }}>Start today</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '900', color: TEXT, lineHeight: '1.1', marginBottom: '20px' }}>
            Ready to find<br /><span style={{ fontStyle: 'italic', color: GOLD }}>your coach?</span>
          </h2>
          <p style={{ fontSize: '15px', color: TEXT_DIM, marginBottom: '40px', lineHeight: '1.7', fontWeight: '300' }}>
            Athletes everywhere are already training smarter. Your coach is waiting.
          </p>
          <button
            onClick={() => document.getElementById('coaches-grid')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '17px 44px', borderRadius: '8px', background: GOLD, color: BG, border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 40px rgba(201,168,76,0.3)', transition: 'all 0.2s', letterSpacing: '0.02em' }}
            onMouseEnter={e => { e.currentTarget.style.background = GOLD_LIGHT; e.currentTarget.style.boxShadow = '0 8px 60px rgba(201,168,76,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.boxShadow = '0 4px 40px rgba(201,168,76,0.3)'; e.currentTarget.style.transform = 'none'; }}
          >
            Browse coaches →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '32px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: '800', fontSize: '16px', color: TEXT, letterSpacing: '0.08em' }}>
          COACHLY<span style={{ color: GOLD }}>.</span>
        </span>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <button onClick={() => navigate('/coach/signup')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_FAINT, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = TEXT_FAINT}>For coaches</button>
          <button onClick={() => setLegalModal('terms')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_FAINT, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = TEXT_FAINT}>Terms</button>
          <button onClick={() => setLegalModal('privacy')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_FAINT, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = TEXT_FAINT}>Privacy</button>
        </div>
        <div style={{ fontSize: '12px', color: TEXT_FAINT }}>© {new Date().getFullYear()} Coachly</div>
      </footer>
    </div>
  );
}