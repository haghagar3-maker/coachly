import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches, getRankedCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

const GREEN       = '#22C55E';
const GREEN_DARK  = '#15803D';
const GREEN_LIGHT = '#86efac';

/* Blue → beige page background */
const NAVY        = '#0F172A';
const BEIGE       = '#E8DFCE';
const PAGE_BG     = `linear-gradient(180deg, ${NAVY} 0%, #1E2A3F 22%, #4A4339 55%, ${BEIGE} 80%, ${BEIGE} 100%)`;
const PAGE_BG_SOLID_TOP = NAVY; // for elements that need a flat color reference near the top

const SECTION_BG  = '#1A2236';
const CARD_BG     = '#15203A';
const BORDER      = 'rgba(255,255,255,0.07)';
const TEXT        = '#F1F5F9';
const TEXT_DIM    = '#94A3B8';
const TEXT_FAINT  = '#475569';

/* darker text variants for beige zone */
const TEXT_ON_BEIGE       = '#2B2418';
const TEXT_DIM_ON_BEIGE   = '#6B6151';
const TEXT_FAINT_ON_BEIGE = '#8A8068';

/* ─── Legal Modal ─── */
function LegalModal({ type, onClose }) {
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
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:'20px',maxWidth:'560px',width:'100%',maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'24px 28px 18px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Playfair Display',serif",fontSize:'19px',fontWeight:'700',color:TEXT }}>{content.title}</span>
          <button onClick={onClose} style={{ background:'none',border:`1px solid ${BORDER}`,color:'#fff',cursor:'pointer',width:'32px',height:'32px',borderRadius:'50%',fontSize:'16px' }}>×</button>
        </div>
        <div style={{ overflowY:'auto',padding:'24px 28px 32px' }}>
          {content.sections.map((s,i)=>(
            <div key={i} style={{ marginBottom:'18px' }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:'14px',fontWeight:'700',color:GREEN,marginBottom:'6px' }}>{s.heading}</h3>
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
  return name.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2);
}

/* ─── Coach Card — original style, action strip slides out UNDER the card ─── */
function CoachCard({ coach, onView, delay = 0 }) {
  const [hovered, setHovered]   = useState(false);
  const [pressed, setPressed]   = useState(false);
  const [revealed, setRevealed] = useState(false);
  const wrapRef = useRef(null);

  const ACTION_H   = 56;
  const heroImage  = coach.banner || null;
  const profilePic = coach.photo  || null;

  useEffect(() => {
    if (!revealed) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setRevealed(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [revealed]);

  const handleTap = () => setRevealed(r => !r);

  let specialties = [];
  if (coach.specialties) {
    try { specialties = JSON.parse(coach.specialties); }
    catch { specialties = String(coach.specialties).split(',').map(s=>s.trim()).filter(Boolean); }
  }
  const starRating = coach.rating > 0 ? Number(coach.rating).toFixed(1) : null;

  return (
    <div ref={wrapRef} style={{ width:'100%', borderRadius:'22px', display:'flex', flexDirection:'column', animation:'fadeUp 0.55s ease both', animationDelay:`${delay}ms` }}>
      {/* ── Card face ── */}
      <div
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>{ setHovered(false); setPressed(false); }}
        onMouseDown={()=>setPressed(true)}
        onMouseUp={()=>setPressed(false)}
        onClick={handleTap}
        style={{
          WebkitTapHighlightColor:'transparent', outline:'none',
          width:'100%', minWidth:0,
          transition:'transform 0.22s ease, border-color 0.22s, box-shadow 0.22s, border-radius 0.22s',
          position:'relative', zIndex:1,
          background: CARD_BG,
          border:`1px solid ${hovered ? GREEN+'66' : BORDER}`,
          borderRadius: revealed ? '22px 22px 0 0' : '22px',
          cursor:'pointer', userSelect:'none',
          transform: pressed ? 'scale(0.985)' : hovered ? 'translateY(-8px) scale(1.005)' : 'none',
          boxShadow: hovered
            ? `0 28px 60px -16px rgba(0,0,0,0.6), 0 0 0 1px ${GREEN}33`
            : '0 4px 24px rgba(0,0,0,0.4)',
          display:'flex', flexDirection:'column',
        }}
      >
        {/* ── BANNER 240px ── */}
        <div style={{ height:'240px', position:'relative', overflow:'hidden', borderRadius:'22px 22px 0 0', flexShrink:0,
          background: heroImage ? '#000' : `linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)` }}>
          {heroImage ? (
            <img src={heroImage} alt={coach.name} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:hovered?'scale(1.06)':'scale(1)',transition:'transform 0.55s ease' }} />
          ) : (
            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <div style={{ width:'80px',height:'80px',borderRadius:'50%',background:`${avatarColor(coach.id)}20`,border:`2px dashed ${avatarColor(coach.id)}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',fontWeight:'700',color:avatarColor(coach.id) }}>
                {initials(coach.name)}
              </div>
            </div>
          )}
          <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.75) 100%)' }} />

          {coach.category_name && (
            <span style={{ position:'absolute',top:'14px',left:'14px',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',color:GREEN,fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.09em',padding:'5px 11px',borderRadius:'100px',border:`1px solid ${GREEN}44` }}>
              {coach.category_name}
            </span>
          )}
          {coach.plan_price != null && (
            <span style={{ position:'absolute',top:'14px',right:'14px',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',color:'#fff',fontSize:'13px',fontWeight:'700',padding:'5px 12px',borderRadius:'100px',border:'1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ color:GREEN }}>${Number(coach.plan_price).toFixed(0)}</span>
              <span style={{ color:'rgba(255,255,255,0.4)',fontWeight:'400',fontSize:'11px' }}>/mo</span>
            </span>
          )}
          {starRating && (
            <span style={{ position:'absolute',bottom:'14px',right:'14px',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',color:GREEN,fontSize:'12px',fontWeight:'800',padding:'5px 10px',borderRadius:'100px',border:`1px solid ${GREEN}44`,display:'flex',alignItems:'center',gap:'4px' }}>
              ★ {starRating}
            </span>
          )}
        </div>

        {/* ── BODY ── */}
        <div style={{ padding:'18px 20px 0', flex:1 }}>
          {specialties.length > 0 && (
            <div style={{ display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'12px' }}>
              {specialties.slice(0,4).map((sp,i)=>(
                <span key={i} style={{ fontSize:'10px',fontWeight:'600',color:GREEN,background:`${GREEN}12`,border:`1px solid ${GREEN}30`,borderRadius:'100px',padding:'3px 10px' }}>
                  {sp}
                </span>
              ))}
            </div>
          )}
          {coach.tagline && (
            <p style={{ fontSize:'13px',color:TEXT_DIM,lineHeight:'1.6',margin:'0 0 12px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',fontStyle:'italic' }}>
              "{coach.tagline}"
            </p>
          )}
          {coach.bio && (
            <p style={{ fontSize:'12px',color:TEXT_FAINT,lineHeight:'1.65',margin:'0 0 12px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>
              {coach.bio}
            </p>
          )}
          <div style={{ display:'flex',alignItems:'center',flexWrap:'wrap',gap:'10px',paddingBottom:'14px' }}>
            {starRating && (
              <div style={{ display:'flex',alignItems:'center',gap:'3px' }}>
                {[1,2,3,4,5].map(n=>(
                  <span key={n} style={{ fontSize:'11px',color:n<=Math.round(Number(starRating))?GREEN:BORDER }}>★</span>
                ))}
                <span style={{ fontSize:'11px',color:TEXT_DIM,marginLeft:'3px' }}>({starRating})</span>
              </div>
            )}
            {coach.subscriber_count > 0 && (
              <span style={{ fontSize:'11px',color:TEXT_DIM,background:'rgba(255,255,255,0.05)',padding:'3px 9px',borderRadius:'100px',border:`1px solid ${BORDER}` }}>
                👥 {coach.subscriber_count} clients
              </span>
            )}
            {coach.years_experience > 0 && (
              <span style={{ fontSize:'11px',color:TEXT_DIM,background:'rgba(255,255,255,0.05)',padding:'3px 9px',borderRadius:'100px',border:`1px solid ${BORDER}` }}>
                🏅 {coach.years_experience}y exp
              </span>
            )}
            {coach.sessions_count > 0 && (
              <span style={{ fontSize:'11px',color:TEXT_DIM,background:'rgba(255,255,255,0.05)',padding:'3px 9px',borderRadius:'100px',border:`1px solid ${BORDER}` }}>
                ⚡ {coach.sessions_count} sessions
              </span>
            )}
          </div>
        </div>

        {/* ── BOTTOM STRIP — profile pic + name + location ── */}
        <div style={{ padding:'14px 20px 18px',borderTop:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:'12px',marginTop:'auto',background:'rgba(0,0,0,0.2)',borderRadius: revealed ? '0' : '0 0 22px 22px' }}>
          <div style={{ width:'42px',height:'42px',borderRadius:'50%',flexShrink:0,overflow:'hidden',background:profilePic?'#000':avatarColor(coach.id),border:`2px solid ${GREEN}55`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 0 3px ${GREEN}22` }}>
            {profilePic
              ? <img src={profilePic} alt={coach.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
              : <span style={{ fontSize:'14px',fontWeight:'700',color:'#fff' }}>{initials(coach.name)}</span>
            }
          </div>
          <div style={{ minWidth:0,flex:1 }}>
            <div style={{ fontSize:'14px',fontWeight:'700',color:TEXT,lineHeight:'1.2',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
              {coach.name}
            </div>
            <div style={{ fontSize:'11px',color:TEXT_FAINT,marginTop:'2px',display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap' }}>
              {coach.location && <span>📍 {coach.location}</span>}
              {coach.response_time && <span>⏱ {coach.response_time}</span>}
            </div>
          </div>
          <div style={{ fontSize:'11px',color:revealed?GREEN:TEXT_FAINT,transition:'color 0.2s, transform 0.25s',flexShrink:0,display:'flex',alignItems:'center',gap:'3px',fontWeight:'600',transform: revealed ? 'rotate(90deg)' : 'none' }}>
            <span style={{ fontSize:'14px' }}>⋯</span>
          </div>
        </div>
      </div>

      {/* ── Action panel — under the card ── */}
      <div style={{
        maxHeight: revealed ? `${ACTION_H}px` : '0px',
        overflow:'hidden',
        transition:'max-height 0.28s cubic-bezier(0.22,1,0.36,1)',
        borderRadius:'0 0 22px 22px',
      }}>
        <button
          onClick={(e)=>{ e.stopPropagation(); onView(coach.slug||coach.id); }}
          style={{
            width:'100%', height:`${ACTION_H}px`,
            border:'none',
            background:`linear-gradient(100deg, ${GREEN_DARK}, ${GREEN}, ${GREEN_LIGHT})`,
            color:'#03200a',
            display:'flex', alignItems:'center', justifyContent:'center',
            gap:'9px', fontSize:'13px', fontWeight:'800', cursor:'pointer', textAlign:'center',
            fontFamily:'inherit', letterSpacing:'0.05em', textTransform:'uppercase',
            borderRadius:'0 0 22px 22px',
          }}
        >
          View Profile
          <span style={{ fontSize:'17px' }}>→</span>
        </button>
      </div>
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
        <span key={i} style={{ display:'inline-block',opacity:vis?1:0,transform:vis?'translateY(0)':'translateY(28px)',transition:`opacity 0.65s ease ${i*90}ms,transform 0.65s cubic-bezier(0.22,1,0.36,1) ${i*90}ms`,marginRight:'0.26em' }}>{w}</span>
      ))}
    </span>
  );
}

/* ─── Single horizontal carousel row (used once per category) ─── */
function CoachesCarousel({ coaches, onView, dark }) {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(false);

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
    const cardW = el.querySelector('[data-coach-card]')?.offsetWidth || 300;
    el.scrollBy({ left: dir * (cardW * 2 + 20), behavior:'smooth' });
  };

  const fadeColor = dark ? NAVY : BEIGE;

  return (
    <div style={{ position:'relative' }}>
      {canLeft && (
        <button onClick={()=>scroll(-1)} style={{ position:'absolute',top:'40%',transform:'translateY(-50%)',left:'-18px',zIndex:20,width:'40px',height:'40px',borderRadius:'50%',background:CARD_BG,border:`1px solid ${GREEN}88`,color:GREEN,fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 16px rgba(34,197,94,0.2)` }}>‹</button>
      )}
      {canRight && (
        <button onClick={()=>scroll(1)} style={{ position:'absolute',top:'40%',transform:'translateY(-50%)',right:'-18px',zIndex:20,width:'40px',height:'40px',borderRadius:'50%',background:CARD_BG,border:`1px solid ${GREEN}88`,color:GREEN,fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 16px rgba(34,197,94,0.2)` }}>›</button>
      )}
      {canLeft  && <div style={{ position:'absolute',left:0,top:0,bottom:0,width:'60px',background:`linear-gradient(to right,${fadeColor},transparent)`,zIndex:10,pointerEvents:'none' }} />}
      {canRight && <div style={{ position:'absolute',right:0,top:0,bottom:0,width:'60px',background:`linear-gradient(to left,${fadeColor},transparent)`,zIndex:10,pointerEvents:'none' }} />}

      <div ref={rowRef} style={{ display:'flex',gap:'20px',overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none',paddingBottom:'8px',paddingTop:'2px',paddingLeft:'2px',paddingRight:'2px' }}>
        {coaches.map((coach,i)=>(
          <div key={coach.id} data-coach-card="" style={{ flex:'0 0 calc(20% - 16px)',minWidth:'250px',maxWidth:'320px',scrollSnapAlign:'start' }}>
            <CoachCard coach={coach} onView={onView} delay={i*55} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function Home() {
  const navigate = useNavigate();

  const [categories,     setCategories]     = useState([]);
  const [coachesByCat,   setCoachesByCat]   = useState({}); // { [categorySlug]: coaches[] }
  const [loadingCats,    setLoadingCats]    = useState(true);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [legalModal,     setLegalModal]     = useState(null);
  const [videoLoaded,    setVideoLoaded]    = useState(false);
  const videoRef = useRef(null);

  useEffect(()=>{
    const id='coachly-v15';
    if (document.getElementById(id)) return;
    const s=document.createElement('style'); s.id=id;
    s.textContent=`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Inter:wght@300;400;500;600;700&display=swap');
      @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
      @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
      button{outline:none;-webkit-tap-highlight-color:transparent}
      ::-webkit-scrollbar{display:none}
      body{background:${NAVY}!important}
      .gshimmer{background:linear-gradient(90deg,${GREEN},#86efac,${GREEN},${GREEN_DARK});background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite}
      @media(max-width:1100px){[data-coach-card]{flex:0 0 calc(33.333% - 14px)!important}}
      @media(max-width:750px){
        [data-coach-card]{flex:0 0 calc(50% - 10px)!important;min-width:240px!important}
        .hero-h1{font-size:36px!important;line-height:1.08!important}
        .section-inner{padding:60px 20px!important}
        .how-grid{grid-template-columns:1fr!important}
        .hide-nav{display:none!important}
        .footer-row{flex-direction:column!important;align-items:center!important;text-align:center!important}
      }
      @media(max-width:480px){
        [data-coach-card]{flex:0 0 84vw!important;min-width:0!important}
        .hero-h1{font-size:28px!important}
        .nav-inner{padding:0 16px!important}
        .section-inner{padding:48px 16px!important}
      }
    `;
    document.head.appendChild(s);
  },[]);

  useEffect(()=>{
    getCategories()
      .then(cats => setCategories(cats.slice(0,5))) // up to 5 rows
      .catch(()=>setCategories([]))
      .finally(()=>setLoadingCats(false));
  },[]);

  useEffect(()=>{
    if (categories.length === 0) { setLoadingCoaches(false); return; }
    setLoadingCoaches(true);
    Promise.all(
      categories.map(cat =>
        getCoaches(cat.slug)
          .then(list => ({ slug: cat.slug, list: list.slice(0,5) })) // 5 coaches per row
          .catch(() => ({ slug: cat.slug, list: [] }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.slug] = r.list; });
      setCoachesByCat(map);
    })
    .catch(()=>showToast('Failed to load coaches','error'))
    .finally(()=>setLoadingCoaches(false));
  },[categories]);

  const token     = localStorage.getItem('coachly_token');
  const tokenType = localStorage.getItem('coachly_token_type');

  const hasAnyCoaches = Object.values(coachesByCat).some(list => list && list.length > 0);

  return (
    <div style={{ position:'relative',minHeight:'100vh',background:PAGE_BG,color:TEXT,fontFamily:"'Inter',system-ui,sans-serif",overflowX:'hidden' }}>
      <Toast />
      {legalModal && <LegalModal type={legalModal} onClose={()=>setLegalModal(null)} />}

      {/* ── NAVBAR ── */}
      <header style={{ position:'fixed',top:0,left:0,right:0,zIndex:100,height:'64px',background:'rgba(15,23,42,0.92)',backdropFilter:'blur(20px)',borderBottom:`1px solid ${BORDER}` }}>
        <div className="nav-inner" style={{ maxWidth:'1440px',margin:'0 auto',height:'100%',padding:'0 40px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} style={{ cursor:'pointer' }}>
            <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:'800',fontSize:'20px',color:TEXT,letterSpacing:'0.08em' }}>
              COACHLY<span style={{ color:GREEN }}>.</span>
            </span>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
            <button className="hide-nav" onClick={()=>navigate('/coach/signup')}
              style={{ background:'none',border:'none',fontFamily:'inherit',fontSize:'13px',color:TEXT_DIM,cursor:'pointer',padding:'8px 14px',transition:'color 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.color=GREEN}
              onMouseLeave={e=>e.currentTarget.style.color=TEXT_DIM}>
              For coaches
            </button>
            {token && tokenType==='user' ? (
              <button onClick={()=>navigate('/dashboard')} style={{ padding:'9px 20px',borderRadius:'8px',background:GREEN,color:'#022c12',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',cursor:'pointer' }}>My dashboard</button>
            ) : token && tokenType==='coach' ? (
              <button onClick={()=>navigate('/coach/dashboard')} style={{ padding:'9px 20px',borderRadius:'8px',background:GREEN,color:'#022c12',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',cursor:'pointer' }}>Coach dashboard</button>
            ) : (<>
              <button onClick={()=>navigate('/user/login')}
                style={{ padding:'9px 18px',borderRadius:'8px',border:`1px solid ${BORDER}`,background:'none',fontFamily:'inherit',fontSize:'13px',color:TEXT_DIM,cursor:'pointer',transition:'all 0.2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.color=GREEN; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.color=TEXT_DIM; }}>
                Log in
              </button>
              <button onClick={()=>navigate('/user/login')}
                style={{ padding:'9px 20px',borderRadius:'8px',background:GREEN,color:'#022c12',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',cursor:'pointer',transition:'opacity 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                Get started
              </button>
            </>)}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position:'relative',height:'100vh',minHeight:'600px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'#060D1A' }}>
        <video ref={videoRef} autoPlay muted loop playsInline onLoadedData={()=>setVideoLoaded(true)}
          style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:videoLoaded?0.35:0,transition:'opacity 1.5s ease' }}>
          <source src="https://videos.pexels.com/video-files/4761789/4761789-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>
        <div style={{ position:'absolute',top:'20%',left:'10%',width:'500px',height:'500px',borderRadius:'50%',background:`radial-gradient(circle,${GREEN}15 0%,transparent 70%)`,pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:'15%',right:'8%',width:'350px',height:'350px',borderRadius:'50%',background:`radial-gradient(circle,${GREEN}0D 0%,transparent 70%)`,pointerEvents:'none' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(6,13,26,0.3) 0%,rgba(6,13,26,0.05) 50%,rgba(15,23,42,1) 100%)' }} />

        <div style={{ position:'relative',zIndex:2,textAlign:'center',padding:'0 24px',maxWidth:'860px',margin:'0 auto' }}>
          <div style={{ animation:'fadeUp 0.5s ease both',fontSize:'11px',fontWeight:'700',letterSpacing:'0.22em',textTransform:'uppercase',color:GREEN,marginBottom:'20px' }}>
            Every Sport · Every Level · Any Goal
          </div>
          <h1 className="hero-h1" style={{ fontFamily:"'Playfair Display',serif",fontSize:'68px',fontWeight:'900',lineHeight:'1.05',color:'#F1F5F9',margin:0,letterSpacing:'-0.02em' }}>
            <AnimatedHeadline text="Find your coach." delay={200} />
            <br />
            <span className="gshimmer" style={{ fontStyle:'italic' }}>
              <AnimatedHeadline text="Any sport. 24/7." delay={440} />
            </span>
          </h1>
          <p style={{ animation:'fadeUp 0.6s ease 0.8s both',fontSize:'16px',color:'rgba(241,245,249,0.45)',lineHeight:'1.8',fontWeight:'300',maxWidth:'460px',margin:'20px auto 40px' }}>
            Real coaches across every discipline — each with their own AI assistant to support you between sessions.
          </p>
          <div style={{ animation:'fadeUp 0.6s ease 1s both',display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap' }}>
            <button onClick={()=>document.getElementById('coaches-section')?.scrollIntoView({behavior:'smooth'})}
              style={{ padding:'14px 34px',borderRadius:'8px',background:GREEN,color:'#022c12',border:'none',fontFamily:'inherit',fontSize:'15px',fontWeight:'700',cursor:'pointer',boxShadow:`0 4px 28px ${GREEN}44`,transition:'all 0.2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#4ade80'; e.currentTarget.style.boxShadow=`0 8px 44px ${GREEN}66`; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=GREEN; e.currentTarget.style.boxShadow=`0 4px 28px ${GREEN}44`; }}>
              Find a coach
            </button>
            <button onClick={()=>navigate('/coach/signup')}
              style={{ padding:'14px 34px',borderRadius:'8px',border:`1px solid ${GREEN}55`,background:`${GREEN}0A`,fontFamily:'inherit',fontSize:'15px',fontWeight:'500',cursor:'pointer',color:GREEN,transition:'all 0.2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.background=`${GREEN}18`; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=`${GREEN}55`; e.currentTarget.style.background=`${GREEN}0A`; }}>
              Become a coach
            </button>
          </div>
        </div>
        <div style={{ position:'absolute',bottom:'28px',left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',animation:'fadeUp 0.6s ease 1.4s both' }}>
          <span style={{ fontSize:'10px',letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(255,255,255,0.2)' }}>Scroll</span>
          <div style={{ width:'1px',height:'32px',background:`linear-gradient(to bottom,${GREEN},transparent)`,animation:'pulse 2s ease infinite' }} />
        </div>
      </section>

      {/* ── COACHES SECTION — one carousel row per category ── */}
      <section id="coaches-section" className="section-inner" style={{ padding:'80px 44px 40px' }}>
        <div style={{ maxWidth:'1440px',margin:'0 auto' }}>
          <div style={{ marginBottom:'40px' }}>
            <div style={{ fontSize:'11px',fontWeight:'700',letterSpacing:'0.18em',textTransform:'uppercase',color:GREEN,marginBottom:'8px' }}>Our coaches</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(24px,3vw,40px)',fontWeight:'800',color:TEXT,lineHeight:'1.15',margin:0 }}>
              Find the coach <span style={{ color:TEXT_FAINT,fontStyle:'italic' }}>that moves you.</span>
            </h2>
          </div>

          {(loadingCats || loadingCoaches) ? (
            <div style={{ display:'flex',gap:'20px' }}>
              {[1,2,3,4,5].map(i=><div key={i} style={{ flex:'0 0 calc(20% - 16px)',minWidth:'250px' }}><LoadingSkeleton type="card" /></div>)}
            </div>
          ) : (!hasAnyCoaches) ? (
            <EmptyState message="No coaches yet." cta="Become a coach" onCta={()=>navigate('/coach/signup')} />
          ) : (
            categories.map((cat, idx) => {
              const list = coachesByCat[cat.slug] || [];
              if (list.length === 0) return null;
              // First couple of rows sit over the dark navy zone, later rows drift into the beige zone —
              // use dark text/dark-fade up top, and switch to dark-on-beige styling for later rows.
              const onBeige = idx >= 3;
              return (
                <div key={cat.id} style={{ marginBottom:'48px' }}>
                  <div style={{ display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'18px' }}>
                    <h3 style={{
                      fontFamily:"'Playfair Display',serif", fontSize:'22px', fontWeight:'700',
                      color: onBeige ? TEXT_ON_BEIGE : TEXT, margin:0,
                    }}>
                      {cat.name}
                    </h3>
                    <button onClick={()=>navigate(`/category/${cat.slug}`)}
                      style={{ background:'none',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'600',color: onBeige ? '#4D7A52' : GREEN,cursor:'pointer' }}>
                      See all →
                    </button>
                  </div>
                  <CoachesCarousel coaches={list} onView={id=>navigate(`/coach/${id}`)} dark={!onBeige} />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section-inner" style={{ background:'rgba(255,255,255,0.08)',borderTop:`1px solid rgba(255,255,255,0.08)`,borderBottom:`1px solid rgba(255,255,255,0.08)`,padding:'100px 44px' }}>
        <div style={{ maxWidth:'980px',margin:'0 auto' }}>
          <div style={{ textAlign:'center',marginBottom:'56px' }}>
            <div style={{ fontSize:'11px',fontWeight:'700',letterSpacing:'0.18em',textTransform:'uppercase',color:'#4D7A52',marginBottom:'12px' }}>How it works</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(24px,3vw,40px)',fontWeight:'800',color:TEXT_ON_BEIGE,margin:0 }}>
              Coaching, <span style={{ fontStyle:'italic',color:'#3F8B49' }}>reimagined.</span>
            </h2>
          </div>
          <div className="how-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'2px',background:'rgba(43,36,24,0.12)',borderRadius:'18px',overflow:'hidden' }}>
            {[
              { label:'Subscribe',title:'Choose your coach',body:'Browse real coaches across every sport and discipline. Pick the program built for your goals and subscribe monthly.' },
              { label:'Train',title:'Get your plan + AI helper',body:'Each coach sets you a custom training plan and a built-in AI assistant for quick questions between sessions.' },
              { label:'Grow',title:'Track your progress',body:'Weekly reviews, direct coach messaging, and real progress tracking. Your coach adjusts your plan as you improve.' },
            ].map((step,i)=>(
              <div key={i} style={{ background:'#F1EADC',padding:'40px 28px',position:'relative',overflow:'hidden',transition:'background 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#EAE1CE'}
                onMouseLeave={e=>e.currentTarget.style.background='#F1EADC'}>
                <div style={{ position:'absolute',top:'12px',right:'16px',fontFamily:"'Playfair Display',serif",fontSize:'60px',fontWeight:'900',color:'rgba(43,36,24,0.06)',lineHeight:1 }}>
                  {String(i+1).padStart(2,'0')}
                </div>
                <div style={{ fontSize:'10px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#3F8B49',marginBottom:'14px' }}>{step.label}</div>
                <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:'18px',fontWeight:'700',color:TEXT_ON_BEIGE,marginBottom:'12px',lineHeight:'1.3' }}>{step.title}</h3>
                <p style={{ fontSize:'13px',color:TEXT_DIM_ON_BEIGE,lineHeight:'1.8',margin:0 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-inner" style={{ padding:'110px 44px',textAlign:'center',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'600px',height:'600px',borderRadius:'50%',background:`radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 70%)`,pointerEvents:'none' }} />
        <div style={{ position:'relative',zIndex:1,maxWidth:'540px',margin:'0 auto' }}>
          <div style={{ fontSize:'11px',fontWeight:'700',letterSpacing:'0.18em',textTransform:'uppercase',color:'#3F8B49',marginBottom:'18px' }}>Start today</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(28px,5vw,50px)',fontWeight:'900',color:TEXT_ON_BEIGE,lineHeight:'1.1',marginBottom:'18px' }}>
            Ready to find<br /><span style={{ fontStyle:'italic',color:'#3F8B49' }}>your coach?</span>
          </h2>
          <p style={{ fontSize:'15px',color:TEXT_DIM_ON_BEIGE,marginBottom:'36px',lineHeight:'1.75',fontWeight:'300' }}>
            Athletes everywhere are already training smarter. Your coach is waiting.
          </p>
          <button onClick={()=>document.getElementById('coaches-section')?.scrollIntoView({behavior:'smooth'})}
            style={{ padding:'15px 44px',borderRadius:'8px',background:GREEN_DARK,color:'#FFFFFF',border:'none',fontFamily:'inherit',fontSize:'15px',fontWeight:'700',cursor:'pointer',boxShadow:`0 4px 36px rgba(21,128,61,0.33)`,transition:'all 0.2s',letterSpacing:'0.02em' }}
            onMouseEnter={e=>{ e.currentTarget.style.background='#16a34a'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 56px rgba(21,128,61,0.4)`; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=GREEN_DARK; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=`0 4px 36px rgba(21,128,61,0.33)`; }}>
            Browse coaches →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:'24px 44px',borderTop:`1px solid rgba(43,36,24,0.12)`,background:'#DED2B8' }}>
        <div className="footer-row" style={{ maxWidth:'1440px',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'14px' }}>
          <span style={{ fontFamily:"'Playfair Display',serif",fontWeight:'800',fontSize:'16px',color:TEXT_ON_BEIGE,letterSpacing:'0.08em' }}>
            COACHLY<span style={{ color:'#3F8B49' }}>.</span>
          </span>
          <div style={{ display:'flex',gap:'20px',alignItems:'center' }}>
            {[['For coaches',()=>navigate('/coach/signup')],['Terms',()=>setLegalModal('terms')],['Privacy',()=>setLegalModal('privacy')]].map(([label,fn])=>(
              <button key={label} onClick={fn} style={{ background:'none',border:'none',fontFamily:'inherit',fontSize:'13px',color:TEXT_FAINT_ON_BEIGE,cursor:'pointer',transition:'color 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.color='#3F8B49'}
                onMouseLeave={e=>e.currentTarget.style.color=TEXT_FAINT_ON_BEIGE}>{label}</button>
            ))}
          </div>
          <div style={{ fontSize:'12px',color:TEXT_FAINT_ON_BEIGE }}>© {new Date().getFullYear()} Coachly</div>
        </div>
      </footer>
    </div>
  );
}