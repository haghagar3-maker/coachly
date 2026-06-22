import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches, getRankedCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

/* ─────────────────────────────────────────────
   THEME: White base, black hero, green accents
───────────────────────────────────────────── */
const BLACK  = '#0A0A0A';
const WHITE  = '#FAFAF8';
const GREEN  = '#22C55E';
const GREEN_DARK  = '#16A34A';
const GREEN_LIGHT = '#86efac';

const S = {
  bg:        WHITE,
  surface:   '#FFFFFF',
  surface2:  '#F4F4F0',
  border:    '#E2E2DC',
  text:      '#0A0A0A',
  textDim:   '#555550',
  textFaint: '#999990',
  cardShadow:'0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  cardHover: '0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(34,197,94,0.25)',
};

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
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'#fff', border:`1px solid ${S.border}`, borderRadius:'20px', maxWidth:'580px', width:'100%', maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
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

/* ─── Coach Card ─── */
function CoachCard({ coach, onView, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const heroImage  = coach.banner || null;
  const profilePic = coach.photo  || null;

  let specialties = [];
  if (coach.specialties) {
    try { specialties = JSON.parse(coach.specialties); }
    catch { specialties = String(coach.specialties).split(',').map(s=>s.trim()).filter(Boolean); }
  }

  const starRating = coach.rating > 0 ? Number(coach.rating).toFixed(1) : null;

  return (
    <div
      data-coach-card=""
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>{ setHovered(false); setPressed(false); }}
      onMouseDown={()=>setPressed(true)}
      onMouseUp={()=>setPressed(false)}
      onClick={()=>onView(coach.slug||coach.id)}
      style={{
        width:'100%', borderRadius:'20px', overflow:'hidden',
        background:S.surface,
        border:`1.5px solid ${hovered ? GREEN+'66' : S.border}`,
        boxShadow: hovered ? S.cardHover : S.cardShadow,
        transform: pressed ? 'scale(0.984)' : hovered ? 'translateY(-6px)' : 'none',
        transition:'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
        cursor:'pointer', userSelect:'none',
        display:'flex', flexDirection:'column',
        animation:'fadeSlideUp 0.5s ease both',
        animationDelay:`${delay}ms`,
        WebkitTapHighlightColor:'transparent',
      }}
    >
      {/* ── BANNER ── */}
      <div style={{ height:'210px', position:'relative', overflow:'hidden', flexShrink:0,
        background: heroImage ? '#000' : `linear-gradient(135deg, ${S.surface2} 0%, #e8e8e2 100%)` }}>
        {heroImage ? (
          <img src={heroImage} alt={coach.name}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
              transform: hovered ? 'scale(1.05)' : 'scale(1)', transition:'transform 0.5s ease' }} />
        ) : (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:'72px', height:'72px', borderRadius:'50%',
              background:`${avatarColor(coach.id)}20`, border:`2px dashed ${avatarColor(coach.id)}66`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'24px', fontWeight:'700', color:avatarColor(coach.id) }}>
              {initials(coach.name)}
            </div>
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.65) 100%)' }} />

        {/* Category pill */}
        {coach.category_name && (
          <span style={{ position:'absolute', top:'13px', left:'13px',
            background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)',
            color:GREEN, fontSize:'10px', fontWeight:'700', textTransform:'uppercase',
            letterSpacing:'0.09em', padding:'4px 10px', borderRadius:'100px',
            border:`1px solid ${GREEN}44` }}>
            {coach.category_name}
          </span>
        )}

        {/* Price badge */}
        {coach.plan_price != null && (
          <span style={{ position:'absolute', top:'13px', right:'13px',
            background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)',
            color:'#fff', fontSize:'13px', fontWeight:'700', padding:'4px 11px',
            borderRadius:'100px', border:'1px solid rgba(255,255,255,0.15)' }}>
            <span style={{ color:GREEN }}>${Number(coach.plan_price).toFixed(0)}</span>
            <span style={{ color:'rgba(255,255,255,0.45)', fontWeight:'400', fontSize:'11px' }}>/mo</span>
          </span>
        )}

        {/* Rating */}
        {starRating && (
          <span style={{ position:'absolute', bottom:'13px', right:'13px',
            background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)',
            color:GREEN, fontSize:'12px', fontWeight:'800', padding:'4px 9px',
            borderRadius:'100px', border:`1px solid ${GREEN}44`,
            display:'flex', alignItems:'center', gap:'4px' }}>
            ★ {starRating}
          </span>
        )}
      </div>

      {/* ── PROFILE STRIP (below banner) ── */}
      <div style={{ padding:'14px 18px 12px', display:'flex', alignItems:'center', gap:'11px',
        borderBottom:`1px solid ${S.border}` }}>
        {/* Avatar */}
        <div style={{ width:'44px', height:'44px', borderRadius:'50%', flexShrink:0, overflow:'hidden',
          background: profilePic ? '#000' : avatarColor(coach.id),
          border:`2px solid ${GREEN}55`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 0 0 3px ${GREEN}18` }}>
          {profilePic
            ? <img src={profilePic} alt={coach.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:'15px', fontWeight:'700', color:'#fff' }}>{initials(coach.name)}</span>
          }
        </div>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:'15px', fontWeight:'700', color:S.text,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {coach.name}
          </div>
          <div style={{ fontSize:'11px', color:S.textFaint, marginTop:'2px',
            display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
            {coach.location && <span>📍 {coach.location}</span>}
            {coach.response_time && <span>⏱ {coach.response_time}</span>}
          </div>
        </div>
        {/* Availability dot */}
        <div style={{ width:'8px', height:'8px', borderRadius:'50%',
          background:GREEN, boxShadow:`0 0 6px ${GREEN}`, flexShrink:0 }} title="Available" />
      </div>

      {/* ── BODY ── */}
      <div style={{ padding:'14px 18px', flex:1, display:'flex', flexDirection:'column', gap:'10px' }}>
        {/* Specialties */}
        {specialties.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
            {specialties.slice(0,4).map((sp,i)=>(
              <span key={i} style={{ fontSize:'10px', fontWeight:'600', color:GREEN,
                background:`${GREEN}12`, border:`1px solid ${GREEN}28`,
                borderRadius:'100px', padding:'3px 9px' }}>
                {sp}
              </span>
            ))}
          </div>
        )}

        {/* Tagline */}
        {coach.tagline && (
          <p style={{ fontSize:'13px', color:S.textDim, lineHeight:'1.6', margin:0,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
            overflow:'hidden', fontStyle:'italic' }}>
            "{coach.tagline}"
          </p>
        )}

        {/* Bio */}
        {coach.bio && (
          <p style={{ fontSize:'12px', color:S.textFaint, lineHeight:'1.65', margin:0,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
            overflow:'hidden' }}>
            {coach.bio}
          </p>
        )}

        {/* Stats */}
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'6px', marginTop:'auto', paddingTop:'4px' }}>
          {starRating && (
            <div style={{ display:'flex', alignItems:'center', gap:'2px' }}>
              {[1,2,3,4,5].map(n=>(
                <span key={n} style={{ fontSize:'11px',
                  color: n <= Math.round(Number(starRating)) ? '#f59e0b' : '#D8D8D0' }}>★</span>
              ))}
              <span style={{ fontSize:'11px', color:S.textDim, marginLeft:'3px' }}>({starRating})</span>
            </div>
          )}
          {coach.subscriber_count > 0 && (
            <span style={{ fontSize:'11px', color:S.textDim, background:S.surface2,
              padding:'2px 8px', borderRadius:'100px', border:`1px solid ${S.border}` }}>
              👥 {coach.subscriber_count}
            </span>
          )}
          {coach.years_experience > 0 && (
            <span style={{ fontSize:'11px', color:S.textDim, background:S.surface2,
              padding:'2px 8px', borderRadius:'100px', border:`1px solid ${S.border}` }}>
              🏅 {coach.years_experience}y
            </span>
          )}
          {coach.sessions_count > 0 && (
            <span style={{ fontSize:'11px', color:S.textDim, background:S.surface2,
              padding:'2px 8px', borderRadius:'100px', border:`1px solid ${S.border}` }}>
              ⚡ {coach.sessions_count}
            </span>
          )}
        </div>
      </div>

      {/* ── VIEW PROFILE BUTTON ── full width at bottom */}
      <div style={{ padding:'12px 18px 16px' }}>
        <div style={{
          width:'100%', padding:'11px 0',
          borderRadius:'10px',
          background: hovered
            ? `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})`
            : S.surface2,
          border: hovered ? 'none' : `1.5px solid ${S.border}`,
          color: hovered ? '#03200a' : S.textDim,
          fontFamily:'inherit', fontSize:'13px', fontWeight:'700',
          display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
          transition:'all 0.2s ease',
          letterSpacing:'0.04em',
          userSelect:'none',
        }}>
          View Profile <span style={{ fontSize:'15px' }}>→</span>
        </div>
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
        <span key={i} style={{
          display:'inline-block',
          opacity:vis?1:0,
          transform:vis?'translateY(0)':'translateY(28px)',
          transition:`opacity 0.65s ease ${i*90}ms,transform 0.65s cubic-bezier(0.22,1,0.36,1) ${i*90}ms`,
          marginRight:'0.26em'
        }}>{w}</span>
      ))}
    </span>
  );
}

/* ─── Carousel with arrows ─── */
function CoachesCarousel({ coaches, onView }) {
  const rowRef = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
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
    const cardW = el.querySelector('[data-coach-card]')?.offsetWidth || 320;
    el.scrollBy({ left: dir * (cardW * 2 + 24), behavior:'smooth' });
  };

  const ArrowBtn = ({ dir, vis }) => (
    <button onClick={()=>scroll(dir)} style={{
      position:'absolute', top:'40%', transform:'translateY(-50%)',
      [dir===-1?'left':'right']: '-18px', zIndex:20,
      width:'40px', height:'40px', borderRadius:'50%',
      background:'#fff', border:`1.5px solid ${vis ? GREEN+'99' : S.border}`,
      color: vis ? GREEN : S.textFaint,
      fontSize:'18px', cursor:vis?'pointer':'default',
      display:'flex', alignItems:'center', justifyContent:'center',
      opacity: vis ? 1 : 0.2,
      transition:'all 0.2s',
      pointerEvents: vis ? 'auto' : 'none',
      boxShadow: vis ? `0 4px 16px rgba(34,197,94,0.15)` : 'none',
    }}>{dir===-1?'‹':'›'}</button>
  );

  return (
    <div style={{ position:'relative' }}>
      <ArrowBtn dir={-1} vis={canLeft} />
      <ArrowBtn dir={1}  vis={canRight} />
      {canLeft  && <div style={{ position:'absolute', left:0,  top:0, bottom:0, width:'60px', background:`linear-gradient(to right,  ${WHITE}, transparent)`, zIndex:10, pointerEvents:'none' }} />}
      {canRight && <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'60px', background:`linear-gradient(to left, ${WHITE}, transparent)`, zIndex:10, pointerEvents:'none' }} />}
      <div ref={rowRef} style={{
        display:'flex', gap:'20px',
        overflowX:'auto', scrollSnapType:'x mandatory',
        scrollbarWidth:'none', paddingBottom:'12px',
        paddingLeft:'2px', paddingRight:'2px',
      }}>
        {coaches.map((coach,i)=>(
          <div key={coach.id} data-coach-card="" style={{
            flex:'0 0 calc(25% - 16px)',
            minWidth:'280px',
            maxWidth:'400px',
            scrollSnapAlign:'start',
          }}>
            <CoachCard coach={coach} onView={onView} delay={i*50} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function Home() {
  const navigate = useNavigate();

  const [categories,    setCategories]    = useState([]);
  const [coaches,       setCoaches]       = useState([]);
  const [activeCategory,setActiveCategory]= useState(null);
  const [loadingCats,   setLoadingCats]   = useState(true);
  const [loadingCoaches,setLoadingCoaches]= useState(true);
  const [legalModal,    setLegalModal]    = useState(null);
  const [videoLoaded,   setVideoLoaded]   = useState(false);
  const videoRef = useRef(null);

  // Inject global styles
  useEffect(()=>{
    const id='coachly-home-v10';
    if (document.getElementById(id)) return;
    const s=document.createElement('style'); s.id=id;
    s.textContent=`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Inter:wght@300;400;500;600;700&display=swap');
      @keyframes fadeSlideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
      button{-webkit-tap-highlight-color:transparent;outline:none}
      ::-webkit-scrollbar{display:none}
      body{background:#FAFAF8!important}
      .green-shimmer{
        background:linear-gradient(90deg,#22C55E,#86efac,#22C55E,#16A34A);
        background-size:200% auto;
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;
        background-clip:text;animation:shimmer 4s linear infinite
      }
      /* 4 cols default → 2 on tablet → 1 on mobile */
      @media(max-width:1100px){
        [data-coach-card]{flex:0 0 calc(33.333% - 14px)!important}
      }
      @media(max-width:760px){
        [data-coach-card]{flex:0 0 calc(50% - 10px)!important; min-width:240px!important}
        .hero-h1{font-size:36px!important; line-height:1.1!important}
        .hero-sub{font-size:14px!important}
        .section-pad{padding:60px 20px!important}
        .how-grid{grid-template-columns:1fr!important}
        .hide-nav{display:none!important}
        .cta-section{padding:80px 20px!important}
        .footer-inner{flex-direction:column!important;align-items:center!important;text-align:center!important;gap:12px!important}
      }
      @media(max-width:480px){
        [data-coach-card]{flex:0 0 85vw!important; min-width:0!important}
        .hero-h1{font-size:28px!important}
        .coaches-pad{padding:48px 16px!important}
        .nav-pad{padding:0 18px!important}
      }
    `;
    document.head.appendChild(s);
  },[]);

  useEffect(()=>{
    getCategories().then(setCategories).catch(()=>setCategories([])).finally(()=>setLoadingCats(false));
  },[]);

  useEffect(()=>{
    setLoadingCoaches(true);
    (activeCategory ? getCoaches(activeCategory) : getRankedCoaches().catch(()=>getCoaches(null)))
      .then(setCoaches)
      .catch(()=>{ setCoaches([]); showToast('Failed to load coaches','error'); })
      .finally(()=>setLoadingCoaches(false));
  },[activeCategory]);

  const token     = localStorage.getItem('coachly_token');
  const tokenType = localStorage.getItem('coachly_token_type');

  return (
    <div style={{ position:'relative', minHeight:'100vh', background:WHITE,
      color:S.text, fontFamily:"'Inter',system-ui,sans-serif", overflowX:'hidden' }}>
      <Toast />
      {legalModal && <LegalModal type={legalModal} onClose={()=>setLegalModal(null)} />}

      {/* ── NAVBAR ── */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(250,250,248,0.92)', backdropFilter:'blur(20px)',
        borderBottom:`1px solid ${S.border}`,
      }}>
        <div className="nav-pad" style={{ width:'100%', maxWidth:'1420px', margin:'0 auto',
          padding:'0 36px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}
            style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:'800',
              fontSize:'20px', color:BLACK, letterSpacing:'0.08em' }}>
              COACHLY<span style={{ color:GREEN }}>.</span>
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <button className="hide-nav" onClick={()=>navigate('/coach/signup')}
              style={{ background:'none', border:'none', fontFamily:'inherit',
                fontSize:'13px', color:S.textDim, cursor:'pointer', padding:'8px 14px' }}
              onMouseEnter={e=>e.currentTarget.style.color=GREEN}
              onMouseLeave={e=>e.currentTarget.style.color=S.textDim}>
              For coaches
            </button>
            {token && tokenType==='user' ? (
              <button onClick={()=>navigate('/dashboard')}
                style={{ padding:'9px 20px', borderRadius:'8px', background:GREEN,
                  color:'#03200a', border:'none', fontFamily:'inherit',
                  fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                My dashboard
              </button>
            ) : token && tokenType==='coach' ? (
              <button onClick={()=>navigate('/coach/dashboard')}
                style={{ padding:'9px 20px', borderRadius:'8px', background:GREEN,
                  color:'#03200a', border:'none', fontFamily:'inherit',
                  fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                Coach dashboard
              </button>
            ) : (
              <>
                <button onClick={()=>navigate('/user/login')}
                  style={{ padding:'9px 18px', borderRadius:'8px',
                    border:`1px solid ${S.border}`, background:'none',
                    fontFamily:'inherit', fontSize:'13px', color:S.textDim,
                    cursor:'pointer', transition:'all 0.2s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.color=GREEN; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=S.border; e.currentTarget.style.color=S.textDim; }}>
                  Log in
                </button>
                <button onClick={()=>navigate('/user/login')}
                  style={{ padding:'9px 20px', borderRadius:'8px', background:GREEN,
                    color:'#03200a', border:'none', fontFamily:'inherit',
                    fontSize:'13px', fontWeight:'700', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
                  onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO (always dark) ── */}
      <section style={{ position:'relative', height:'100vh', minHeight:'600px',
        display:'flex', alignItems:'center', justifyContent:'center',
        overflow:'hidden', background:BLACK }}>
        <video ref={videoRef} autoPlay muted loop playsInline
          onLoadedData={()=>setVideoLoaded(true)}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%',
            objectFit:'cover', opacity:videoLoaded?0.4:0, transition:'opacity 1.5s ease' }}>
          <source src="https://videos.pexels.com/video-files/4761789/4761789-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(to bottom, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.1) 50%, rgba(10,10,10,0.95) 100%)' }} />

        <div style={{ position:'relative', zIndex:2, textAlign:'center',
          padding:'0 24px', maxWidth:'860px', margin:'0 auto' }}>
          <div style={{ animation:'fadeSlideUp 0.6s ease both', fontSize:'11px',
            fontWeight:'700', letterSpacing:'0.22em', textTransform:'uppercase',
            color:GREEN, marginBottom:'20px' }}>
            Every Sport · Every Level · Any Goal
          </div>
          <h1 className="hero-h1" style={{ fontFamily:"'Playfair Display',serif",
            fontSize:'68px', fontWeight:'900', lineHeight:'1.04',
            color:'#F5F5F3', margin:0, letterSpacing:'-0.02em' }}>
            <AnimatedHeadline text="Find your coach." delay={200} />
            <br />
            <span className="green-shimmer" style={{ fontStyle:'italic' }}>
              <AnimatedHeadline text="Any sport. 24/7." delay={480} />
            </span>
          </h1>
          <p className="hero-sub" style={{ animation:'fadeSlideUp 0.7s ease 0.8s both',
            fontSize:'16px', color:'rgba(245,245,243,0.5)', lineHeight:'1.8',
            fontWeight:'300', maxWidth:'480px', margin:'20px auto 40px' }}>
            Real coaches across every discipline — each with their own AI assistant
            to support you between sessions.
          </p>
          <div style={{ animation:'fadeSlideUp 0.7s ease 1s both',
            display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
            <button
              onClick={()=>document.getElementById('coaches-section')?.scrollIntoView({behavior:'smooth'})}
              style={{ padding:'14px 34px', borderRadius:'8px', background:GREEN,
                color:'#03200a', border:'none', fontFamily:'inherit',
                fontSize:'15px', fontWeight:'700', cursor:'pointer',
                boxShadow:'0 4px 24px rgba(34,197,94,0.3)', transition:'all 0.2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#4ade80'; e.currentTarget.style.boxShadow='0 8px 40px rgba(34,197,94,0.45)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=GREEN; e.currentTarget.style.boxShadow='0 4px 24px rgba(34,197,94,0.3)'; }}>
              Find a coach
            </button>
            <button onClick={()=>navigate('/coach/signup')}
              style={{ padding:'14px 34px', borderRadius:'8px',
                border:`1px solid ${GREEN}55`, background:'rgba(34,197,94,0.07)',
                fontFamily:'inherit', fontSize:'15px', fontWeight:'500',
                cursor:'pointer', color:GREEN, transition:'all 0.2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=GREEN; e.currentTarget.style.background='rgba(34,197,94,0.13)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=GREEN+'55'; e.currentTarget.style.background='rgba(34,197,94,0.07)'; }}>
              Become a coach
            </button>
          </div>
        </div>

        <div style={{ position:'absolute', bottom:'30px', left:'50%', transform:'translateX(-50%)',
          display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
          animation:'fadeSlideUp 0.7s ease 1.4s both' }}>
          <span style={{ fontSize:'10px', letterSpacing:'0.16em', textTransform:'uppercase',
            color:'rgba(255,255,255,0.22)' }}>Scroll</span>
          <div style={{ width:'1px', height:'34px',
            background:`linear-gradient(to bottom,${GREEN},transparent)`,
            animation:'pulse 2s ease infinite' }} />
        </div>
      </section>

      {/* ── COACHES SECTION ── white background */}
      <section id="coaches-section" className="coaches-pad"
        style={{ background:WHITE, padding:'80px 44px' }}>
        <div style={{ maxWidth:'1420px', margin:'0 auto' }}>
          <div style={{ marginBottom:'32px' }}>
            <div style={{ fontSize:'11px', fontWeight:'700', letterSpacing:'0.18em',
              textTransform:'uppercase', color:GREEN, marginBottom:'10px' }}>Our coaches</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif",
              fontSize:'clamp(26px,3.5vw,42px)', fontWeight:'800',
              color:S.text, lineHeight:'1.15', margin:0 }}>
              Find the coach{' '}
              <span style={{ color:S.textFaint, fontStyle:'italic' }}>that moves you.</span>
            </h2>
          </div>

          {/* Filter bar */}
          {!loadingCats && categories.length > 0 && (
            <div style={{ display:'flex', gap:'7px', marginBottom:'30px',
              overflowX:'auto', scrollbarWidth:'none', paddingBottom:'2px' }}>
              {[{id:'all',name:'All',slug:null}].concat(categories).map(cat=>{
                const isActive = cat.slug===null ? activeCategory===null : activeCategory===cat.slug;
                return (
                  <button key={cat.id}
                    onClick={()=>setActiveCategory(cat.slug===activeCategory ? null : (cat.slug??null))}
                    style={{ padding:'8px 18px', borderRadius:'100px',
                      whiteSpace:'nowrap', flexShrink:0,
                      border:`1px solid ${isActive ? GREEN : S.border}`,
                      background: isActive ? `${GREEN}12` : 'transparent',
                      color: isActive ? GREEN : S.textDim,
                      fontFamily:'inherit', fontSize:'13px', fontWeight:'600',
                      cursor:'pointer', transition:'all 0.18s' }}
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
            <div style={{ display:'flex', gap:'20px' }}>
              {[1,2,3,4].map(i=>(
                <div key={i} style={{ flex:'0 0 calc(25% - 16px)', minWidth:'280px' }}>
                  <LoadingSkeleton type="card" />
                </div>
              ))}
            </div>
          ) : coaches.length===0 ? (
            <EmptyState message="No coaches yet." cta="Become a coach"
              onCta={()=>navigate('/coach/signup')} />
          ) : (
            <CoachesCarousel coaches={coaches} onView={id=>navigate(`/coach/${id}`)} />
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── light grey */}
      <section className="section-pad"
        style={{ padding:'100px 44px', background:'#F0F0EB',
          borderTop:`1px solid ${S.border}`, borderBottom:`1px solid ${S.border}` }}>
        <div style={{ maxWidth:'980px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'56px' }}>
            <div style={{ fontSize:'11px', fontWeight:'700', letterSpacing:'0.18em',
              textTransform:'uppercase', color:GREEN, marginBottom:'12px' }}>How it works</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif",
              fontSize:'clamp(26px,3.5vw,40px)', fontWeight:'800',
              color:S.text, margin:0 }}>
              Coaching,{' '}
              <span style={{ fontStyle:'italic', color:GREEN }}>reimagined.</span>
            </h2>
          </div>
          <div className="how-grid" style={{ display:'grid',
            gridTemplateColumns:'repeat(3,1fr)', gap:'2px',
            background:S.border, borderRadius:'18px', overflow:'hidden' }}>
            {[
              { label:'Subscribe', title:'Choose your coach',
                body:'Browse real coaches across every sport and discipline. Pick the program built for your goals and subscribe monthly.' },
              { label:'Train', title:'Get your plan + AI helper',
                body:'Each coach sets you a custom training plan and a built-in AI assistant for quick questions between sessions — your coach still leads the program.' },
              { label:'Grow', title:'Track your progress',
                body:'Weekly reviews, direct coach messaging, and real progress tracking. Your coach adjusts your plan as you improve.' },
            ].map((step,i)=>(
              <div key={i}
                style={{ background:'#FFFFFF', padding:'42px 30px',
                  position:'relative', overflow:'hidden', transition:'background 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#F8F8F4'}
                onMouseLeave={e=>e.currentTarget.style.background='#FFFFFF'}>
                <div style={{ position:'absolute', top:'14px', right:'18px',
                  fontFamily:"'Playfair Display',serif", fontSize:'64px',
                  fontWeight:'900', color:`${GREEN}0D`, lineHeight:1 }}>
                  {String(i+1).padStart(2,'0')}
                </div>
                <div style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'0.2em',
                  textTransform:'uppercase', color:GREEN, marginBottom:'14px' }}>
                  {step.label}
                </div>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px',
                  fontWeight:'700', color:S.text, marginBottom:'12px', lineHeight:'1.3' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize:'13px', color:S.textDim, lineHeight:'1.8', margin:0 }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── white */}
      <section className="cta-section"
        style={{ padding:'110px 44px', textAlign:'center', background:WHITE }}>
        <div style={{ maxWidth:'560px', margin:'0 auto' }}>
          <div style={{ fontSize:'11px', fontWeight:'700', letterSpacing:'0.18em',
            textTransform:'uppercase', color:GREEN, marginBottom:'18px' }}>Start today</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif",
            fontSize:'clamp(30px,5vw,50px)', fontWeight:'900',
            color:S.text, lineHeight:'1.1', marginBottom:'18px' }}>
            Ready to find<br />
            <span style={{ fontStyle:'italic', color:GREEN }}>your coach?</span>
          </h2>
          <p style={{ fontSize:'15px', color:S.textDim, marginBottom:'36px',
            lineHeight:'1.75', fontWeight:'300' }}>
            Athletes everywhere are already training smarter. Your coach is waiting.
          </p>
          <button
            onClick={()=>document.getElementById('coaches-section')?.scrollIntoView({behavior:'smooth'})}
            style={{ padding:'15px 44px', borderRadius:'8px', background:GREEN,
              color:'#03200a', border:'none', fontFamily:'inherit',
              fontSize:'15px', fontWeight:'700', cursor:'pointer',
              boxShadow:'0 4px 32px rgba(34,197,94,0.22)',
              transition:'all 0.2s', letterSpacing:'0.02em' }}
            onMouseEnter={e=>{ e.currentTarget.style.background='#4ade80'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 48px rgba(34,197,94,0.36)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=GREEN; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 32px rgba(34,197,94,0.22)'; }}>
            Browse coaches →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:'24px 44px', borderTop:`1px solid ${S.border}`,
        background:WHITE }}>
        <div className="footer-inner" style={{ maxWidth:'1420px', margin:'0 auto',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexWrap:'wrap', gap:'16px' }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:'800',
            fontSize:'16px', color:S.text, letterSpacing:'0.08em' }}>
            COACHLY<span style={{ color:GREEN }}>.</span>
          </span>
          <div style={{ display:'flex', gap:'20px', alignItems:'center' }}>
            {[['For coaches',()=>navigate('/coach/signup')],
              ['Terms',()=>setLegalModal('terms')],
              ['Privacy',()=>setLegalModal('privacy')]
            ].map(([label,fn])=>(
              <button key={label} onClick={fn}
                style={{ background:'none', border:'none', fontFamily:'inherit',
                  fontSize:'13px', color:S.textFaint, cursor:'pointer', transition:'color 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.color=GREEN}
                onMouseLeave={e=>e.currentTarget.style.color=S.textFaint}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:'12px', color:S.textFaint }}>
            © {new Date().getFullYear()} Coachly
          </div>
        </div>
      </footer>
    </div>
  );
}