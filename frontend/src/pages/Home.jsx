import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches, getRankedCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

/* ─── Theme tokens ───
   White/beige base stays as the neutral canvas (cards, text, structure).
   On top of it, a fixed ambient color-wash layer shifts hue as the user scrolls:
   sunrise orange (hero) -> track blue (coaches) -> field green (CTA/footer).
   This is the "colors swipe while scrolling" signature element.
*/
const BG = '#FAF7F0';
const SURFACE = '#FFFFFF';
const SURFACE_2 = '#F3EEE3';
const BORDER = '#E7E0D2';
const GOLD = '#B8923D';
const GOLD_LIGHT = '#D9B768';
const TEXT = '#1C1A14';
const TEXT_DIM = '#6B6555';
const TEXT_FAINT = '#A39C87';

// Scroll-wash stops: [r,g,b] — sunrise orange -> track blue -> field green
const WASH_STOPS = [
  [232, 119, 34],  // 0%   sunrise orange (hero)
  [232, 119, 34],  // 10%  hold at hero
  [44, 110, 196],  // 45%  track blue (coaches section)
  [44, 110, 196],  // 65%  hold through how-it-works
  [42, 157, 90],   // 100% field green (CTA/footer)
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
      { heading: 'Information We Collect', body: 'We collect information you provide directly to us when you create an account, subscribe to a coach, or communicate with us. This includes your name, email address, payment information, fitness goals, and any content you upload or share on the platform.' },
      { heading: 'How We Use Your Information', body: 'We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, respond to your comments and questions, and send you marketing communications (with your consent).' },
      { heading: 'Information Sharing', body: 'We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website.' },
      { heading: 'Data Security', body: 'We implement a variety of security measures to maintain the safety of your personal information.' },
      { heading: 'Contact Us', body: 'If you have any questions about this Privacy Policy, please contact us at privacy@coachly.app.' },
    ],
  } : {
    title: 'Terms of Service',
    sections: [
      { heading: 'Acceptance of Terms', body: 'By accessing or using Coachly, you agree to be bound by these Terms of Service.' },
      { heading: 'Use of Service', body: 'Coachly provides a platform connecting clients with fitness and wellness coaches. You agree to use the service only for lawful purposes.' },
      { heading: 'Subscriptions & Payments', body: 'Subscriptions are billed monthly. You may cancel at any time.' },
      { heading: 'Coach Content', body: 'Coaches are independent professionals responsible for their content. Always consult a healthcare professional before starting any fitness program.' },
      { heading: 'Contact', body: 'For questions, contact us at legal@coachly.app.' },
    ],
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(28,26,20,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '20px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(28,26,20,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: TEXT }}>{content.title}</div>
          <button onClick={onClose} style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, color: TEXT_DIM, cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px' }}>×</button>
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
const AVATAR_COLORS = ['#B8923D', '#2C6EC4', '#2A9D5A', '#d9603a', '#5a5ad0', '#8b5cf6', '#1ba1c2'];
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
   FIX from last round: the reveal strip is now properly contained inside an
   overflow:hidden wrapper with z-index below the card face, so it is fully
   invisible until the card is dragged — no more permanent gold block under
   every card.
*/
function CoachCard({ coach, onView, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(null);
  const startedRevealed = useRef(false);
  const didDrag = useRef(false);

  const REVEAL_WIDTH = 88;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startedRevealed.current = revealed;
    didDrag.current = false;
    isDragging.current = true;
  };
  const onTouchMove = (e) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 6) didDrag.current = true;
    const base = startedRevealed.current ? -REVEAL_WIDTH : 0;
    setDragX(clamp(base + dx, -REVEAL_WIDTH, 0));
  };
  const onTouchEnd = () => {
    const shouldReveal = dragX < -REVEAL_WIDTH / 2;
    setRevealed(shouldReveal);
    setDragX(shouldReveal ? -REVEAL_WIDTH : 0);
    startX.current = null;
    isDragging.current = false;
  };

  const handleCardClick = () => {
    if (didDrag.current) { didDrag.current = false; return; }
    if (revealed) { setRevealed(false); setDragX(0); return; }
    onView(coach.slug || coach.id);
  };

  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        width: '272px',
        scrollSnapAlign: 'start',
        borderRadius: '20px',
        overflow: 'hidden',          // <- contains the reveal strip; nothing escapes the card bounds
        animation: 'fadeSlideUp 0.6s ease both',
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Action strip — sits behind the card face, fully hidden until dragX < 0 */}
      <div
        onClick={() => onView(coach.slug || coach.id)}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: `${REVEAL_WIDTH}px`,
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`, color: '#fff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'center',
          padding: '0 6px', zIndex: 0,
        }}
      >
        <span style={{ fontSize: '18px' }}>→</span>
        View<br />profile
      </div>

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
        style={{
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          position: 'relative',
          zIndex: 1,                 // <- card face always sits on top of the strip
          background: SURFACE,
          border: `1px solid ${hovered ? GOLD + '88' : BORDER}`,
          borderRadius: '20px',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
          transform: `translateX(${dragX}px) ${pressed ? 'scale(0.985)' : hovered ? 'translateY(-6px)' : ''}`,
          transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.22,1,0.36,1), border-color 0.25s, box-shadow 0.25s',
          boxShadow: hovered ? '0 20px 48px -16px rgba(28,26,20,0.18)' : '0 1px 3px rgba(28,26,20,0.06)',
        }}
      >
        <div style={{ height: '176px', background: coach.banner ? `url(${coach.banner}) center/cover` : `linear-gradient(135deg, ${SURFACE_2}, #e9dfc8)`, position: 'relative' }}>
          {!coach.banner && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: avatarColor(coach.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#fff' }}>
                {initials(coach.name)}
              </div>
            </div>
          )}
          {coach.photo && (
            <img src={coach.photo} alt={coach.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {coach.category_name && (
            <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', color: GOLD, fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '5px 10px', borderRadius: '100px' }}>
              {coach.category_name}
            </span>
          )}
        </div>

        <div style={{ padding: '18px 18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '700', color: TEXT }}>{coach.name}</div>
            {coach.plan_price != null && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '700', color: GOLD }}>${Number(coach.plan_price).toFixed(0)}</div>
                <div style={{ fontSize: '10px', color: TEXT_FAINT }}>/month</div>
              </div>
            )}
          </div>
          {coach.tagline && <p style={{ fontSize: '12px', color: TEXT_DIM, lineHeight: '1.5', margin: '0 0 12px' }}>{coach.tagline}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: `1px solid ${BORDER}` }}>
            {coach.rating > 0 && <span style={{ fontSize: '11px', color: GOLD, fontWeight: '600' }}>★ {coach.rating}</span>}
            {coach.subscriber_count > 0 && <span style={{ fontSize: '11px', color: TEXT_FAINT }}>{coach.subscriber_count} clients</span>}
            {coach.years_experience > 0 && <span style={{ fontSize: '11px', color: TEXT_FAINT }}>{coach.years_experience}y exp</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Coach Row ─── */
function CoachRow({ title, coaches, onView }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

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
  }, [coaches, updateArrows]);

  const scrollByCards = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (272 + 18) * 2, behavior: 'smooth' });
  };

  if (!coaches.length) return null;

  return (
    <div style={{ marginBottom: '44px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px', paddingLeft: '4px' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: TEXT, margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => scrollByCards(-1)} disabled={!canLeft} className="row-arrow" aria-label="Scroll left"
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1px solid ${BORDER}`, background: SURFACE, color: canLeft ? GOLD : TEXT_FAINT, cursor: canLeft ? 'pointer' : 'default', fontSize: '13px', opacity: canLeft ? 1 : 0.4, transition: 'opacity 0.2s, border-color 0.2s' }}>←</button>
          <button onClick={() => scrollByCards(1)} disabled={!canRight} className="row-arrow" aria-label="Scroll right"
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1px solid ${BORDER}`, background: SURFACE, color: canRight ? GOLD : TEXT_FAINT, cursor: canRight ? 'pointer' : 'default', fontSize: '13px', opacity: canRight ? 1 : 0.4, transition: 'opacity 0.2s, border-color 0.2s' }}>→</button>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, bottom: '16px', right: 0, width: '32px', background: `linear-gradient(to left, ${BG}, transparent)`, zIndex: 2, pointerEvents: 'none', opacity: canRight ? 1 : 0, transition: 'opacity 0.3s' }} />
        <div
          ref={trackRef}
          className="carousel-track"
          style={{ display: 'flex', gap: '18px', overflowX: 'auto', scrollSnapType: 'x proximity', paddingBottom: '16px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {coaches.map((coach, i) => (
            <CoachCard key={coach.id} coach={coach} onView={onView} delay={i * 60} />
          ))}
        </div>
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

