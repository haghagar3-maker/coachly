import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches, getRankedCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

/* ─────────────────────────────────────────────
   SCROLL-DRIVEN THEME
   0–25%   → pure black  (hero)
   25–50%  → black fades to white  (coaches section starts)
   50–75%  → white  (coaches section middle)
   75–100% → white fades back to black  (CTA/footer)
───────────────────────────────────────────── */
function useScrollTheme() {
  const [t, setT] = useState(0); // 0 = full black, 1 = full white
  const raf = useRef(null);
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = window.scrollY / max;
      // black(0–0.20) → ramp up to white (0.20–0.45) → white (0.45–0.72) → ramp back (0.72–1.0)
      let val;
      if (pct < 0.20) val = 0;
      else if (pct < 0.45) val = (pct - 0.20) / 0.25;
      else if (pct < 0.72) val = 1;
      else val = 1 - (pct - 0.72) / 0.28;
      setT(Math.max(0, Math.min(1, val)));
    };
    const onScroll = () => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => { update(); raf.current = null; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
  return t;
}

function lerpColor(hex1, hex2, t) {
  const p = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = p(hex1); const [r2,g2,b2] = p(hex2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

const BLACK = '#0A0A0A';
const WHITE = '#FAFAF8';
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';
const GREEN_LIGHT = '#86efac';

// Surface colors that shift with theme
function surfaceTokens(t) {
  return {
    bg:        lerpColor('#0A0A0A', '#FAFAF8', t),
    surface:   lerpColor('#111110', '#FFFFFF', t),
    surface2:  lerpColor('#1A1A18', '#F0F0EC', t),
    border:    lerpColor('#252520', '#D8D8D0', t),
    text:      lerpColor('#F5F5F3', '#0A0A0A', t),
    textDim:   lerpColor('#888882', '#555550', t),
    textFaint: lerpColor('#444440', '#999990', t),
    navBg:     `rgba(${t < 0.5 ? '10,10,10' : '250,250,248'},${0.9})`,
    cardShadow: t > 0.5
      ? '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)'
      : '0 4px 24px rgba(0,0,0,0.4)',
  };
}

/* ─── Legal Modal ─── */
function LegalModal({ type, onClose, tok }) {
  const S = surfaceTokens(tok);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  const content = type === 'privacy' ? {
    title: 'Privacy Policy',
    sections: [
      { heading: 'Information We Collect', body: 'We collect information you provide when creating an account, subscribing to a coach, or communicating with us — name, email, payment info, fitness goals, and content you upload.' },
      { heading: 'How We Use It', body: 'To provide, maintain and improve our services, process transactions, send support messages, and (with your consent) marketing communications.' },
      { heading: 'Information Sharing', body: 'We do not sell or trade your personally identifiable information to outside parties.' },
      { heading: 'Contact', body: 'Questions? privacy@coachly.app' },
    ],
  } : {
    title: 'Terms of Service',
    sections: [
      { heading: 'Acceptance', body: 'By using Coachly you agree to these Terms.' },
      { heading: 'Use of Service', body: 'Coachly connects clients with fitness and wellness coaches. Use only for lawful purposes.' },
      { heading: 'Subscriptions', body: 'Billed monthly. Cancel any time.' },
      { heading: 'Coach Content', body: 'Coaches are independent professionals. Consult a healthcare professional before starting any fitness program.' },
      { heading: 'Contact', body: 'legal@coachly.app' },
    ],
  };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:S.surface, border:`1px solid ${S.border}`, borderRadius:'20px', maxWidth:'580px', width:'100%', maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'24px 28px 18px', borderBottom:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:'19px', fontWeight:'700', color:S.text }}>{content.title}</span>
          <button onClick={onClose} style={{ background:'none', border:`1px solid ${S.border}`, color:S.textDim, cursor:'pointer', width:'32px', height:'32px', borderRadius:'50%', fontSize:'16px' }}>×</button>
        </div>
        <div style={{ overflowY:'auto', padding:'24px 28px 32px' }}>
          {content.sections.map((s,i)=>(
            <div key={i} style={{ marginBottom:'18px' }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'14px', fontWeight:'700', color:GREEN, marginBottom:'6px' }}>{s.heading}</h3>
              <p style={{ fontSize:'13px', color:S.textDim, lineHeight:'1.75', margin:0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */
const AVATAR_COLORS = ['#22C55E','#2C6EC4','#d9603a','#8b5cf6','#1ba1c2','#f59e0b','#ec4899'];
function avatarColor(id) {
  if (!id) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2);
}

/* ─── BIG Coach Card ─── */
function CoachCard({ coach, onView, delay = 0, tok }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const touchStartX = useRef(null);
  const S = surfaceTokens(tok);

  const ACTION_W = 100;
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

  const handleTap = () => { if (revealed) { onView(coach.slug||coach.id); return; } setRevealed(true); };

  let specialties = [];
  if (coach.specialties) {
    try { specialties = JSON.parse(coach.specialties); }
    catch { specialties = String(coach.specialties).split(',').map(s=>s.trim()).filter(Boolean); }
  }

  // star display
  const starRating = coach.rating > 0 ? Number(coach.rating).toFixed(1) : null;

  return (
    <div style={{ width:'100%', borderRadius:'22px', overflow:'hidden', display:'flex', animation:'fadeSlideUp 0.55s ease both', animationDelay:`${delay}ms` }}>
      {/* Card face */}
      <div
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>{ setHovered(false); setPressed(false); }}
        onMouseDown={()=>setPressed(true)}
        onMouseUp={()=>setPressed(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={handleTap}
        style={{
          WebkitTapHighlightColor:'transparent', outline:'none',
          flex:'1 1 auto', minWidth:0,
          marginRight: revealed ? '0px' : `-${ACTION_W}px`,
          transition:'margin-right 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.22s ease, border-color 0.22s, box-shadow 0.22s',
          position:'relative', zIndex:1,
          background: S.surface,
          border:`1px solid ${hovered ? GREEN+'66' : S.border}`,
          borderRadius:'22px',
          cursor:'pointer', userSelect:'none',
          transform: pressed ? 'scale(0.985)' : hovered ? 'translateY(-8px) scale(1.005)' : 'none',
          boxShadow: hovered
            ? `0 28px 60px -16px rgba(0,0,0,${tok>0.5?'0.15':'0.6'}), 0 0 0 1px ${GREEN}33`
            : S.cardShadow,
          display:'flex', flexDirection:'column',
        }}
      >
        {/* ── BANNER ── tall hero image */}
        <div style={{ height:'240px', position:'relative', overflow:'hidden', borderRadius:'22px 22px 0 0', flexShrink:0, background: heroImage ? '#000' : `linear-gradient(135deg, ${S.surface2} 0%, ${S.surface} 100%)` }}>
          {heroImage ? (
            <img src={heroImage} alt={coach.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transform: hovered ? 'scale(1.06)' : 'scale(1)', transition:'transform 0.55s ease' }} />
          ) : (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:`${avatarColor(coach.id)}20`, border:`2px dashed ${avatarColor(coach.id)}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', fontWeight:'700', color:avatarColor(coach.id) }}>
                {initials(coach.name)}
              </div>
            </div>
          )}
          {/* Gradient overlay */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.75) 100%)' }} />

          {/* Category */}
          {coach.category_name && (
            <span style={{ position:'absolute', top:'14px', left:'14px', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(10px)', color:GREEN, fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.09em', padding:'5px 11px', borderRadius:'100px', border:`1px solid ${GREEN}44` }}>
              {coach.category_name}
            </span>
          )}

          {/* Price badge */}
          {coach.plan_price != null && (
            <span style={{ position:'absolute', top:'14px', right:'14px', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(10px)', color:'#fff', fontSize:'13px', fontWeight:'700', padding:'5px 12px', borderRadius:'100px', border:'1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ color:GREEN }}>${Number(coach.plan_price).toFixed(0)}</span>
              <span style={{ color:'rgba(255,255,255,0.4)', fontWeight:'400', fontSize:'11px' }}>/mo</span>
            </span>
          )}

          {/* Rating badge over banner */}
          {starRating && (
            <span style={{ position:'absolute', bottom:'14px', right:'14px', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(10px)', color:GREEN, fontSize:'12px', fontWeight:'800', padding:'5px 10px', borderRadius:'100px', border:`1px solid ${GREEN}44`, display:'flex', alignItems:'center', gap:'4px' }}>
              ★ {starRating}
            </span>
          )}
        </div>

        {/* ── BODY ── */}
        <div style={{ padding:'18px 20px 0', flex:1 }}>

          {/* Specialties */}
          {specialties.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'12px' }}>
              {specialties.slice(0,4).map((sp,i)=>(
                <span key={i} style={{ fontSize:'10px', fontWeight:'600', color:GREEN, background:`${GREEN}12`, border:`1px solid ${GREEN}30`, borderRadius:'100px', padding:'3px 10px' }}>
                  {sp}
                </span>
              ))}
            </div>
          )}

          {/* Tagline */}
          {coach.tagline && (
            <p style={{ fontSize:'13px', color:S.textDim, lineHeight:'1.6', margin:'0 0 12px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', fontStyle:'italic' }}>
              "{coach.tagline}"
            </p>
          )}

          {/* Bio snippet */}
          {coach.bio && (
            <p style={{ fontSize:'12px', color:S.textFaint, lineHeight:'1.65', margin:'0 0 12px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {coach.bio}
            </p>
          )}

          {/* Stats row */}
          <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'10px', paddingBottom:'14px' }}>
            {starRating && (
              <div style={{ display:'flex', alignItems:'center', gap:'3px' }}>
                {[1,2,3,4,5].map(n=>(
                  <span key={n} style={{ fontSize:'11px', color: n <= Math.round(Number(starRating)) ? GREEN : S.border }}>★</span>
                ))}
                <span style={{ fontSize:'11px', color:S.textDim, marginLeft:'3px' }}>({starRating})</span>
              </div>
            )}
            {coach.subscriber_count > 0 && (
              <span style={{ fontSize:'11px', color:S.textDim, background:S.surface2, padding:'3px 9px', borderRadius:'100px', border:`1px solid ${S.border}` }}>
                👥 {coach.subscriber_count} clients
              </span>
            )}
            {coach.years_experience > 0 && (
              <span style={{ fontSize:'11px', color:S.textDim, background:S.surface2, padding:'3px 9px', borderRadius:'100px', border:`1px solid ${S.border}` }}>
                🏅 {coach.years_experience}y exp
              </span>
            )}
            {coach.sessions_count > 0 && (
              <span style={{ fontSize:'11px', color:S.textDim, background:S.surface2, padding:'3px 9px', borderRadius:'100px', border:`1px solid ${S.border}` }}>
                ⚡ {coach.sessions_count} sessions
              </span>
            )}
          </div>
        </div>

        {/* ── BOTTOM STRIP ── profile pic + name + location + swipe hint */}
        <div style={{ padding:'14px 20px 18px', borderTop:`1px solid ${S.border}`, display:'flex', alignItems:'center', gap:'12px', marginTop:'auto', background: tok > 0.5 ? '#F5F5F2' : '#0D0D0B', borderRadius:'0 0 22px 22px' }}>
          {/* Profile pic */}
          <div style={{ width:'42px', height:'42px', borderRadius:'50%', flexShrink:0, overflow:'hidden', background: profilePic ? '#000' : avatarColor(coach.id), border:`2px solid ${GREEN}55`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 0 3px ${GREEN}22` }}>
            {profilePic
              ? <img src={profilePic} alt={coach.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>{initials(coach.name)}</span>
            }
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:S.text, lineHeight:'1.2', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {coach.name}
            </div>
            <div style={{ fontSize:'11px', color:S.textFaint, marginTop:'2px', display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
              {coach.location && <span>📍 {coach.location}</span>}
              {coach.response_time && <span>⏱ {coach.response_time}</span>}
            </div>
          </div>
          <div style={{ fontSize:'11px', color: revealed ? GREEN : S.textFaint, transition:'color 0.2s', flexShrink:0, display:'flex', alignItems:'center', gap:'3px', fontWeight:'600' }}>
            {revealed ? <span style={{ color:GREEN }}>→</span> : <span style={{ fontSize:'14px' }}>⋯</span>}
          </div>
        </div>
      </div>

      {/* Action strip — normal-flow flex child */}
      <button
        onClick={(e)=>{ e.stopPropagation(); onView(coach.slug||coach.id); }}
        style={{
          flexShrink:0, width:`${ACTION_W}px`,
          border:'none',
          background:`linear-gradient(160deg, ${GREEN_DARK}, ${GREEN}, ${GREEN_LIGHT})`,
          color:'#03200a',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:'6px', fontSize:'11px', fontWeight:'800', cursor:'pointer', textAlign:'center', padding:'0 8px',
          fontFamily:'inherit', letterSpacing:'0.05em', textTransform:'uppercase',
        }}
      >
        <span style={{ fontSize:'24px' }}>→</span>
        View<br />Profile
      </button>
    </div>
  );
}

/* ─── Animated headline ─── */
function AnimatedHeadline({ text, delay=0 }) {
  const [vis, setVis] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVis(true),delay); return()=>clearTimeout(t); },[delay]);
  return (
    <span>
      {text.split(' ').map((w,i)=>(
        <span key={i} style={{ display:'inline-block', opacity:vis?1:0, transform:vis?'translateY(0)':'translateY(28px)', transition:`opacity 0.65s ease ${i*90}ms,transform 0.65s cubic-bezier(0.22,1,0.36,1) ${i*90}ms`, marginRight:'0.26em' }}>{w}</span>
      ))}
    </span>
  );
}

/* ─── Carousel with arrows ─── */
function CoachesCarousel({ coaches, onView, tok }) {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const S = surfaceTokens(tok);

  const check = useCallback(() => {
    const el = rowRef.current; if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = rowRef.current; if (!el) return;
    check();
    el.addEventListener('scroll', check, { passive:true });
    window.addEventListener('resize', check);
    return ()=>{ el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [coaches, check]);

  const scroll = (dir) => {
    const el = rowRef.current; if (!el) return;
    const cardW = el.querySelector('[data-coach-card]')?.offsetWidth || 320;
    el.scrollBy({ left: dir * (cardW * 2 + 24), behavior:'smooth' });
  };

  const ArrowBtn = ({ dir, vis }) => (
    <button onClick={()=>scroll(dir)} style={{
      position:'absolute', top:'42%', transform:'translateY(-50%)',
      [dir===-1?'left':'right']: '-20px', zIndex:20,
      width:'44px', height:'44px', borderRadius:'50%',
      background:S.surface2, border:`1px solid ${vis?GREEN+'88':S.border}`,
      color: vis?GREEN:S.textFaint, fontSize:'18px', cursor:vis?'pointer':'default',
      display:'flex', alignItems:'center', justifyContent:'center',
      opacity: vis?1:0.2, transition:'all 0.2s',
      pointerEvents: vis?'auto':'none',
      boxShadow: vis?`0 4px 16px rgba(34,197,94,0.2)`:'none',
    }}>{dir===-1?'‹':'›'}</button>
  );

  return (
    <div style={{ position:'relative' }}>
      <ArrowBtn dir={-1} vis={canLeft} />
      <ArrowBtn dir={1} vis={canRight} />
      {canLeft && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'80px', background:`linear-gradient(to right, ${S.bg}, transparent)`, zIndex:10, pointerEvents:'none' }} />}
      {canRight && <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'80px', background:`linear-gradient(to left, ${S.bg}, transparent)`, zIndex:10, pointerEvents:'none' }} />}
      <div ref={rowRef} style={{ display:'flex', gap:'22px', overflowX:'auto', scrollSnapType:'x mandatory', scrollbarWidth:'none', paddingBottom:'12px', paddingLeft:'2px', paddingRight:'2px' }}>
        {coaches.map((coach,i)=>(
          <div key={coach.id} data-coach-card="" style={{ flex:'0 0 calc(25% - 17px)', minWidth:'280px', maxWidth:'380px', scrollSnapAlign:'start' }}>
            <CoachCard coach={coach} onView={onView} delay={i*55} tok={tok} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function Home() {
  const navigate = useNavigate();
  const tok = useScrollTheme();
  const S = surfaceTokens(tok);

  const [categories, setCategories] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [legalModal, setLegalModal] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);

  // Inject global styles once
  useEffect(()=>{
    const id='coachly-home-v9';
    if (document.getElementById(id)) return;
    const s=document.createElement('style'); s.id=id;
    s.textContent=`
      @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
      button{-webkit-tap-highlight-color:transparent;outline:none}
      ::-webkit-scrollbar{display:none}
      .green-shimmer{background:linear-gradient(90deg,#22C55E,#86efac,#22C55E,#16A34A);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite}
      @media(max-width:1200px){[data-coach-card]{flex:0 0 calc(33.333% - 15px) !important}}
      @media(max-width:860px){[data-coach-card]{flex:0 0 calc(50% - 11px) !important} .hero-h1{font-size:38px !important} .how-grid{grid-template-columns:1fr !important} .hide-nav{display:none !important}}
      @media(max-width:540px){[data-coach-card]{flex:0 0 88vw !important} .hero-h1{font-size:30px !important}}
    `;
    document.head.appendChild(s);
  },[]);

  useEffect(()=>{
    getCategories().then(setCategories).catch(()=>setCategories([])).finally(()=>setLoadingCats(false));
  },[]);

  useEffect(()=>{
    setLoadingCoaches(true);
    (activeCategory ? getCoaches(activeCategory) : getRankedCoaches().catch(()=>getCoaches(null)))
      .then(setCoaches).catch(()=>{ setCoaches([]); showToast('Failed to load coaches','error'); })
      .finally(()=>setLoadingCoaches(false));
  },[activeCategory]);

  const token=localStorage.getItem('coachly_token');
  const tokenType=localStorage.getItem('coachly_token_type');

  // Dynamic body background
  useEffect(()=>{ document.body.style.background=S.bg; document.body.style.transition='background 0.4s ease'; },[S.bg]);

  return (
    <div style={{ position:'relative', minHeight:'100vh', background:S.bg, color:S.text, fontFamily:"'Inter',system-ui,sans-serif", overflowX:'hidden', transition:'background 0.4s ease, color 0.4s ease' }}>
      <Toast />
      {legalModal && <LegalModal type={legalModal} onClose={()=>setLegalModal(null)} tok={tok} />}

      {/* ── NAVBAR ── */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 36px',
        background:S.navBg, backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${S.border}`,
        transition:'background 0.4s ease, border-color 0.4s ease',
      }}>
        <div onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:'800', fontSize:'20px', color:S.text, letterSpacing:'0.08em', transition:'color 0.4s' }}>
            COACHLY<span style={{ color:GREEN }}>.</span>
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button className="hide-nav" onClick={()=>navigate('/coach/signup')} style={{ background:'none', border:'none', fontFamily:'inherit', fontSize:'13px', color:S.textDim, cursor:'pointer', padding:'8px 14px', transition:'color 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.color=GREEN} onMouseLeave={e=>e.currentTarget.style.color=S.textDim}>
            For coaches
          </button>
          {token && tokenType==='user' ? (
            <button onClick={()=>navigate('/dashboard')} style={{ padding:'9px 20px', borderRadius:'8px', background:GREEN, color:'#03200a', border:'none', fontFamily:'inherit', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>My dashboard</button>
          ) : token && tokenType==='coach' ? (
            <button onClick={()=>navigate('/coach/dashboard')} style={{ padding:'9px 20px', borderRadius:'8px', background:GREEN, color:'#03200a', border:'none', fontFamily:'inherit', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>Coach dashboard</button>
          ) : (
            <>
              <button onClick={()=>navigate('/user/login')} style={{ padding:'9px 18px', borderRadius:'8px', border:`1px solid ${S.border}`, background:'none', fontFamily:'inherit', fontSize:'13px', color:S.textDim, cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.color=GREEN; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=S.border; e.currentTarget.style.color=S.textDim; }}>
                Log in
              </button>
              <button onClick={()=>navigate('/user/login')} style={{ padding:'9px 20px', borderRadius:'8px', background:GREEN, color:'#03200a', border:'none', fontFamily:'inherit', fontSize:'13px', fontWeight:'700', cursor:'pointer', transition:'opacity 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                Get started
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── HERO (always dark) ── */}
      <section style={{ position:'relative', height:'100vh', minHeight:'620px', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:BLACK }}>
        <video ref={videoRef} autoPlay muted loop playsInline onLoadedData={()=>setVideoLoaded(true)}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:videoLoaded?0.42:0, transition:'opacity 1.5s ease' }}>
          {/* TODO: swap for your chosen Pexels landscape clip */}
          <source src="https://videos.pexels.com/video-files/4761789/4761789-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.15) 50%, rgba(10,10,10,0.95) 100%)' }} />
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, transparent 38%, rgba(10,10,10,0.5) 100%)' }} />
        <div style={{ position:'absolute', top:'64px', left:0, right:0, height:'1px', background:`linear-gradient(90deg,transparent,${GREEN}55,transparent)` }} />

        <div style={{ position:'relative', zIndex:2, textAlign:'center', padding:'0 24px', maxWidth:'880px', margin:'0 auto' }}>
          <div style={{ animation:'fadeSlideUp 0.6s ease both', fontSize:'11px', fontWeight:'700', letterSpacing:'0.22em', textTransform:'uppercase', color:GREEN, marginBottom:'22px' }}>
            Every Sport · Every Level · Any Goal
          </div>
          <h1 className="hero-h1" style={{ fontFamily:"'Playfair Display',serif", fontSize:'70px', fontWeight:'900', lineHeight:'1.04', color:'#F5F5F3', margin:0, letterSpacing:'-0.02em' }}>
            <AnimatedHeadline text="Find your coach." delay={200} />
            <br />
            <span className="green-shimmer" style={{ fontStyle:'italic' }}>
              <AnimatedHeadline text="Any sport. 24/7." delay={480} />
            </span>
          </h1>
          <p style={{ animation:'fadeSlideUp 0.7s ease 0.8s both', fontSize:'16px', color:'rgba(245,245,243,0.52)', lineHeight:'1.78', fontWeight:'300', maxWidth:'500px', margin:'22px auto 44px' }}>
            Real coaches across every discipline — each with their own AI assistant to support you between sessions.
          </p>
          <div style={{ animation:'fadeSlideUp 0.7s ease 1s both', display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={()=>document.getElementById('coaches-section')?.scrollIntoView({behavior:'smooth'})}
              style={{ padding:'15px 36px', borderRadius:'8px', background:GREEN, color:'#03200a', border:'none', fontFamily:'inherit', fontSize:'15px', fontWeight:'700', cursor:'pointer', letterSpacing:'0.02em', transition:'all 0.2s', boxShadow:`0 4px 24px rgba(34,197,94,0.3)` }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#4ade80'; e.currentTarget.style.boxShadow='0 8px 40px rgba(34,197,94,0.45)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=GREEN; e.currentTarget.style.boxShadow='0 4px 24px rgba(34,197,94,0.3)'; }}>
              Find a coach
            </button>
            <button onClick={()=>navigate('/coach/signup')}
              style={{ padding:'15px 36px', borderRadius:'8px', border:`1px solid ${GREEN}55`, background:'rgba(34,197,94,0.06)', fontFamily:'inherit', fontSize:'15px', fontWeight:'500', cursor:'pointer', color:GREEN, transition:'all 0.2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.background='rgba(34,197,94,0.12)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=GREEN+'55'; e.currentTarget.style.background='rgba(34,197,94,0.06)'; }}>
              Become a coach
            </button>
          </div>
        </div>
        <div style={{ position:'absolute', bottom:'32px', left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', animation:'fadeSlideUp 0.7s ease 1.4s both' }}>
          <span style={{ fontSize:'10px', letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.25)' }}>Scroll</span>
          <div style={{ width:'1px', height:'36px', background:`linear-gradient(to bottom,${GREEN},transparent)`, animation:'pulse 2s ease infinite' }} />
        </div>
      </section>

      {/* ── COACHES SECTION — theme-shifted background ── */}
      <section id="coaches-section" style={{ position:'relative', zIndex:1, padding:'88px 44px', transition:'background 0.4s ease', background:S.bg }}>
        <div style={{ maxWidth:'1420px', margin:'0 auto' }}>
          <div style={{ marginBottom:'36px' }}>
            <div style={{ fontSize:'11px', fontWeight:'700', letterSpacing:'0.18em', textTransform:'uppercase', color:GREEN, marginBottom:'10px' }}>Our coaches</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(26px,3.5vw,42px)', fontWeight:'800', color:S.text, lineHeight:'1.15', margin:0, transition:'color 0.4s' }}>
              Find the coach <span style={{ color:S.textFaint, fontStyle:'italic' }}>that moves you.</span>
            </h2>
          </div>

          {/* Filter bar */}
          {!loadingCats && categories.length > 0 && (
            <div style={{ display:'flex', gap:'7px', marginBottom:'32px', overflowX:'auto', scrollbarWidth:'none', paddingBottom:'2px' }}>
              {[{id:'all',name:'All',slug:null}].concat(categories).map(cat=>{
                const isActive = cat.slug===null ? activeCategory===null : activeCategory===cat.slug;
                return (
                  <button key={cat.id} onClick={()=>setActiveCategory(cat.slug===activeCategory?null:(cat.slug??null))}
                    style={{ padding:'8px 18px', borderRadius:'100px', whiteSpace:'nowrap', flexShrink:0, border:`1px solid ${isActive?GREEN:S.border}`, background:isActive?'rgba(34,197,94,0.1)':'transparent', color:isActive?GREEN:S.textDim, fontFamily:'inherit', fontSize:'13px', fontWeight:'600', cursor:'pointer', transition:'all 0.18s' }}
                    onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.color=GREEN; }}}
                    onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.borderColor=S.border; e.currentTarget.style.color=S.textDim; }}}>
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Cards */}
          {loadingCoaches ? (
            <div style={{ display:'flex', gap:'22px' }}>
              {[1,2,3,4].map(i=><div key={i} style={{ flex:'0 0 calc(25% - 17px)', minWidth:'280px' }}><LoadingSkeleton type="card" /></div>)}
            </div>
          ) : coaches.length===0 ? (
            <EmptyState message="No coaches yet." cta="Become a coach" onCta={()=>navigate('/coach/signup')} />
          ) : (
            <CoachesCarousel coaches={coaches} onView={id=>navigate(`/coach/${id}`)} tok={tok} />
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS — contrasting surface ── */}
      <section style={{ position:'relative', zIndex:1, padding:'100px 44px', background: tok>0.4 ? '#F0F0EB' : '#0D0D0B', borderTop:`1px solid ${S.border}`, borderBottom:`1px solid ${S.border}`, transition:'background 0.4s ease' }}>
        <div style={{ maxWidth:'980px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'60px' }}>
            <div style={{ fontSize:'11px', fontWeight:'700', letterSpacing:'0.18em', textTransform:'uppercase', color:GREEN, marginBottom:'12px' }}>How it works</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(26px,3.5vw,40px)', fontWeight:'800', color:S.text, margin:0, transition:'color 0.4s' }}>
              Coaching, <span style={{ fontStyle:'italic', color:GREEN }}>reimagined.</span>
            </h2>
          </div>
          <div className="how-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'2px', background:S.border, borderRadius:'18px', overflow:'hidden', transition:'background 0.4s' }}>
            {[
              { label:'Subscribe', title:'Choose your coach', body:'Browse real coaches across every sport and discipline. Pick the program built for your goals and subscribe monthly.' },
              { label:'Train', title:'Get your plan + AI helper', body:'Each coach sets you a custom training plan and a built-in AI assistant for quick questions between sessions — your coach still leads the program.' },
              { label:'Grow', title:'Track your progress', body:'Weekly reviews, direct coach messaging, and real progress tracking. Your coach adjusts your plan as you improve.' },
            ].map((step,i)=>(
              <div key={i} style={{ background:tok>0.4?'#FFFFFF':'#111110', padding:'42px 30px', position:'relative', overflow:'hidden', transition:'background 0.25s' }}
                onMouseEnter={e=>e.currentTarget.style.background=tok>0.4?'#F8F8F4':'#181816'}
                onMouseLeave={e=>e.currentTarget.style.background=tok>0.4?'#FFFFFF':'#111110'}>
                <div style={{ position:'absolute', top:'14px', right:'18px', fontFamily:"'Playfair Display',serif", fontSize:'68px', fontWeight:'900', color:`${GREEN}10`, lineHeight:1 }}>
                  {String(i+1).padStart(2,'0')}
                </div>
                <div style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'0.2em', textTransform:'uppercase', color:GREEN, marginBottom:'14px' }}>{step.label}</div>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'19px', fontWeight:'700', color:S.text, marginBottom:'12px', lineHeight:'1.3', transition:'color 0.4s' }}>{step.title}</h3>
                <p style={{ fontSize:'13px', color:S.textDim, lineHeight:'1.8', margin:0, transition:'color 0.4s' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (fades back to dark) ── */}
      <section style={{ position:'relative', zIndex:1, padding:'120px 44px', textAlign:'center', background:S.bg, transition:'background 0.4s ease' }}>
        <div style={{ maxWidth:'580px', margin:'0 auto' }}>
          <div style={{ fontSize:'11px', fontWeight:'700', letterSpacing:'0.18em', textTransform:'uppercase', color:GREEN, marginBottom:'18px' }}>Start today</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(30px,5vw,50px)', fontWeight:'900', color:S.text, lineHeight:'1.1', marginBottom:'18px', transition:'color 0.4s' }}>
            Ready to find<br /><span style={{ fontStyle:'italic', color:GREEN }}>your coach?</span>
          </h2>
          <p style={{ fontSize:'15px', color:S.textDim, marginBottom:'38px', lineHeight:'1.75', fontWeight:'300', transition:'color 0.4s' }}>
            Athletes everywhere are already training smarter. Your coach is waiting.
          </p>
          <button onClick={()=>document.getElementById('coaches-section')?.scrollIntoView({behavior:'smooth'})}
            style={{ padding:'16px 44px', borderRadius:'8px', background:GREEN, color:'#03200a', border:'none', fontFamily:'inherit', fontSize:'15px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 40px rgba(34,197,94,0.25)', transition:'all 0.2s', letterSpacing:'0.02em' }}
            onMouseEnter={e=>{ e.currentTarget.style.background='#4ade80'; e.currentTarget.style.boxShadow='0 8px 60px rgba(34,197,94,0.4)'; e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=GREEN; e.currentTarget.style.boxShadow='0 4px 40px rgba(34,197,94,0.25)'; e.currentTarget.style.transform='none'; }}>
            Browse coaches →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position:'relative', zIndex:1, padding:'28px 44px', borderTop:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px', background:S.bg, transition:'background 0.4s, border-color 0.4s' }}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:'800', fontSize:'16px', color:S.text, letterSpacing:'0.08em', transition:'color 0.4s' }}>
          COACHLY<span style={{ color:GREEN }}>.</span>
        </span>
        <div style={{ display:'flex', gap:'22px', alignItems:'center' }}>
          {[['For coaches',()=>navigate('/coach/signup')],['Terms',()=>setLegalModal('terms')],['Privacy',()=>setLegalModal('privacy')]].map(([label,fn])=>(
            <button key={label} onClick={fn} style={{ background:'none', border:'none', fontFamily:'inherit', fontSize:'13px', color:S.textFaint, cursor:'pointer', transition:'color 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.color=GREEN} onMouseLeave={e=>e.currentTarget.style.color=S.textFaint}>{label}</button>
          ))}
        </div>
        <div style={{ fontSize:'12px', color:S.textFaint, transition:'color 0.4s' }}>© {new Date().getFullYear()} Coachly</div>
      </footer>
    </div>
  );
}