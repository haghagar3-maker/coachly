import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches, getRankedCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

/* ─── Theme tokens ─── */
const BG = '#0A0A0A';
const SURFACE = '#111110';
const SURFACE_2 = '#181816';
const BORDER = '#242420';
const GREEN = '#22C55E';
const GREEN_DIM = '#16A34A';
const GREEN_GLOW = 'rgba(34,197,94,0.18)';
const TEXT = '#F5F5F3';
const TEXT_DIM = '#888882';
const TEXT_FAINT = '#444440';

const WASH_STOPS = [
  [34, 197, 94],
  [34, 197, 94],
  [16, 163, 74],
  [10, 120, 50],
  [6, 80, 30],
];
function lerp(a, b, t) { return a + (b - a) * t; }
function washColorAt(pct) {
  const n = WASH_STOPS.length - 1;
  const segment = Math.min(Math.floor(pct * n), n - 1);
  const localT = pct * n - segment;
  const [r1, g1, b1] = WASH_STOPS[segment];
  const [r2, g2, b2] = WASH_STOPS[segment + 1];
  return [lerp(r1, r2, localT), lerp(g1, g2, localT), lerp(b1, b2, localT)];
}

/* ─── Legal Modal ─── */
function LegalModal({ type, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const content = type === 'privacy' ? {
    title: 'Privacy Policy',
    sections: [
      { heading: 'Information We Collect', body: 'We collect information you provide directly to us when you create an account, subscribe to a coach, or communicate with us.' },
      { heading: 'How We Use Your Information', body: 'We use the information we collect to provide, maintain, and improve our services, process transactions, and send you communications.' },
      { heading: 'Information Sharing', body: 'We do not sell your personally identifiable information to outside parties.' },
      { heading: 'Contact Us', body: 'Questions? Contact us at privacy@coachly.app.' },
    ],
  } : {
    title: 'Terms of Service',
    sections: [
      { heading: 'Acceptance of Terms', body: 'By accessing or using Coachly, you agree to be bound by these Terms of Service.' },
      { heading: 'Use of Service', body: 'Coachly provides a platform connecting clients with fitness and wellness coaches.' },
      { heading: 'Subscriptions & Payments', body: 'Subscriptions are billed monthly. You may cancel at any time.' },
      { heading: 'Contact', body: 'For questions, contact us at legal@coachly.app.' },
    ],
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '20px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: TEXT }}>{content.title}</div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${BORDER}`, color: TEXT_DIM, cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '24px 28px 32px' }}>
          {content.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '700', color: GREEN, marginBottom: '8px' }}>{s.heading}</h3>
              <p style={{ fontSize: '13px', color: TEXT_DIM, lineHeight: '1.75', margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */
const AVATAR_COLORS = ['#22C55E', '#2C6EC4', '#d9603a', '#8b5cf6', '#1ba1c2', '#f59e0b', '#ec4899'];
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
  const [pressed, setPressed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const touchStartX = useRef(null);

  const ACTION_WIDTH = 90;
  const heroImage = coach.banner || null;
  const profilePic = coach.photo || null;

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -30) { setRevealed(true); return; }
    if (dx > 30) { setRevealed(false); return; }
  };

  const handleCardTap = () => {
    if (revealed) { onView(coach.slug || coach.id); return; }
    setRevealed(true);
  };

  // Parse specialties — try JSON array, fallback to comma split
  let specialties = [];
  if (coach.specialties) {
    try { specialties = JSON.parse(coach.specialties); }
    catch { specialties = coach.specialties.split(',').map(s => s.trim()).filter(Boolean); }
  }

  return (
    <div style={{
      width: '100%',
      borderRadius: '18px',
      overflow: 'hidden',
      display: 'flex',
      animation: 'fadeSlideUp 0.55s ease both',
      animationDelay: `${delay}ms`,
    }}>
      {/* Card face */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={handleCardTap}
        style={{
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          flex: '1 1 auto',
          minWidth: 0,
          marginRight: revealed ? '0px' : `-${ACTION_WIDTH}px`,
          transition: 'margin-right 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.22s ease, border-color 0.22s, box-shadow 0.22s',
          position: 'relative',
          zIndex: 1,
          background: SURFACE,
          border: `1px solid ${hovered ? GREEN + '55' : BORDER}`,
          borderRadius: '18px',
          cursor: 'pointer',
          userSelect: 'none',
          transform: pressed ? 'scale(0.985)' : hovered ? 'translateY(-6px)' : 'none',
          boxShadow: hovered ? `0 20px 50px -16px rgba(0,0,0,0.6), 0 0 0 1px ${GREEN}22` : '0 2px 12px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Banner hero */}
        <div style={{ height: '200px', position: 'relative', overflow: 'hidden', borderRadius: '18px 18px 0 0', flexShrink: 0, background: heroImage ? '#000' : `linear-gradient(135deg, ${SURFACE_2} 0%, #1c1c18 100%)` }}>
          {heroImage ? (
            <img
              src={heroImage}
              alt={coach.name}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.5s ease',
              }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: `${avatarColor(coach.id)}22`, border: `2px solid ${avatarColor(coach.id)}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: avatarColor(coach.id) }}>
                {initials(coach.name)}
              </div>
            </div>
          )}

          {/* Dark gradient for readability */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.72) 100%)' }} />

          {/* Category pill */}
          {coach.category_name && (
            <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(8px)', color: GREEN, fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '5px 10px', borderRadius: '100px', border: `1px solid ${GREEN}44` }}>
              {coach.category_name}
            </span>
          )}

          {/* Price */}
          {coach.plan_price != null && (
            <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(8px)', color: TEXT, fontSize: '12px', fontWeight: '700', padding: '5px 10px', borderRadius: '100px', border: `1px solid ${BORDER}` }}>
              <span style={{ color: GREEN }}>${Number(coach.plan_price).toFixed(0)}</span>
              <span style={{ color: TEXT_FAINT, fontWeight: '400', fontSize: '11px' }}>/mo</span>
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px 0', flex: 1 }}>
          {/* Specialties chips */}
          {specialties.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {specialties.slice(0, 3).map((sp, i) => (
                <span key={i} style={{ fontSize: '10px', fontWeight: '600', color: TEXT_DIM, background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: '100px', padding: '3px 9px' }}>
                  {sp}
                </span>
              ))}
            </div>
          )}

          {/* Tagline */}
          {coach.tagline && (
            <p style={{ fontSize: '12.5px', color: TEXT_DIM, lineHeight: '1.55', margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              "{coach.tagline}"
            </p>
          )}

          {/* Stats row */}
          {(coach.rating > 0 || coach.subscriber_count > 0 || coach.years_experience > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              {coach.rating > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: GREEN, fontWeight: '700' }}>
                  <span>★</span><span>{Number(coach.rating).toFixed(1)}</span>
                </span>
              )}
              {coach.subscriber_count > 0 && (
                <span style={{ fontSize: '11px', color: TEXT_FAINT }}>{coach.subscriber_count} clients</span>
              )}
              {coach.years_experience > 0 && (
                <span style={{ fontSize: '11px', color: TEXT_FAINT }}>{coach.years_experience}y exp</span>
              )}
            </div>
          )}
        </div>

        {/* Bottom strip — profile pic + name */}
        <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '11px', marginTop: 'auto' }}>
          {/* Profile pic */}
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: profilePic ? '#000' : avatarColor(coach.id), border: `2px solid ${GREEN}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profilePic ? (
              <img src={profilePic} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{initials(coach.name)}</span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: TEXT, lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {coach.name}
            </div>
            {coach.location && (
              <div style={{ fontSize: '11px', color: TEXT_FAINT, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                📍 {coach.location}
              </div>
            )}
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '16px', color: revealed ? GREEN : TEXT_FAINT, transition: 'color 0.2s' }}>→</div>
        </div>
      </div>

      {/* Action strip — normal-flow, no absolute positioning */}
      <button
        onClick={(e) => { e.stopPropagation(); onView(coach.slug || coach.id); }}
        style={{
          flexShrink: 0,
          width: `${ACTION_WIDTH}px`,
          border: 'none',
          background: `linear-gradient(135deg, ${GREEN_DIM}, ${GREEN})`,
          color: '#050f08',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', textAlign: 'center', padding: '0 8px',
          fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase',
        }}
      >
        <span style={{ fontSize: '22px' }}>→</span>
        View<br />Profile
      </button>
    </div>
  );
}

/* ─── Animated headline ─── */
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
          transform: visible ? 'translateY(0)' : 'translateY(28px)',
          transition: `opacity 0.65s ease ${i * 90}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${i * 90}ms`,
          marginRight: '0.26em',
        }}>{word}</span>
      ))}
    </span>
  );
}