/* ─── Scroll-driven ambient color wash ───
   Fixed full-viewport layer behind everything. Reads scroll % of the whole
   page and interpolates through WASH_STOPS: sunrise orange -> track blue ->
   field green. Two soft radial blobs drift and recolor; kept subtle (low
   opacity, blurred) so body text stays readable throughout.
*/
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
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const [r, g, b] = washColorAt(pct);
  const c1 = `rgba(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)},0.16)`;
  const c2 = `rgba(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)},0.08)`;

  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', width: '70vw', height: '70vw', maxWidth: '900px', maxHeight: '900px',
        top: `${-10 + pct * 30}%`, left: `${-15 + pct * 20}%`,
        background: `radial-gradient(circle, ${c1} 0%, transparent 70%)`,
        filter: 'blur(40px)', transition: 'background 0.2s linear',
      }} />
      <div style={{
        position: 'absolute', width: '60vw', height: '60vw', maxWidth: '800px', maxHeight: '800px',
        bottom: `${-15 + (1 - pct) * 20}%`, right: `${-10 + (1 - pct) * 25}%`,
        background: `radial-gradient(circle, ${c2} 0%, transparent 70%)`,
        filter: 'blur(50px)', transition: 'background 0.2s linear',
      }} />
    </div>
  );
}

