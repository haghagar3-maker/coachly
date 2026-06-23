import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches, getRankedCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

/* ─── Palette ─── */
const GREEN        = '#22C55E';
const GREEN_DARK   = '#15803D';
const GREEN_LIGHT  = '#86efac';
const ORANGE       = '#F97316';
const ORANGE_SOFT  = '#FB923C';

/* Beige base */
const PAGE_BG      = '#F5EFE4';        // warm creamy beige
const CARD_BG      = '#FFFFFF';
const CARD_HOVER   = '#FEFBF7';
const BORDER       = 'rgba(0,0,0,0.07)';
const BORDER_HOVER = 'rgba(34,197,94,0.45)';

/* Typography on beige */
const TEXT         = '#1C1712';
const TEXT_DIM     = '#6B6151';
const TEXT_FAINT   = '#9E9282';

/* Navbar: stays dark for contrast */
const NAV_BG       = 'rgba(22,18,12,0.94)';
const NAV_TEXT     = '#F1EDE6';
const NAV_DIM      = '#9E9282';

/* ─── Legal Modal ─── */
function LegalModal({ type, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:'20px',maxWidth:'560px',width:'100%',maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,0.18)' }}>
        <div style={{ padding:'24px 28px 18px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Playfair Display',serif",fontSize:'19px',fontWeight:'700',color:TEXT }}>{content.title}</span>
          <button onClick={onClose} style={{ background:'none',border:`1px solid ${BORDER}`,color:TEXT_DIM,cursor:'pointer',width:'32px',height:'32px',borderRadius:'50%',fontSize:'16px' }}>×</button>
        </div>
        <div style={{ overflowY:'auto',padding:'24px 28px 32px' }}>
          {content.sections.map((s,i) => (
            <div key={i} style={{ marginBottom:'18px' }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:'14px',fontWeight:'700',color:GREEN_DARK,marginBottom:'6px' }}>{s.heading}</h3>
              <p style={{ fontSize:'13px',color:TEXT_DIM,lineHeight:'1.75',margin:0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */
const AVATAR_COLORS = ['#22C55E','#3B82F6','#F59E0B','#8B5CF6','#06B6D4','#EF4444','#EC4899'];
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

/* ─── Coach Card — tall vertical, click to reveal "View Profile" strip below ─── */
function CoachCard({ coach, onView, delay = 0 }) {
  const [hovered, setHovered]   = useState(false);
  const [pressed, setPressed]   = useState(false);
  const [revealed, setRevealed] = useState(false);
  const wrapRef = useRef(null);

  const ACTION_H  = 58;
  const heroImage = coach.banner || null;
  const profPic   = coach.photo  || null;

  useEffect(() => {
    if (!revealed) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setRevealed(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [revealed]);

  let specialties = [];
  if (coach.specialties) {
    try { specialties = JSON.parse(coach.specialties); }
    catch { specialties = String(coach.specialties).split(',').map(s => s.trim()).filter(Boolean); }
  }
  const starRating = coach.rating > 0 ? Number(coach.rating).toFixed(1) : null;

  return (
    <div ref={wrapRef} style={{ width:'100%',borderRadius:'24px',display:'flex',flexDirection:'column',animation:'fadeUp 0.55s ease both',animationDelay:`${delay}ms` }}>

      {/* ── Card face ── */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onClick={() => setRevealed(r => !r)}
        style={{
          width:'100%',
          background: hovered ? CARD_HOVER : CARD_BG,
          border:`1.5px solid ${hovered ? BORDER_HOVER : BORDER}`,
          borderRadius: revealed ? '24px 24px 0 0' : '24px',
          cursor:'pointer',
          userSelect:'none',
          WebkitTapHighlightColor:'transparent',
          outline:'none',
          transition:'transform 0.22s ease, border-color 0.22s, box-shadow 0.22s, border-radius 0.22s, background 0.22s',
          transform: pressed ? 'scale(0.985)' : hovered ? 'translateY(-6px)' : 'none',
          boxShadow: hovered
            ? `0 20px 50px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(34,197,94,0.15)`
            : '0 2px 16px rgba(0,0,0,0.07)',
          display:'flex',
          flexDirection:'column',
        }}
      >
        {/* ── BANNER — tall 280px ── */}
        <div style={{
          height:'280px',
          position:'relative',
          overflow:'hidden',
          borderRadius:'22px 22px 0 0',
          flexShrink:0,
          background: heroImage ? '#000' : `linear-gradient(135deg,${GREEN}22 0%,${ORANGE}11 100%)`,
        }}>
          {heroImage ? (
            <img
              src={heroImage}
              alt={coach.name}
              style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:hovered?'scale(1.05)':'scale(1)',transition:'transform 0.55s ease' }}
            />
          ) : (
            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <div style={{ width:'90px',height:'90px',borderRadius:'50%',background:`${avatarColor(coach.id)}22`,border:`2px dashed ${avatarColor(coach.id)}66`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px',fontWeight:'800',color:avatarColor(coach.id) }}>
                {initials(coach.name)}
              </div>
            </div>
          )}
          {/* gradient overlay */}
          <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0) 40%,rgba(0,0,0,0.6) 100%)' }} />

          {/* category badge */}
          {coach.category_name && (
            <span style={{ position:'absolute',top:'14px',left:'14px',background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',color:'#fff',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.1em',padding:'5px 12px',borderRadius:'100px',border:'1px solid rgba(255,255,255,0.2)' }}>
              {coach.category_name}
            </span>
          )}

          {/* price badge */}
          {coach.plan_price != null && (
            <span style={{ position:'absolute',top:'14px',right:'14px',background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',color:'#fff',fontSize:'13px',fontWeight:'700',padding:'5px 12px',borderRadius:'100px',border:'1px solid rgba(255,255,255,0.2)' }}>
              <span style={{ color:GREEN }}>${Number(coach.plan_price).toFixed(0)}</span>
              <span style={{ color:'rgba(255,255,255,0.5)',fontWeight:'400',fontSize:'11px' }}>/mo</span>
            </span>
          )}

          {/* rating badge */}
          {starRating && (
            <span style={{ position:'absolute',bottom:'14px',right:'14px',background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',color:GREEN,fontSize:'12px',fontWeight:'800',padding:'5px 10px',borderRadius:'100px',border:`1px solid ${GREEN}55`,display:'flex',alignItems:'center',gap:'4px' }}>
              ★ {starRating}
            </span>
          )}
        </div>

        {/* ── BODY ── */}
        <div style={{ padding:'20px 22px 0',flex:1 }}>
          {specialties.length > 0 && (
            <div style={{ display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'10px' }}>
              {specialties.slice(0,3).map((sp,i) => (
                <span key={i} style={{ fontSize:'10px',fontWeight:'600',color:GREEN_DARK,background:`${GREEN}15`,border:`1px solid ${GREEN}30`,borderRadius:'100px',padding:'3px 10px' }}>
                  {sp}
                </span>
              ))}
            </div>
          )}
          {coach.tagline && (
            <p style={{ fontSize:'13px',color:TEXT_DIM,lineHeight:'1.6',margin:'0 0 10px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',fontStyle:'italic' }}>
              "{coach.tagline}"
            </p>
          )}
          {coach.bio && (
            <p style={{ fontSize:'12px',color:TEXT_FAINT,lineHeight:'1.65',margin:'0 0 10px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>
              {coach.bio}
            </p>
          )}
          <div style={{ display:'flex',alignItems:'center',flexWrap:'wrap',gap:'8px',paddingBottom:'14px' }}>
            {starRating && (
              <div style={{ display:'flex',alignItems:'center',gap:'3px' }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{ fontSize:'11px',color:n<=Math.round(Number(starRating))?ORANGE_SOFT:'#D9D0C4' }}>★</span>
                ))}
                <span style={{ fontSize:'11px',color:TEXT_DIM,marginLeft:'3px' }}>({starRating})</span>
              </div>
            )}
            {coach.subscriber_count > 0 && (
              <span style={{ fontSize:'11px',color:TEXT_FAINT,background:'rgba(0,0,0,0.04)',padding:'3px 9px',borderRadius:'100px',border:`1px solid ${BORDER}` }}>
                👥 {coach.subscriber_count} clients
              </span>
            )}
            {coach.years_experience > 0 && (
              <span style={{ fontSize:'11px',color:TEXT_FAINT,background:'rgba(0,0,0,0.04)',padding:'3px 9px',borderRadius:'100px',border:`1px solid ${BORDER}` }}>
                🏅 {coach.years_experience}y exp
              </span>
            )}
            {coach.sessions_count > 0 && (
              <span style={{ fontSize:'11px',color:TEXT_FAINT,background:'rgba(0,0,0,0.04)',padding:'3px 9px',borderRadius:'100px',border:`1px solid ${BORDER}` }}>
                ⚡ {coach.sessions_count} sessions
              </span>
            )}
          </div>
        </div>

        {/* ── BOTTOM STRIP — profile pic + name + location ── */}
        <div style={{
          padding:'14px 22px 18px',
          borderTop:`1px solid ${BORDER}`,
          display:'flex',
          alignItems:'center',
          gap:'12px',
          marginTop:'auto',
          background:'rgba(0,0,0,0.02)',
          borderRadius: revealed ? '0' : '0 0 24px 24px',
        }}>
          <div style={{ width:'44px',height:'44px',borderRadius:'50%',flexShrink:0,overflow:'hidden',background:profPic?'#eee':avatarColor(coach.id),border:`2px solid ${GREEN}55`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 0 3px ${GREEN}18` }}>
            {profPic
              ? <img src={profPic} alt={coach.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
              : <span style={{ fontSize:'14px',fontWeight:'700',color:'#fff' }}>{initials(coach.name)}</span>
            }
          </div>
          <div style={{ minWidth:0,flex:1 }}>
            <div style={{ fontSize:'15px',fontWeight:'700',color:TEXT,lineHeight:'1.2',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
              {coach.name}
            </div>
            <div style={{ fontSize:'11px',color:TEXT_FAINT,marginTop:'2px',display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap' }}>
              {coach.location && <span>📍 {coach.location}</span>}
              {coach.response_time && <span>⏱ {coach.response_time}</span>}
            </div>
          </div>
          <div style={{ fontSize:'11px',color:revealed?GREEN_DARK:TEXT_FAINT,transition:'color 0.2s,transform 0.25s',flexShrink:0,display:'flex',alignItems:'center',gap:'3px',fontWeight:'600',transform:revealed?'rotate(90deg)':'none' }}>
            <span style={{ fontSize:'16px' }}>⋯</span>
          </div>
        </div>
      </div>

      {/* ── Action strip — slides open UNDER the card on click ── */}
      <div style={{
        maxHeight: revealed ? `${ACTION_H}px` : '0px',
        overflow:'hidden',
        transition:'max-height 0.28s cubic-bezier(0.22,1,0.36,1)',
        borderRadius:'0 0 24px 24px',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onView(coach.slug || coach.id); }}
          style={{
            width:'100%',
            height:`${ACTION_H}px`,
            border:'none',
            background:`linear-gradient(100deg,${GREEN_DARK},${GREEN},${GREEN_LIGHT})`,
            color:'#03200a',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            gap:'9px',
            fontSize:'13px',
            fontWeight:'800',
            cursor:'pointer',
            fontFamily:'inherit',
            letterSpacing:'0.06em',
            textTransform:'uppercase',
            borderRadius:'0 0 24px 24px',
            transition:'filter 0.18s',
          }}
          onMouseEnter={e => e.currentTarget.style.filter='brightness(1.06)'}
          onMouseLeave={e => e.currentTarget.style.filter='none'}
        >
          View Profile <span style={{ fontSize:'17px' }}>→</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Animated headline ─── */
function AnimatedHeadline({ text, delay = 0 }) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <span>
      {text.split(' ').map((w, i) => (
        <span key={i} style={{ display:'inline-block',opacity:vis?1:0,transform:vis?'translateY(0)':'translateY(28px)',transition:`opacity 0.65s ease ${i*90}ms,transform 0.65s cubic-bezier(0.22,1,0.36,1) ${i*90}ms`,marginRight:'0.26em' }}>
          {w}
        </span>
      ))}
    </span>
  );
}

/* ─── Single filterable carousel ─── */
function CoachesCarousel({ coaches, onView }) {
  const rowRef = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  const check = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    check();
    el.addEventListener('scroll', check, { passive:true });
    window.addEventListener('resize', check);
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [coaches, check]);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    const cardW = el.querySelector('[data-coach-card]')?.offsetWidth || 340;
    el.scrollBy({ left: dir * (cardW + 24), behavior:'smooth' });
  };

  if (!coaches.length) return <EmptyState message="No coaches in this category yet." />;

  return (
    <div style={{ position:'relative' }}>
      {canLeft && (
        <button onClick={() => scroll(-1)} style={{ position:'absolute',top:'42%',transform:'translateY(-50%)',left:'-20px',zIndex:20,width:'44px',height:'44px',borderRadius:'50%',background:CARD_BG,border:`1.5px solid ${GREEN}66`,color:GREEN_DARK,fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(34,197,94,0.18)',transition:'all 0.18s' }}
          onMouseEnter={e => { e.currentTarget.style.background=GREEN; e.currentTarget.style.color='#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background=CARD_BG; e.currentTarget.style.color=GREEN_DARK; }}>‹</button>
      )}
      {canRight && (
        <button onClick={() => scroll(1)} style={{ position:'absolute',top:'42%',transform:'translateY(-50%)',right:'-20px',zIndex:20,width:'44px',height:'44px',borderRadius:'50%',background:CARD_BG,border:`1.5px solid ${GREEN}66`,color:GREEN_DARK,fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(34,197,94,0.18)',transition:'all 0.18s' }}
          onMouseEnter={e => { e.currentTarget.style.background=GREEN; e.currentTarget.style.color='#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background=CARD_BG; e.currentTarget.style.color=GREEN_DARK; }}>›</button>
      )}

      {/* fade edges */}
      {canLeft  && <div style={{ position:'absolute',left:0,top:0,bottom:0,width:'60px',background:`linear-gradient(to right,${PAGE_BG},transparent)`,zIndex:10,pointerEvents:'none' }} />}
      {canRight && <div style={{ position:'absolute',right:0,top:0,bottom:0,width:'60px',background:`linear-gradient(to left,${PAGE_BG},transparent)`,zIndex:10,pointerEvents:'none' }} />}

      <div
        ref={rowRef}
        style={{ display:'flex',gap:'24px',overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none',paddingBottom:'12px',paddingTop:'4px',paddingLeft:'2px',paddingRight:'2px' }}
      >
        {coaches.map((coach, i) => (
          <div key={coach.id} data-coach-card="" style={{ flex:'0 0 calc(30% - 16px)',minWidth:'290px',maxWidth:'380px',scrollSnapAlign:'start' }}>
            <CoachCard coach={coach} onView={onView} delay={i * 55} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function Home() {
  const navigate = useNavigate();

  const [categories,   setCategories]   = useState([]);
  const [allCoaches,   setAllCoaches]   = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [legalModal,   setLegalModal]   = useState(null);
  const [videoLoaded,  setVideoLoaded]  = useState(false);
  const videoRef = useRef(null);

  /* inject fonts + keyframes once */
  useEffect(() => {
    const id = 'coachly-v16';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Inter:wght@300;400;500;600;700&display=swap');
      @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-30px) scale(1.07)}}
      @keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-18px,22px) scale(0.94)}}
      @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
      button{outline:none;-webkit-tap-highlight-color:transparent}
      ::-webkit-scrollbar{display:none}
      body{background:${PAGE_BG}!important}
      .gshimmer{background:linear-gradient(90deg,${GREEN_DARK},${GREEN},${ORANGE},${GREEN_DARK});background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 5s linear infinite}
      @media(max-width:1200px){[data-coach-card]{flex:0 0 calc(40% - 16px)!important}}
      @media(max-width:800px){
        [data-coach-card]{flex:0 0 calc(65% - 16px)!important;min-width:260px!important}
        .hero-h1{font-size:38px!important;line-height:1.08!important}
        .section-inner{padding:64px 20px!important}
        .how-grid{grid-template-columns:1fr!important}
        .hide-mob{display:none!important}
        .footer-row{flex-direction:column!important;align-items:center!important;text-align:center!important}
        .nav-inner{padding:0 18px!important}
      }
      @media(max-width:480px){
        [data-coach-card]{flex:0 0 84vw!important;min-width:0!important}
        .hero-h1{font-size:30px!important}
        .section-inner{padding:48px 16px!important}
      }
    `;
    document.head.appendChild(s);
  }, []);

  /* load categories + all coaches */
  useEffect(() => {
    setLoading(true);
    getCategories()
      .then(cats => {
        setCategories(cats.slice(0, 10));
        return getCoaches();
      })
      .then(coaches => setAllCoaches(coaches))
      .catch(() => showToast('Failed to load coaches', 'error'))
      .finally(() => setLoading(false));
  }, []);

  /* filtered coaches */
  const filtered = activeFilter === 'all'
    ? allCoaches
    : allCoaches.filter(c => c.category_slug === activeFilter || c.category_name?.toLowerCase() === activeFilter);

  const token     = localStorage.getItem('coachly_token');
  const tokenType = localStorage.getItem('coachly_token_type');

  /* pill style helpers */
  const pillBase = {
    padding:'8px 20px',
    borderRadius:'100px',
    border:'1.5px solid',
    fontFamily:'inherit',
    fontSize:'13px',
    fontWeight:'600',
    cursor:'pointer',
    transition:'all 0.18s',
    letterSpacing:'0.02em',
  };
  const pillActive = {
    ...pillBase,
    background:GREEN_DARK,
    borderColor:GREEN_DARK,
    color:'#fff',
    boxShadow:`0 4px 18px ${GREEN}44`,
  };
  const pillInactive = {
    ...pillBase,
    background:'transparent',
    borderColor:BORDER,
    color:TEXT_DIM,
  };

  return (
    <div style={{ position:'relative',minHeight:'100vh',background:PAGE_BG,color:TEXT,fontFamily:"'Inter',system-ui,sans-serif",overflowX:'hidden' }}>
      <Toast />
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      {/* ── AMBIENT ORB DECORATIONS (fixed, subtle) ── */}
      <div style={{ position:'fixed',top:'12vh',right:'-80px',width:'420px',height:'420px',borderRadius:'50%',background:`radial-gradient(circle,${GREEN}20 0%,transparent 68%)`,pointerEvents:'none',zIndex:0,animation:'orbFloat 12s ease-in-out infinite' }} />
      <div style={{ position:'fixed',bottom:'20vh',left:'-100px',width:'500px',height:'500px',borderRadius:'50%',background:`radial-gradient(circle,${ORANGE}18 0%,transparent 65%)`,pointerEvents:'none',zIndex:0,animation:'orbFloat2 15s ease-in-out infinite' }} />
      <div style={{ position:'fixed',top:'55vh',left:'45%',width:'300px',height:'300px',borderRadius:'50%',background:`radial-gradient(circle,${GREEN}0D 0%,transparent 70%)`,pointerEvents:'none',zIndex:0 }} />

      {/* ── NAVBAR ── */}
      <header style={{ position:'fixed',top:0,left:0,right:0,zIndex:100,height:'66px',background:NAV_BG,backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="nav-inner" style={{ maxWidth:'1440px',margin:'0 auto',height:'100%',padding:'0 40px',display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center' }}>

          {/* left — for coaches */}
          <div>
            <button className="hide-mob" onClick={() => navigate('/coach/signup')}
              style={{ background:'none',border:'none',fontFamily:'inherit',fontSize:'13px',color:NAV_DIM,cursor:'pointer',padding:'8px 0',transition:'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color=GREEN_LIGHT}
              onMouseLeave={e => e.currentTarget.style.color=NAV_DIM}>
              For coaches
            </button>
          </div>

          {/* center — logo */}
          <div onClick={() => window.scrollTo({ top:0,behavior:'smooth' })} style={{ cursor:'pointer',textAlign:'center' }}>
            <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:'900',fontSize:'22px',color:NAV_TEXT,letterSpacing:'0.12em' }}>
              COACHLY<span style={{ color:GREEN }}>.</span>
            </span>
          </div>

          {/* right — auth buttons */}
          <div style={{ display:'flex',alignItems:'center',gap:'8px',justifyContent:'flex-end' }}>
            {token && tokenType === 'user' ? (
              <button onClick={() => navigate('/dashboard')} style={{ padding:'9px 22px',borderRadius:'100px',background:GREEN,color:'#022c12',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',cursor:'pointer',transition:'opacity 0.18s' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                Dashboard
              </button>
            ) : token && tokenType === 'coach' ? (
              <button onClick={() => navigate('/coach/dashboard')} style={{ padding:'9px 22px',borderRadius:'100px',background:GREEN,color:'#022c12',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',cursor:'pointer' }}>
                Coach dashboard
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/user/login')}
                  style={{ padding:'9px 20px',borderRadius:'100px',border:'1px solid rgba(255,255,255,0.15)',background:'transparent',fontFamily:'inherit',fontSize:'13px',color:NAV_DIM,cursor:'pointer',transition:'all 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.4)'; e.currentTarget.style.color=NAV_TEXT; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; e.currentTarget.style.color=NAV_DIM; }}>
                  Log in
                </button>
                <button onClick={() => navigate('/user/login')}
                  style={{ padding:'9px 22px',borderRadius:'100px',background:`linear-gradient(135deg,${GREEN_DARK},${GREEN})`,color:'#fff',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',cursor:'pointer',boxShadow:`0 4px 18px ${GREEN}44`,transition:'all 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 6px 28px ${GREEN}66`; e.currentTarget.style.transform='translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow=`0 4px 18px ${GREEN}44`; e.currentTarget.style.transform='none'; }}>
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position:'relative',height:'100vh',minHeight:'600px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'#14110C' }}>
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          onLoadedData={() => setVideoLoaded(true)}
          style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:videoLoaded?0.3:0,transition:'opacity 1.5s ease' }}
        >
          <source src="https://videos.pexels.com/video-files/4761789/4761789-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>

        {/* Hero glows */}
        <div style={{ position:'absolute',top:'18%',left:'8%',width:'480px',height:'480px',borderRadius:'50%',background:`radial-gradient(circle,${GREEN}1A 0%,transparent 70%)`,pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:'10%',right:'6%',width:'360px',height:'360px',borderRadius:'50%',background:`radial-gradient(circle,${ORANGE}14 0%,transparent 70%)`,pointerEvents:'none' }} />

        <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(20,17,12,0.25) 0%,rgba(20,17,12,0.05) 50%,rgba(245,239,228,1) 100%)' }} />

        <div style={{ position:'relative',zIndex:2,textAlign:'center',padding:'0 24px',maxWidth:'860px',margin:'0 auto' }}>
          <div style={{ animation:'fadeUp 0.5s ease both',fontSize:'11px',fontWeight:'700',letterSpacing:'0.22em',textTransform:'uppercase',color:GREEN,marginBottom:'20px' }}>
            Every Sport · Every Level · Any Goal
          </div>
          <h1 className="hero-h1" style={{ fontFamily:"'Playfair Display',serif",fontSize:'68px',fontWeight:'900',lineHeight:'1.05',color:'#F5EFE4',margin:0,letterSpacing:'-0.02em' }}>
            <AnimatedHeadline text="Find your coach." delay={200} />
            <br />
            <span className="gshimmer" style={{ fontStyle:'italic' }}>
              <AnimatedHeadline text="Any sport. 24/7." delay={440} />
            </span>
          </h1>
          <p style={{ animation:'fadeUp 0.6s ease 0.8s both',fontSize:'16px',color:'rgba(245,239,228,0.45)',lineHeight:'1.8',fontWeight:'300',maxWidth:'460px',margin:'20px auto 40px' }}>
            Real coaches across every discipline — each with their own AI assistant to support you between sessions.
          </p>
          <div style={{ animation:'fadeUp 0.6s ease 1s both',display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap' }}>
            <button
              onClick={() => document.getElementById('coaches-section')?.scrollIntoView({ behavior:'smooth' })}
              style={{ padding:'15px 38px',borderRadius:'100px',background:`linear-gradient(135deg,${GREEN_DARK},${GREEN})`,color:'#fff',border:'none',fontFamily:'inherit',fontSize:'15px',fontWeight:'700',cursor:'pointer',boxShadow:`0 6px 32px ${GREEN}55`,transition:'all 0.22s',letterSpacing:'0.02em' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 10px 48px ${GREEN}77`; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow=`0 6px 32px ${GREEN}55`; e.currentTarget.style.transform='none'; }}>
              Find a coach
            </button>
            <button
              onClick={() => navigate('/coach/signup')}
              style={{ padding:'15px 38px',borderRadius:'100px',border:'1.5px solid rgba(245,239,228,0.3)',background:'rgba(245,239,228,0.08)',fontFamily:'inherit',fontSize:'15px',fontWeight:'500',cursor:'pointer',color:'rgba(245,239,228,0.85)',backdropFilter:'blur(10px)',transition:'all 0.22s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(245,239,228,0.6)'; e.currentTarget.style.background='rgba(245,239,228,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(245,239,228,0.3)'; e.currentTarget.style.background='rgba(245,239,228,0.08)'; }}>
              Become a coach
            </button>
          </div>
        </div>

        <div style={{ position:'absolute',bottom:'28px',left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',animation:'fadeUp 0.6s ease 1.4s both' }}>
          <span style={{ fontSize:'10px',letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(245,239,228,0.25)' }}>Scroll</span>
          <div style={{ width:'1px',height:'32px',background:`linear-gradient(to bottom,${GREEN},transparent)`,animation:'pulse 2s ease infinite' }} />
        </div>
      </section>

      {/* ── COACHES SECTION ── */}
      <section id="coaches-section" className="section-inner" style={{ padding:'88px 52px 60px',position:'relative',zIndex:1 }}>
        <div style={{ maxWidth:'1440px',margin:'0 auto' }}>

          {/* heading */}
          <div style={{ marginBottom:'36px' }}>
            <div style={{ fontSize:'11px',fontWeight:'700',letterSpacing:'0.18em',textTransform:'uppercase',color:GREEN_DARK,marginBottom:'8px' }}>Our coaches</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(24px,3vw,42px)',fontWeight:'800',color:TEXT,lineHeight:'1.15',margin:0 }}>
              Find the coach{' '}
              <span style={{ color:TEXT_FAINT,fontStyle:'italic' }}>that moves you.</span>
            </h2>
          </div>

          {/* category pills */}
          {!loading && categories.length > 0 && (
            <div style={{ display:'flex',flexWrap:'wrap',gap:'10px',marginBottom:'36px' }}>
              <button
                key="all"
                onClick={() => setActiveFilter('all')}
                style={activeFilter === 'all' ? pillActive : pillInactive}
                onMouseEnter={e => { if (activeFilter !== 'all') { e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.color=GREEN_DARK; } }}
                onMouseLeave={e => { if (activeFilter !== 'all') { e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.color=TEXT_DIM; } }}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.slug)}
                  style={activeFilter === cat.slug ? pillActive : pillInactive}
                  onMouseEnter={e => { if (activeFilter !== cat.slug) { e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.color=GREEN_DARK; } }}
                  onMouseLeave={e => { if (activeFilter !== cat.slug) { e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.color=TEXT_DIM; } }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* carousel */}
          {loading ? (
            <div style={{ display:'flex',gap:'24px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ flex:'0 0 calc(30% - 16px)',minWidth:'290px' }}>
                  <LoadingSkeleton type="card" />
                </div>
              ))}
            </div>
          ) : (
            <CoachesCarousel coaches={filtered} onView={id => navigate(`/coach/${id}`)} />
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section-inner" style={{ padding:'100px 52px',position:'relative',zIndex:1 }}>
        <div style={{ maxWidth:'980px',margin:'0 auto' }}>
          <div style={{ textAlign:'center',marginBottom:'56px' }}>
            <div style={{ fontSize:'11px',fontWeight:'700',letterSpacing:'0.18em',textTransform:'uppercase',color:ORANGE_SOFT,marginBottom:'12px' }}>How it works</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(24px,3vw,40px)',fontWeight:'800',color:TEXT,margin:0 }}>
              Coaching, <span style={{ fontStyle:'italic',color:GREEN_DARK }}>reimagined.</span>
            </h2>
          </div>

          <div className="how-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'2px',borderRadius:'20px',overflow:'hidden',boxShadow:'0 4px 40px rgba(0,0,0,0.07)' }}>
            {[
              { label:'Subscribe',color:GREEN_DARK,icon:'🎯',title:'Choose your coach',body:'Browse real coaches across every sport and discipline. Pick the program built for your goals and subscribe monthly.' },
              { label:'Train',color:ORANGE,icon:'⚡',title:'Get your plan + AI helper',body:'Each coach sets you a custom training plan and a built-in AI assistant for quick questions between sessions.' },
              { label:'Grow',color:GREEN,icon:'📈',title:'Track your progress',body:'Weekly reviews, direct coach messaging, and real progress tracking. Your coach adjusts your plan as you improve.' },
            ].map((step, i) => (
              <div key={i}
                style={{ background:'rgba(255,255,255,0.8)',padding:'40px 28px',position:'relative',overflow:'hidden',transition:'background 0.2s,transform 0.2s',cursor:'default' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.97)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.8)'; e.currentTarget.style.transform='none'; }}
              >
                <div style={{ position:'absolute',top:'10px',right:'14px',fontFamily:"'Playfair Display',serif",fontSize:'68px',fontWeight:'900',color:'rgba(0,0,0,0.04)',lineHeight:1,userSelect:'none' }}>
                  {String(i+1).padStart(2,'0')}
                </div>
                <div style={{ fontSize:'28px',marginBottom:'14px' }}>{step.icon}</div>
                <div style={{ fontSize:'10px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:step.color,marginBottom:'14px' }}>{step.label}</div>
                <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:'18px',fontWeight:'700',color:TEXT,marginBottom:'12px',lineHeight:'1.3' }}>{step.title}</h3>
                <p style={{ fontSize:'13px',color:TEXT_DIM,lineHeight:'1.8',margin:0 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-inner" style={{ padding:'110px 52px',textAlign:'center',position:'relative',zIndex:1,overflow:'hidden' }}>
        <div style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'600px',height:'600px',borderRadius:'50%',background:`radial-gradient(circle,${ORANGE}14 0%,${GREEN}0A 50%,transparent 70%)`,pointerEvents:'none' }} />
        <div style={{ position:'relative',zIndex:1,maxWidth:'540px',margin:'0 auto' }}>
          <div style={{ fontSize:'11px',fontWeight:'700',letterSpacing:'0.18em',textTransform:'uppercase',color:ORANGE_SOFT,marginBottom:'18px' }}>Start today</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(28px,5vw,52px)',fontWeight:'900',color:TEXT,lineHeight:'1.1',marginBottom:'18px' }}>
            Ready to find<br />
            <span style={{ fontStyle:'italic',color:GREEN_DARK }}>your coach?</span>
          </h2>
          <p style={{ fontSize:'15px',color:TEXT_DIM,marginBottom:'38px',lineHeight:'1.75',fontWeight:'300' }}>
            Athletes everywhere are already training smarter. Your coach is waiting.
          </p>
          <div style={{ display:'flex',gap:'14px',justifyContent:'center',flexWrap:'wrap' }}>
            <button
              onClick={() => document.getElementById('coaches-section')?.scrollIntoView({ behavior:'smooth' })}
              style={{ padding:'15px 44px',borderRadius:'100px',background:`linear-gradient(135deg,${GREEN_DARK},${GREEN})`,color:'#fff',border:'none',fontFamily:'inherit',fontSize:'15px',fontWeight:'700',cursor:'pointer',boxShadow:`0 6px 32px ${GREEN}44`,transition:'all 0.22s' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 10px 44px ${GREEN}66`; }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=`0 6px 32px ${GREEN}44`; }}>
              Browse coaches →
            </button>
            <button
              onClick={() => navigate('/coach/signup')}
              style={{ padding:'15px 44px',borderRadius:'100px',border:`1.5px solid ${BORDER}`,background:'rgba(255,255,255,0.6)',fontFamily:'inherit',fontSize:'15px',fontWeight:'600',cursor:'pointer',color:TEXT_DIM,transition:'all 0.22s',backdropFilter:'blur(8px)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=ORANGE_SOFT; e.currentTarget.style.color=ORANGE; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.color=TEXT_DIM; }}>
              Become a coach
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:'24px 52px',borderTop:`1px solid ${BORDER}`,background:'rgba(255,255,255,0.5)',backdropFilter:'blur(8px)',position:'relative',zIndex:1 }}>
        <div className="footer-row" style={{ maxWidth:'1440px',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'14px' }}>
          <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:'900',fontSize:'17px',color:TEXT,letterSpacing:'0.1em' }}>
            COACHLY<span style={{ color:GREEN_DARK }}>.</span>
          </span>
          <div style={{ display:'flex',gap:'24px',alignItems:'center' }}>
            {[['For coaches', () => navigate('/coach/signup')], ['Terms', () => setLegalModal('terms')], ['Privacy', () => setLegalModal('privacy')]].map(([label, fn]) => (
              <button key={label} onClick={fn}
                style={{ background:'none',border:'none',fontFamily:'inherit',fontSize:'13px',color:TEXT_FAINT,cursor:'pointer',transition:'color 0.18s' }}
                onMouseEnter={e => e.currentTarget.style.color=TEXT}
                onMouseLeave={e => e.currentTarget.style.color=TEXT_FAINT}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:'12px',color:TEXT_FAINT }}>© {new Date().getFullYear()} Coachly</div>
        </div>
      </footer>
    </div>
  );
}