/* ─── Scroll color wash ─── */
function ScrollColorWash() {
  const [pct, setPct] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setPct(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
        rafRef.current = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);
  const [r, g, b] = washColorAt(pct);
  const c1 = `rgba(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)},0.14)`;
  const c2 = `rgba(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)},0.08)`;
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: '65vw', height: '65vw', maxWidth: '800px', maxHeight: '800px', top: `${-5 + pct * 25}%`, left: `${-10 + pct * 15}%`, background: `radial-gradient(circle, ${c1} 0%, transparent 70%)`, filter: 'blur(55px)', transition: 'background 0.25s linear' }} />
      <div style={{ position: 'absolute', width: '55vw', height: '55vw', maxWidth: '700px', maxHeight: '700px', bottom: `${-10 + (1 - pct) * 18}%`, right: `${-8 + (1 - pct) * 20}%`, background: `radial-gradient(circle, ${c2} 0%, transparent 70%)`, filter: 'blur(65px)', transition: 'background 0.25s linear' }} />
    </div>
  );
}

/* ─── Coaches row carousel (4 visible, scroll for more) ─── */
function CoachesCarousel({ coaches, onView }) {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => { el.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll); };
  }, [coaches]);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    // scroll by ~2 card widths
    const cardW = el.querySelector('[data-coach-card]')?.offsetWidth || 320;
    el.scrollBy({ left: dir * (cardW * 2 + 28), behavior: 'smooth' });
  };

  const ArrowBtn = ({ dir, visible }) => (
    <button
      onClick={() => scroll(dir)}
      style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        [dir === -1 ? 'left' : 'right']: '-18px',
        zIndex: 10,
        width: '40px', height: '40px', borderRadius: '50%',
        background: SURFACE_2, border: `1px solid ${visible ? GREEN + '66' : BORDER}`,
        color: visible ? GREEN : TEXT_FAINT, fontSize: '16px', cursor: visible ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0.25,
        transition: 'all 0.2s',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >{dir === -1 ? '‹' : '›'}</button>
  );

  return (
    <div style={{ position: 'relative' }}>
      <ArrowBtn dir={-1} visible={canLeft} />
      <ArrowBtn dir={1} visible={canRight} />

      {/* Left fade */}
      {canLeft && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px', background: `linear-gradient(to right, ${BG}, transparent)`, zIndex: 5, pointerEvents: 'none' }} />}
      {/* Right fade */}
      {canRight && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px', background: `linear-gradient(to left, ${BG}, transparent)`, zIndex: 5, pointerEvents: 'none' }} />}

      <div
        ref={rowRef}
        style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          paddingBottom: '8px',
          paddingLeft: '2px',
          paddingRight: '2px',
        }}
      >
        {coaches.map((coach, i) => (
          <div
            key={coach.id}
            data-coach-card=""
            style={{
              flex: '0 0 calc(25% - 15px)',
              minWidth: '260px',
              maxWidth: '340px',
              scrollSnapAlign: 'start',
            }}
          >
            <CoachCard coach={coach} onView={onView} delay={i * 50} />
          </div>
        ))}
      </div>
    </div>
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

  useEffect(() => {
    const id = 'coachly-home-v8';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = `
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        button { -webkit-tap-highlight-color: transparent; outline: none; }
        .green-shimmer {
          background: linear-gradient(90deg, #22C55E, #86efac, #22C55E, #16A34A);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .nav-btn:hover { color: ${GREEN} !important; }
        .cat-pill:hover { border-color: ${GREEN} !important; color: ${GREEN} !important; }
        ::-webkit-scrollbar { display: none; }
        @media (max-width: 1200px) {
          .coaches-row [data-coach-card] { flex: 0 0 calc(33.333% - 14px) !important; }
        }
        @media (max-width: 900px) {
          .coaches-row [data-coach-card] { flex: 0 0 calc(50% - 10px) !important; }
          .hero-headline { font-size: 38px !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .nav-for-coaches { display: none !important; }
        }
        @media (max-width: 560px) {
          .coaches-row [data-coach-card] { flex: 0 0 85vw !important; }
          .hero-headline { font-size: 30px !important; }
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
    <div style={{ position: 'relative', minHeight: '100vh', background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>
      <ScrollColorWash />
      <Toast />
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      {/* ── NAVBAR ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: '800', fontSize: '20px', color: TEXT, letterSpacing: '0.08em' }}>
            COACHLY<span style={{ color: GREEN }}>.</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="nav-btn nav-for-coaches" onClick={() => navigate('/coach/signup')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_DIM, cursor: 'pointer', padding: '8px 14px', transition: 'color 0.2s' }}>
            For coaches
          </button>
          {token && tokenType === 'user' ? (
            <button onClick={() => navigate('/dashboard')} style={{ padding: '9px 20px', borderRadius: '8px', background: GREEN, color: '#050f08', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              My dashboard
            </button>
          ) : token && tokenType === 'coach' ? (
            <button onClick={() => navigate('/coach/dashboard')} style={{ padding: '9px 20px', borderRadius: '8px', background: GREEN, color: '#050f08', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              Coach dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/user/login')} style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_DIM, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.color = GREEN; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}>
                Log in
              </button>
              <button onClick={() => navigate('/user/login')} style={{ padding: '9px 20px', borderRadius: '8px', background: GREEN, color: '#050f08', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s' }}
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
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          onLoadedData={() => setVideoLoaded(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: videoLoaded ? 0.4 : 0, transition: 'opacity 1.5s ease' }}
        >
          {/* TODO: replace with your chosen landscape video from pexels.com */}
          <source src="https://videos.pexels.com/video-files/4761789/4761789-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>

        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.18) 50%, rgba(10,10,10,0.92) 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, transparent 40%, rgba(10,10,10,0.55) 100%)` }} />

        {/* Green accent line under nav */}
        <div style={{ position: 'absolute', top: '64px', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${GREEN}55, transparent)` }} />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ animation: 'fadeSlideUp 0.6s ease both', fontSize: '11px', fontWeight: '700', letterSpacing: '0.22em', textTransform: 'uppercase', color: GREEN, marginBottom: '22px' }}>
            Every Sport · Every Level · Any Goal
          </div>

          <h1 className="hero-headline" style={{ fontFamily: "'Playfair Display', serif", fontSize: '68px', fontWeight: '900', lineHeight: '1.05', color: TEXT, margin: 0, letterSpacing: '-0.02em' }}>
            <AnimatedHeadline text="Find your coach." delay={200} />
            <br />
            <span className="green-shimmer" style={{ fontStyle: 'italic' }}>
              <AnimatedHeadline text="Any sport. 24/7." delay={480} />
            </span>
          </h1>

          <p style={{ animation: 'fadeSlideUp 0.7s ease 0.8s both', fontSize: '16px', color: 'rgba(245,245,243,0.55)', lineHeight: '1.75', fontWeight: '300', maxWidth: '500px', margin: '22px auto 44px' }}>
            Real coaches across every discipline, each with their own AI assistant to support you between sessions.
          </p>

          <div style={{ animation: 'fadeSlideUp 0.7s ease 1s both', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => document.getElementById('coaches-section')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '15px 34px', borderRadius: '8px', background: GREEN, color: '#050f08', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.2s', boxShadow: `0 4px 24px ${GREEN_GLOW}` }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4ade80'; e.currentTarget.style.boxShadow = `0 8px 40px rgba(34,197,94,0.4)`; }}
              onMouseLeave={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.boxShadow = `0 4px 24px ${GREEN_GLOW}`; }}
            >
              Find a coach
            </button>
            <button
              onClick={() => navigate('/coach/signup')}
              style={{ padding: '15px 34px', borderRadius: '8px', border: `1px solid ${GREEN}55`, background: 'rgba(34,197,94,0.05)', fontFamily: 'inherit', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: GREEN, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = GREEN + '55'; e.currentTarget.style.background = 'rgba(34,197,94,0.05)'; }}
            >
              Become a coach
            </button>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', animation: 'fadeSlideUp 0.7s ease 1.4s both' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: TEXT_FAINT }}>Scroll</span>
          <div style={{ width: '1px', height: '36px', background: `linear-gradient(to bottom, ${GREEN}, transparent)`, animation: 'pulse 2s ease infinite' }} />
        </div>
      </section>

      {/* ── COACHES SECTION ── */}
      <section id="coaches-section" style={{ position: 'relative', zIndex: 1, padding: '80px 40px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GREEN, marginBottom: '10px' }}>Our coaches</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: '800', color: TEXT, lineHeight: '1.15', margin: 0 }}>
            Find the coach <span style={{ color: TEXT_FAINT, fontStyle: 'italic' }}>that moves you.</span>
          </h2>
        </div>

        {/* Category filter bar */}
        {!loadingCategories && categories.length > 0 && (
          <div style={{ display: 'flex', gap: '7px', marginBottom: '32px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
            {[{ id: 'all', name: 'All', slug: null }].concat(categories).map(cat => {
              const isActive = cat.slug === null ? activeCategory === null : activeCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  className="cat-pill"
                  onClick={() => setActiveCategory(cat.slug === activeCategory ? null : (cat.slug ?? null))}
                  style={{
                    padding: '8px 18px', borderRadius: '100px', whiteSpace: 'nowrap', flexShrink: 0,
                    border: `1px solid ${isActive ? GREEN : BORDER}`,
                    background: isActive ? 'rgba(34,197,94,0.1)' : 'transparent',
                    color: isActive ? GREEN : TEXT_DIM,
                    fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.18s',
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Carousel — 4 cards visible, scroll for more */}
        {loadingCoaches ? (
          <div style={{ display: 'flex', gap: '20px' }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ flex: '0 0 calc(25% - 15px)', minWidth: '260px' }}><LoadingSkeleton type="card" /></div>)}
          </div>
        ) : coaches.length === 0 ? (
          <EmptyState message="No coaches yet." cta="Become a coach" onCta={() => navigate('/coach/signup')} />
        ) : (
          <div className="coaches-row">
            <CoachesCarousel coaches={coaches} onView={id => navigate(`/coach/${id}`)} />
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 40px', background: SURFACE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GREEN, marginBottom: '12px' }}>How it works</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: '800', color: TEXT, margin: 0 }}>
              Coaching, <span style={{ fontStyle: 'italic', color: GREEN }}>reimagined.</span>
            </h2>
          </div>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', background: BORDER, borderRadius: '16px', overflow: 'hidden' }}>
            {[
              { label: 'Subscribe', title: 'Choose your coach', body: 'Browse real coaches across every sport and discipline. Pick a program built for your goals.' },
              { label: 'Train', title: 'Get your plan + AI helper', body: "Each coach gives you a custom training plan and a built-in AI helper for quick questions — your coach still leads the program." },
              { label: 'Grow', title: 'Track your progress', body: 'Weekly reviews, direct coach messaging, and real progress tracking. Your coach adjusts your plan as you grow.' },
            ].map((step, i) => (
              <div key={i}
                style={{ background: SURFACE, padding: '40px 30px', position: 'relative', overflow: 'hidden', transition: 'background 0.25s' }}
                onMouseEnter={e => e.currentTarget.style.background = SURFACE_2}
                onMouseLeave={e => e.currentTarget.style.background = SURFACE}
              >
                <div style={{ position: 'absolute', top: '16px', right: '20px', fontFamily: "'Playfair Display', serif", fontSize: '72px', fontWeight: '900', color: `${GREEN}08`, lineHeight: 1 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.2em', textTransform: 'uppercase', color: GREEN, marginBottom: '14px' }}>{step.label}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '19px', fontWeight: '700', color: TEXT, marginBottom: '12px', lineHeight: '1.3' }}>{step.title}</h3>
                <p style={{ fontSize: '13px', color: TEXT_DIM, lineHeight: '1.8', margin: 0 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '120px 40px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '580px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GREEN, marginBottom: '18px' }}>Start today</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: '900', color: TEXT, lineHeight: '1.1', marginBottom: '18px' }}>
            Ready to find<br /><span style={{ fontStyle: 'italic', color: GREEN }}>your coach?</span>
          </h2>
          <p style={{ fontSize: '15px', color: TEXT_DIM, marginBottom: '38px', lineHeight: '1.75', fontWeight: '300' }}>
            Athletes everywhere are already training smarter. Your coach is waiting.
          </p>
          <button
            onClick={() => document.getElementById('coaches-section')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '16px 42px', borderRadius: '8px', background: GREEN, color: '#050f08', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: `0 4px 40px ${GREEN_GLOW}`, transition: 'all 0.2s', letterSpacing: '0.02em' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#4ade80'; e.currentTarget.style.boxShadow = `0 8px 60px rgba(34,197,94,0.4)`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.boxShadow = `0 4px 40px ${GREEN_GLOW}`; e.currentTarget.style.transform = 'none'; }}
          >
            Browse coaches →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', zIndex: 1, padding: '28px 40px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: '800', fontSize: '16px', color: TEXT, letterSpacing: '0.08em' }}>
          COACHLY<span style={{ color: GREEN }}>.</span>
        </span>
        <div style={{ display: 'flex', gap: '22px', alignItems: 'center' }}>
          <button onClick={() => navigate('/coach/signup')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_FAINT, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = GREEN} onMouseLeave={e => e.currentTarget.style.color = TEXT_FAINT}>For coaches</button>
          <button onClick={() => setLegalModal('terms')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_FAINT, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = GREEN} onMouseLeave={e => e.currentTarget.style.color = TEXT_FAINT}>Terms</button>
          <button onClick={() => setLegalModal('privacy')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_FAINT, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = GREEN} onMouseLeave={e => e.currentTarget.style.color = TEXT_FAINT}>Privacy</button>
        </div>
        <div style={{ fontSize: '12px', color: TEXT_FAINT }}>© {new Date().getFullYear()} Coachly</div>
      </footer>
    </div>
  );
}