/* ─── Main ─── */
export default function Home() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [coachesByCategory, setCoachesByCategory] = useState({});
  const [topCoaches, setTopCoaches] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [legalModal, setLegalModal] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const id = 'coachly-home-v5';
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
          50% { opacity: 0.4; }
        }
        * { -webkit-tap-highlight-color: transparent; }
        button { -webkit-tap-highlight-color: transparent; outline: none; }
        button:focus { outline: none; }
        .gold-shimmer {
          background: linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD}, #8f6b22);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .nav-btn:hover { color: ${GOLD} !important; }
        .carousel-track::-webkit-scrollbar { display: none; }
        .row-arrow:hover { border-color: ${GOLD} !important; }
        @media (max-width: 768px) {
          .hero-headline { font-size: 38px !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .nav-for-coaches { display: none !important; }
          .row-arrow { display: none !important; }
        }
        @media (max-width: 500px) {
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
    getRankedCoaches().catch(() => getCoaches(null)).then(setTopCoaches).catch(() => setTopCoaches([]));
  }, []);

  useEffect(() => {
    if (!categories.length) { setLoadingCoaches(false); return; }
    Promise.all(
      categories.map(cat => getCoaches(cat.slug).then(list => [cat.slug, list]).catch(() => [cat.slug, []]))
    ).then(entries => {
      const map = {};
      entries.forEach(([slug, list]) => { map[slug] = list; });
      setCoachesByCategory(map);
    }).catch(() => showToast('Failed to load coaches', 'error'))
      .finally(() => setLoadingCoaches(false));
  }, [categories]);

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
        background: 'rgba(250,247,240,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: '800', fontSize: '20px', color: TEXT, letterSpacing: '0.08em' }}>
            COACHLY<span style={{ color: GOLD }}>.</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="nav-btn nav-for-coaches" onClick={() => navigate('/coach/signup')} style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_DIM, cursor: 'pointer', padding: '8px 14px', transition: 'color 0.2s' }}>
            For coaches
          </button>
          {token && tokenType === 'user' ? (
            <button onClick={() => navigate('/dashboard')} style={{ padding: '9px 20px', borderRadius: '8px', background: GOLD, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              My dashboard
            </button>
          ) : token && tokenType === 'coach' ? (
            <button onClick={() => navigate('/coach/dashboard')} style={{ padding: '9px 20px', borderRadius: '8px', background: GOLD, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              Coach dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/user/login')} style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: 'none', fontFamily: 'inherit', fontSize: '13px', color: TEXT_DIM, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}>
                Log in
              </button>
              <button onClick={() => navigate('/user/login')} style={{ padding: '9px 20px', borderRadius: '8px', background: GOLD, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s' }}
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
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: videoLoaded ? 0.85 : 0, transition: 'opacity 1.2s ease' }}
        >
          {/* TODO: replace with your own direct file URL grabbed from the "Free download" button at
              https://www.pexels.com/video/a-female-athlete-practicing-kick-boxing-with-a-coach-5752065/
              (vertical) or search pexels.com/search/videos/athlete for a 16:9 option — Pexels mints
              a fresh signed CDN link per request so it must be pulled fresh, not hardcoded by me. */}
          <source src="https://videos.pexels.com/video-files/4761789/4761789-uhd_2560_1440_25fps.mp4" type="video/mp4" />
        </video>

        {/* Much lighter wash than last round — video should clearly read through now */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(250,247,240,0.15) 0%, rgba(250,247,240,0.05) 40%, rgba(250,247,240,0.92) 92%)` }} />
        <div style={{ position: 'absolute', top: '64px', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)` }} />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ animation: 'fadeSlideUp 0.6s ease both', fontSize: '11px', fontWeight: '700', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.4)', marginBottom: '24px' }}>
            Every Sport · Every Level · Any Goal
          </div>

          <h1 className="hero-headline" style={{ fontFamily: "'Playfair Display', serif", fontSize: '72px', fontWeight: '900', lineHeight: '1.04', color: '#fff', textShadow: '0 4px 24px rgba(0,0,0,0.35)', margin: 0, letterSpacing: '-0.02em' }}>
            <AnimatedHeadline text="Find your coach." delay={200} />
            <br />
            <span className="gold-shimmer" style={{ fontStyle: 'italic' }}>
              <AnimatedHeadline text="Any sport. 24/7." delay={500} />
            </span>
          </h1>

          <p style={{ animation: 'fadeSlideUp 0.7s ease 0.8s both', fontSize: '17px', color: 'rgba(255,255,255,0.92)', textShadow: '0 2px 10px rgba(0,0,0,0.35)', lineHeight: '1.7', fontWeight: '400', maxWidth: '520px', margin: '24px auto 48px' }}>
            Real coaches across every discipline, each with their own AI assistant to support you.<br />Your program, community, and progress, all in one place.
          </p>

          <div style={{ animation: 'fadeSlideUp 0.7s ease 1s both', display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => document.getElementById('coaches-grid')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '16px 36px', borderRadius: '8px', background: GOLD, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.2s', boxShadow: '0 6px 24px rgba(0,0,0,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = GOLD_LIGHT; }}
              onMouseLeave={e => { e.currentTarget.style.background = GOLD; }}
            >
              Find a coach
            </button>
            <button
              onClick={() => navigate('/coach/signup')}
              style={{ padding: '16px 36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', fontFamily: 'inherit', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            >
              Become a coach
            </button>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', animation: 'fadeSlideUp 0.7s ease 1.4s both', zIndex: 2 }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>Scroll</span>
          <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, #fff, transparent)', animation: 'pulse 2s ease infinite' }} />
        </div>
      </section>

      {/* ── COACHES SECTION ── */}
      <section id="coaches-grid" style={{ position: 'relative', zIndex: 1, padding: '80px 32px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '12px' }}>Our coaches</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: TEXT, lineHeight: '1.15', margin: 0 }}>
            Find the coach<br /><span style={{ color: TEXT_FAINT, fontStyle: 'italic' }}>that moves you.</span>
          </h2>
        </div>

        {loadingCoaches ? (
          <div style={{ display: 'flex', gap: '18px', overflow: 'hidden' }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ width: '272px', flexShrink: 0 }}><LoadingSkeleton type="card" /></div>)}
          </div>
        ) : topCoaches.length === 0 && Object.values(coachesByCategory).every(l => l.length === 0) ? (
          <EmptyState message="No coaches yet." cta="Become a coach" onCta={() => navigate('/coach/signup')} />
        ) : (
          <>
            <CoachRow title="Top rated" coaches={topCoaches} onView={id => navigate(`/coach/${id}`)} />
            {categories.map(cat => (
              <CoachRow key={cat.id} title={cat.name} coaches={coachesByCategory[cat.slug] || []} onView={id => navigate(`/coach/${id}`)} />
            ))}
          </>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 32px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(2px)', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '14px' }}>How it works</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: TEXT, margin: 0 }}>
              Coaching, <span style={{ fontStyle: 'italic', color: GOLD }}>reimagined.</span>
            </h2>
          </div>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', background: BORDER, borderRadius: '16px', overflow: 'hidden' }}>
            {[
              { label: 'Subscribe', title: 'Choose your coach', body: 'Browse real coaches across every sport and discipline. Pick a program built for your goals and subscribe monthly.' },
              { label: 'Train', title: 'Get your plan + AI helper', body: "Each coach gives you a custom training plan and a built-in AI helper for quick questions between sessions — your coach still leads the program." },
              { label: 'Grow', title: 'Track progress', body: 'Weekly reviews, direct coach messaging, and real progress tracking. Your coach adjusts your plan as you grow.' },
            ].map((step, i) => (
              <div key={i}
                style={{ background: SURFACE, padding: '40px 32px', position: 'relative', overflow: 'hidden', transition: 'background 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.background = SURFACE_2}
                onMouseLeave={e => e.currentTarget.style.background = SURFACE}
              >
                <div style={{ position: 'absolute', top: '20px', right: '24px', fontFamily: "'Playfair Display', serif", fontSize: '80px', fontWeight: '900', color: 'rgba(184,146,61,0.08)', lineHeight: 1 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: '16px' }}>{step.label}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: TEXT, marginBottom: '14px', lineHeight: '1.3' }}>{step.title}</h3>
                <p style={{ fontSize: '13px', color: TEXT_DIM, lineHeight: '1.8', margin: 0 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '120px 32px', textAlign: 'center' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: '20px' }}>Start today</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '900', color: TEXT, lineHeight: '1.1', marginBottom: '20px' }}>
            Ready to find<br /><span style={{ fontStyle: 'italic', color: GOLD }}>your coach?</span>
          </h2>
          <p style={{ fontSize: '15px', color: TEXT_DIM, marginBottom: '40px', lineHeight: '1.7' }}>
            Athletes everywhere are already training smarter. Your coach is waiting.
          </p>
          <button
            onClick={() => document.getElementById('coaches-grid')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '17px 44px', borderRadius: '8px', background: GOLD, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 32px rgba(184,146,61,0.28)', transition: 'all 0.2s', letterSpacing: '0.02em' }}
            onMouseEnter={e => { e.currentTarget.style.background = GOLD_LIGHT; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.transform = 'none'; }}
          >
            Browse coaches →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', zIndex: 1, padding: '32px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
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