import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getCoaches, getRankedCoaches } from '../api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';

/* ─── Palette ─── */
const GREEN       = '#C8FF00';
const GREEN_DARK  = '#8FB800';
const GREEN_LIGHT = '#DEFF6E';
const ORANGE      = '#F97316';
const NAVY        = '#0B1528';

/* Dark card */
const CARD_BG    = '#15203A';
const BORDER     = 'rgba(255,255,255,0.07)';
const TEXT       = '#F1F5F9';
const TEXT_DIM   = '#94A3B8';
const TEXT_FAINT = '#475569';

/* Beige */
const BEIGE      = '#F5EFE4';
const BEIGE2     = '#EDE4D3';
const TEXT_B     = '#1C1712';
const TEXT_B_DIM = '#6B6151';
const TEXT_B_F   = '#9E9282';

/* ─── Legal Modal ─── */
function LegalModal({ type, onClose }) {
  useEffect(() => { document.body.style.overflow='hidden'; return ()=>{ document.body.style.overflow=''; }; }, []);
  const content = type==='privacy' ? {
    title:'Privacy Policy',
    sections:[
      {heading:'Information We Collect',body:'We collect information you provide when creating an account, subscribing to a coach, or communicating with us — name, email, payment info, fitness goals, and content you upload.'},
      {heading:'How We Use It',body:'To provide, maintain and improve our services, process transactions, send support messages, and (with your consent) marketing communications.'},
      {heading:'Information Sharing',body:'We do not sell or trade your personally identifiable information to outside parties.'},
      {heading:'Contact',body:'Questions? privacy@coachly.app'},
    ],
  } : {
    title:'Terms of Service',
    sections:[
      {heading:'Acceptance',body:'By using Coachly you agree to these Terms.'},
      {heading:'Use of Service',body:'Coachly connects clients with fitness and wellness coaches. Use only for lawful purposes.'},
      {heading:'Subscriptions',body:'Billed monthly. Cancel any time.'},
      {heading:'Coach Content',body:'Coaches are independent professionals. Consult a healthcare professional before starting any fitness program.'},
      {heading:'Contact',body:'legal@coachly.app'},
    ],
  };
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:'20px',maxWidth:'560px',width:'100%',maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'24px 28px 18px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:'19px',fontWeight:'700',color:TEXT}}>{content.title}</span>
          <button onClick={onClose} style={{background:'none',border:`1px solid ${BORDER}`,color:'#fff',cursor:'pointer',width:'32px',height:'32px',borderRadius:'50%',fontSize:'16px'}}>×</button>
        </div>
        <div style={{overflowY:'auto',padding:'24px 28px 32px'}}>
          {content.sections.map((s,i)=>(
            <div key={i} style={{marginBottom:'18px'}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'14px',fontWeight:'700',color:GREEN,marginBottom:'6px'}}>{s.heading}</h3>
              <p style={{fontSize:'13px',color:TEXT_DIM,lineHeight:'1.75',margin:0}}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */
const AVATAR_COLORS=['#C8FF00','#3B82F6','#F59E0B','#8B5CF6','#06B6D4','#EF4444','#EC4899'];
function avatarColor(id){
  if(!id) return AVATAR_COLORS[0];
  let h=0; for(let i=0;i<id.length;i++) h=id.charCodeAt(i)+((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length];
}
function initials(name){ if(!name) return '?'; return name.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2); }
function rankScore(c){ return (Number(c.rating)||0)*40+(Number(c.subscriber_count)||0)*2+(Number(c.sessions_count)||0)*0.5+(Number(c.years_experience)||0)*3; }

/* ─── Coach Card ─── */
function CoachCard({coach,onView,delay=0}){
  const [hovered,setHovered]=useState(false);
  const [pressed,setPressed]=useState(false);
  const [revealed,setRevealed]=useState(false);
  const wrapRef=useRef(null);
  const ACTION_H=56;
  const heroImage=coach.banner||null;
  const profilePic=coach.photo||null;

  useEffect(()=>{
    if(!revealed) return;
    const fn=(e)=>{ if(wrapRef.current&&!wrapRef.current.contains(e.target)) setRevealed(false); };
    document.addEventListener('click',fn);
    return()=>document.removeEventListener('click',fn);
  },[revealed]);

  let specialties=[];
  if(coach.specialties){
    try{specialties=JSON.parse(coach.specialties);}
    catch{specialties=String(coach.specialties).split(',').map(s=>s.trim()).filter(Boolean);}
  }
  const starRating=coach.rating>0?Number(coach.rating).toFixed(1):null;

  /* No-banner fallback: a rich dark gradient using the coach's avatar color */
  const ac = avatarColor(coach.id);

  return (
    <div ref={wrapRef} style={{width:'100%',borderRadius:'22px',display:'flex',flexDirection:'column',animation:'fadeUp 0.55s ease both',animationDelay:`${delay}ms`}}>
      <div
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>{setHovered(false);setPressed(false);}}
        onMouseDown={()=>setPressed(true)}
        onMouseUp={()=>setPressed(false)}
        onClick={()=>setRevealed(r=>!r)}
        style={{
          WebkitTapHighlightColor:'transparent',outline:'none',
          width:'100%',minWidth:0,
          transition:'transform 0.22s ease,border-color 0.22s,box-shadow 0.22s,border-radius 0.22s',
          position:'relative',zIndex:1,
          background:CARD_BG,
          border:`1px solid ${hovered?GREEN+'66':BORDER}`,
          borderRadius:revealed?'22px 22px 0 0':'22px',
          cursor:'pointer',userSelect:'none',
          transform:pressed?'scale(0.985)':hovered?'translateY(-8px) scale(1.005)':'none',
          boxShadow:hovered?`0 28px 60px -16px rgba(0,0,0,0.6),0 0 0 1px ${GREEN}33`:'0 4px 24px rgba(0,0,0,0.4)',
          display:'flex',flexDirection:'column',
        }}
      >
        {/* BANNER */}
        <div style={{height:'270px',position:'relative',overflow:'hidden',borderRadius:'22px 22px 0 0',flexShrink:0,background:heroImage?'#000':`linear-gradient(145deg,#1a2a4a 0%,#0e1a30 40%,${ac}18 70%,#0B1528 100%)`}}>
          {heroImage
            ? <img src={heroImage} alt={coach.name} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:hovered?'scale(1.06)':'scale(1)',transition:'transform 0.55s ease'}}/>
            : <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:'90px',height:'90px',borderRadius:'50%',background:`${ac}22`,border:`2px solid ${ac}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px',fontWeight:'700',color:ac,textShadow:`0 0 20px ${ac}66`}}>{initials(coach.name)}</div>
              </div>
          }
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.05) 30%,rgba(0,0,0,0.75) 100%)'}}/>
          {coach.category_name && (
            <span style={{position:'absolute',top:'14px',left:'14px',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',color:GREEN,fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.09em',padding:'5px 11px',borderRadius:'100px',border:`1px solid ${GREEN}44`}}>{coach.category_name}</span>
          )}
          {coach.plan_price!=null && (
            <span style={{position:'absolute',top:'14px',right:'14px',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',color:'#fff',fontSize:'13px',fontWeight:'700',padding:'5px 12px',borderRadius:'100px',border:'1px solid rgba(255,255,255,0.15)'}}>
              <span style={{color:GREEN}}>${Number(coach.plan_price).toFixed(0)}</span>
              <span style={{color:'rgba(255,255,255,0.4)',fontWeight:'400',fontSize:'11px'}}>/mo</span>
            </span>
          )}
          {starRating && (
            <span style={{position:'absolute',bottom:'14px',right:'14px',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',color:GREEN,fontSize:'12px',fontWeight:'800',padding:'5px 10px',borderRadius:'100px',border:`1px solid ${GREEN}44`,display:'flex',alignItems:'center',gap:'4px'}}>★ {starRating}</span>
          )}
        </div>

        {/* BODY */}
        <div style={{padding:'18px 20px 0',flex:1}}>
          {specialties.length>0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'12px'}}>
              {specialties.slice(0,4).map((sp,i)=>(
                <span key={i} style={{fontSize:'10px',fontWeight:'600',color:GREEN,background:`${GREEN}12`,border:`1px solid ${GREEN}30`,borderRadius:'100px',padding:'3px 10px'}}>{sp}</span>
              ))}
            </div>
          )}
          {coach.tagline && (
            <p style={{fontSize:'13px',color:'rgba(241,245,249,0.65)',lineHeight:'1.6',margin:'0 0 12px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',fontStyle:'italic'}}>"{coach.tagline}"</p>
          )}
          {coach.bio && (
            <p style={{fontSize:'12px',color:'rgba(241,245,249,0.38)',lineHeight:'1.65',margin:'0 0 12px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{coach.bio}</p>
          )}
          <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'10px',paddingBottom:'14px'}}>
            {starRating && (
              <div style={{display:'flex',alignItems:'center',gap:'3px'}}>
                {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:'11px',color:n<=Math.round(Number(starRating))?GREEN:BORDER}}>★</span>)}
                <span style={{fontSize:'11px',color:TEXT_DIM,marginLeft:'3px'}}>({starRating})</span>
              </div>
            )}
            {coach.subscriber_count>0 && <span style={{fontSize:'11px',fontWeight:'700',color:'#fff',background:`linear-gradient(120deg,${ORANGE},#fb923c)`,padding:'4px 11px',borderRadius:'100px',boxShadow:`0 2px 10px ${ORANGE}55`}}>{coach.subscriber_count} clients</span>}
            {coach.years_experience>0 && <span style={{fontSize:'11px',fontWeight:'700',color:'#fff',background:'linear-gradient(120deg,#3B82F6,#60A5FA)',padding:'4px 11px',borderRadius:'100px',boxShadow:'0 2px 10px rgba(59,130,246,0.45)'}}>{coach.years_experience}y exp</span>}
            {coach.sessions_count>0 && <span style={{fontSize:'11px',fontWeight:'700',color:'#0a1a00',background:`linear-gradient(120deg,${GREEN_DARK},${GREEN})`,padding:'4px 11px',borderRadius:'100px',boxShadow:`0 2px 10px ${GREEN}55`}}>{coach.sessions_count} sessions</span>}
          </div>
        </div>

        {/* BOTTOM STRIP */}
        <div style={{padding:'14px 20px 18px',borderTop:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:'12px',marginTop:'auto',background:'rgba(0,0,0,0.2)',borderRadius:revealed?'0':'0 0 22px 22px'}}>
          <div style={{width:'42px',height:'42px',borderRadius:'50%',flexShrink:0,overflow:'hidden',background:profilePic?'#000':ac,border:`2px solid ${GREEN}55`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 0 3px ${GREEN}22`}}>
            {profilePic?<img src={profilePic} alt={coach.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:'14px',fontWeight:'700',color:'#000'}}>{initials(coach.name)}</span>}
          </div>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#F1F5F9',lineHeight:'1.2',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{coach.name}</div>
            <div style={{fontSize:'11px',color:'rgba(241,245,249,0.38)',marginTop:'2px',display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
              {coach.location&&<span>{coach.location}</span>}
              {coach.response_time&&<span>{coach.response_time}</span>}
            </div>
          </div>
          <div style={{fontSize:'11px',color:revealed?GREEN:'rgba(241,245,249,0.3)',transition:'color 0.2s,transform 0.25s',flexShrink:0,fontWeight:'600',transform:revealed?'rotate(90deg)':'none'}}>
            <span style={{fontSize:'14px'}}>⋯</span>
          </div>
        </div>
      </div>

      {/* Action strip */}
      <div style={{maxHeight:revealed?`${ACTION_H}px`:'0px',overflow:'hidden',transition:'max-height 0.28s cubic-bezier(0.22,1,0.36,1)',borderRadius:'0 0 22px 22px'}}>
        <button
          onClick={(e)=>{e.stopPropagation();onView(coach.slug||coach.id);}}
          style={{width:'100%',height:`${ACTION_H}px`,border:'none',background:`linear-gradient(100deg,${GREEN_DARK},${GREEN},${GREEN_LIGHT})`,color:'#0a1a00',display:'flex',alignItems:'center',justifyContent:'center',gap:'9px',fontSize:'13px',fontWeight:'800',cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.05em',textTransform:'uppercase',borderRadius:'0 0 22px 22px'}}>
          View Profile <span style={{fontSize:'17px'}}>→</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Animated headline ─── */
function AnimatedHeadline({text,delay=0}){
  const [vis,setVis]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),delay);return()=>clearTimeout(t);},[delay]);
  return (
    <span>
      {text.split(' ').map((w,i)=>(
        <span key={i} style={{display:'inline-block',opacity:vis?1:0,transform:vis?'translateY(0)':'translateY(28px)',transition:`opacity 0.65s ease ${i*90}ms,transform 0.65s cubic-bezier(0.22,1,0.36,1) ${i*90}ms`,marginRight:'0.26em'}}>{w}</span>
      ))}
    </span>
  );
}

/* ─── Scroll-reveal ─── */
function Reveal({children,delay=0,style={}}){
  const ref=useRef(null);
  const [vis,setVis]=useState(false);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);obs.disconnect();}},{threshold:0.1});
    obs.observe(el);
    return()=>obs.disconnect();
  },[]);
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?'translateY(0)':'translateY(28px)',transition:`opacity 0.7s ease ${delay}ms,transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,...style}}>
      {children}
    </div>
  );
}

/* ─── Single row carousel ─── */
function CoachRow({title,label,coaches,onView,bgDark=true}){
  const rowRef=useRef(null);
  const [canLeft,setCanLeft]=useState(false);
  const [canRight,setCanRight]=useState(false);
  const check=useCallback(()=>{
    const el=rowRef.current; if(!el) return;
    setCanLeft(el.scrollLeft>8);
    setCanRight(el.scrollLeft<el.scrollWidth-el.clientWidth-8);
  },[]);
  useEffect(()=>{
    const el=rowRef.current; if(!el) return;
    check();
    el.addEventListener('scroll',check,{passive:true});
    window.addEventListener('resize',check);
    return()=>{el.removeEventListener('scroll',check);window.removeEventListener('resize',check);};
  },[coaches,check]);
  const scroll=(dir)=>{
    const el=rowRef.current; if(!el) return;
    const cardW=el.querySelector('[data-coach-card]')?.offsetWidth||340;
    el.scrollBy({left:dir*(cardW+24),behavior:'smooth'});
  };
  if(!coaches||coaches.length===0) return null;
  const fadeColor=bgDark?NAVY:BEIGE;
  const headColor=bgDark?TEXT:TEXT_B;
  const labelColor=bgDark?GREEN:GREEN_DARK;
  const dimColor=bgDark?TEXT_DIM:TEXT_B_DIM;
  return (
    <Reveal>
      <div style={{marginBottom:'60px'}}>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'10px'}}>
          <div>
            {label && <div style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.18em',textTransform:'uppercase',color:labelColor,marginBottom:'4px'}}>{label}</div>}
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'22px',fontWeight:'800',color:headColor,margin:0}}>{title}</h3>
          </div>
        </div>
        <div style={{position:'relative'}}>
          {canLeft&&(
            <button onClick={()=>scroll(-1)} style={{position:'absolute',top:'42%',transform:'translateY(-50%)',left:'-22px',zIndex:20,width:'44px',height:'44px',borderRadius:'50%',background:bgDark?CARD_BG:'#fff',border:`1px solid ${GREEN}88`,color:GREEN,fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 20px rgba(200,255,0,0.2)`,transition:'all 0.18s'}}
              onMouseEnter={e=>{e.currentTarget.style.background=GREEN;e.currentTarget.style.color='#000';}}
              onMouseLeave={e=>{e.currentTarget.style.background=bgDark?CARD_BG:'#fff';e.currentTarget.style.color=GREEN;}}>‹</button>
          )}
          {canRight&&(
            <button onClick={()=>scroll(1)} style={{position:'absolute',top:'42%',transform:'translateY(-50%)',right:'-22px',zIndex:20,width:'44px',height:'44px',borderRadius:'50%',background:bgDark?CARD_BG:'#fff',border:`1px solid ${GREEN}88`,color:GREEN,fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 4px 20px rgba(200,255,0,0.2)`,transition:'all 0.18s'}}
              onMouseEnter={e=>{e.currentTarget.style.background=GREEN;e.currentTarget.style.color='#000';}}
              onMouseLeave={e=>{e.currentTarget.style.background=bgDark?CARD_BG:'#fff';e.currentTarget.style.color=GREEN;}}>›</button>
          )}
          {canLeft&&<div style={{position:'absolute',left:0,top:0,bottom:0,width:'70px',background:`linear-gradient(to right,${fadeColor},transparent)`,zIndex:10,pointerEvents:'none'}}/>}
          {canRight&&<div style={{position:'absolute',right:0,top:0,bottom:0,width:'70px',background:`linear-gradient(to left,${fadeColor},transparent)`,zIndex:10,pointerEvents:'none'}}/>}
          <div ref={rowRef} style={{display:'flex',gap:'24px',overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none',paddingBottom:'12px',paddingTop:'4px',paddingLeft:'2px',paddingRight:'2px'}}>
            {coaches.map((coach,i)=>(
              <div key={coach.id} data-coach-card="" style={{flex:'0 0 calc(28% - 16px)',minWidth:'280px',maxWidth:'400px',scrollSnapAlign:'start'}}>
                <CoachCard coach={coach} onView={onView} delay={i*50}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ─── Motivational ticker ─── */
const MOTIVATIONAL_WORDS=[
  'Stronger every day',
  'Discipline beats motivation',
  'Your coach is waiting',
  'Progress, not perfection',
  'Show up for yourself',
  'Train smart. Grow fast.',
  'Consistency is the win',
  'No excuses, just reps',
];
function MotivationalTicker(){
  const items=[...MOTIVATIONAL_WORDS,...MOTIVATIONAL_WORDS];
  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {items.map((word,i)=>(
          <span key={i} className="ticker-item">
            {word}
            <span className="ticker-dot">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function Home(){
  const navigate=useNavigate();
  const [categories,setCategories]=useState([]);
  const [topCoaches,setTopCoaches]=useState([]);
  const [coachesByCat,setCoachesByCat]=useState({});
  const [allCoaches,setAllCoaches]=useState([]);
  const [activeFilter,setActiveFilter]=useState('all');
  const [searchQuery,setSearchQuery]=useState('');
  const [searchFocus,setSearchFocus]=useState(false);
  const [loading,setLoading]=useState(true);
  const [legalModal,setLegalModal]=useState(null);
  const [videoLoaded,setVideoLoaded]=useState(false);
  const videoRef=useRef(null);

  /* ── fonts & keyframes ── */
  useEffect(()=>{
    const id='coachly-v20';
    if(document.getElementById(id)) return;
    const s=document.createElement('style'); s.id=id;
    s.textContent=`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Inter:wght@300;400;500;600;700&display=swap');
      @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      @keyframes bgWave{
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      @keyframes waveX{
        0%  {transform:translateX(-30%) scaleY(1)}
        25% {transform:translateX(-15%) scaleY(1.04)}
        50% {transform:translateX(0%)   scaleY(0.97)}
        75% {transform:translateX(-15%) scaleY(1.03)}
        100%{transform:translateX(-30%) scaleY(1)}
      }
      @keyframes waveX2{
        0%  {transform:translateX(0%)   scaleY(1.02)}
        33% {transform:translateX(-20%) scaleY(0.96)}
        66% {transform:translateX(-10%) scaleY(1.04)}
        100%{transform:translateX(0%)   scaleY(1.02)}
      }
      @keyframes orbDrift{
        0%,100%{transform:translate(0,0) scale(1)}
        50%{transform:translate(22px,-28px) scale(1.07)}
      }
      @keyframes orbDrift2{
        0%,100%{transform:translate(0,0) scale(1)}
        50%{transform:translate(-18px,20px) scale(0.94)}
      }
      *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
      button{outline:none;-webkit-tap-highlight-color:transparent}
      ::-webkit-scrollbar{display:none}
      .gshimmer{
        background:linear-gradient(90deg,${GREEN},${GREEN_LIGHT},${GREEN},${GREEN_DARK});
        background-size:200% auto;
        -webkit-background-clip:text;
        -webkit-text-fill-color:transparent;
        background-clip:text;
        animation:shimmer 4s linear infinite
      }
      .nav-wave{
        position:absolute;inset:0;
        background: linear-gradient(270deg,rgba(200,255,0,0.07),rgba(249,115,22,0.05),rgba(200,255,0,0.04),rgba(59,130,246,0.05),rgba(200,255,0,0.07));
        background-size: 400% 400%;
        animation: bgWave 14s ease infinite;
        pointer-events:none;z-index:0;
      }
      .hero-wave-bg{
        position:absolute;inset:0;
        background: linear-gradient(270deg,#0B1528,#0d1f10,#1a1208,#0B1528,#0a1520,#0B1528);
        background-size: 600% 600%;
        animation: bgWave 20s ease infinite;
        z-index:0;
      }
      .coaches-wave-bg{
        position:absolute;inset:0;
        background: linear-gradient(270deg,#0B1528,#0e1f14,#161008,#0c1426,#0B1528);
        background-size: 500% 500%;
        animation: bgWave 18s ease infinite;
        z-index:0;
      }

      /* How It Works + CTA share one continuous animated gradient — no separation */
      .light-sections-wrap{
        position:relative;
        background: linear-gradient(
          270deg,
          #e8f5c8,
          #f5d9b0,
          #f0eecc,
          #fde8cc,
          #dff5b0,
          #f5d9b0
        );
        background-size: 600% 600%;
        animation: bgWave 20s ease infinite;
      }

      /* wave overlay tint on top of the shared gradient */
      .light-wave-overlay{
        position:absolute;inset:0;
        background: linear-gradient(270deg,rgba(200,255,0,0.12),rgba(249,115,22,0.10),rgba(200,255,0,0.08),rgba(249,115,22,0.12));
        background-size: 500% 500%;
        animation: bgWave 15s ease infinite reverse;
        pointer-events:none;z-index:0;
      }

      .ticker-bar{
        position:relative;overflow:hidden;
        background: linear-gradient(270deg,${GREEN_DARK},${ORANGE},${GREEN},${GREEN_DARK});
        background-size:400% 400%;
        animation: bgWave 10s ease infinite;
        padding:16px 0;
      }
      .ticker-track{
        display:flex;width:max-content;
        animation:tickerScroll 32s linear infinite;
      }
      .ticker-track:hover{animation-play-state:paused}
      @keyframes tickerScroll{
        0%{transform:translateX(0)}
        100%{transform:translateX(-50%)}
      }
      .ticker-item{
        display:flex;align-items:center;gap:10px;
        padding:0 32px;white-space:nowrap;
        font-size:14px;font-weight:700;letter-spacing:0.04em;
        color:#0a1a00;
        font-family:'Playfair Display',serif;
      }
      .ticker-dot{font-size:10px;color:rgba(10,26,0,0.45)}

      @media(max-width:1100px){[data-coach-card]{flex:0 0 calc(40% - 16px)!important}}
      @media(max-width:750px){
        [data-coach-card]{flex:0 0 calc(72% - 16px)!important;min-width:250px!important}
        .hero-h1{font-size:36px!important;line-height:1.08!important}
        .sec-pad{padding:60px 20px!important}
        .how-grid{grid-template-columns:1fr!important}
        .hide-mob{display:none!important}
        .footer-row{flex-direction:column!important;align-items:center!important;text-align:center!important}
        .nav-inner{padding:0 16px!important}
        .pill-bar{gap:6px!important}
        .search-filter-wrap{flex-direction:column!important;align-items:stretch!important;gap:12px!important;}
        .search-box{min-width:0!important;max-width:100%!important;width:100%!important;}
        .pill-bar{flex-wrap:wrap!important;width:100%!important;}
      }
      @media(max-width:480px){
        [data-coach-card]{flex:0 0 86vw!important;min-width:0!important}
        .hero-h1{font-size:28px!important}
        .sec-pad{padding:44px 14px!important}
        .nav-inner{padding:0 12px!important}
        .pill-bar button{font-size:12px!important;padding:7px 14px!important}
      }
    `;
    document.head.appendChild(s);
  },[]);

  /* ── load data ── */
  useEffect(()=>{
    setLoading(true);
    Promise.all([
      getCategories().catch(()=>[]),
      (getRankedCoaches ? getRankedCoaches() : getCoaches()).catch(()=>[])
    ]).then(([cats,coaches])=>{
      const sorted=[...coaches].sort((a,b)=>rankScore(b)-rankScore(a));
      setCategories(cats.slice(0,8));
      setTopCoaches(sorted.slice(0,10));
      setAllCoaches(sorted);
      const map={};
      cats.slice(0,8).forEach(cat=>{
        map[cat.slug]=sorted.filter(c=>c.category_slug===cat.slug||(c.category_name||'').toLowerCase()===cat.name.toLowerCase()).slice(0,8);
      });
      setCoachesByCat(map);
    })
    .catch(()=>showToast('Failed to load coaches','error'))
    .finally(()=>setLoading(false));
  },[]);

  /* ── filter+search ── */
  const filteredCoaches=allCoaches
    .filter(c=>{
      if(activeFilter!=='all'&&c.category_slug!==activeFilter&&(c.category_name||'').toLowerCase()!==activeFilter) return false;
      if(searchQuery.trim()){
        const q=searchQuery.toLowerCase();
        return `${c.name} ${c.bio} ${c.tagline} ${c.location} ${c.specialties} ${c.category_name}`.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a,b)=>rankScore(b)-rankScore(a))
    .slice(0,50);

  const token=localStorage.getItem('coachly_token');
  const tokenType=localStorage.getItem('coachly_token_type');
  const isFiltering=activeFilter!=='all'||searchQuery.trim()!=='';

  const makePill=(active)=>({
    padding:'8px 20px',borderRadius:'100px',
    border:`1.5px solid ${active?GREEN:'rgba(255,255,255,0.12)'}`,
    background:active?GREEN:'transparent',
    color:active?'#0a1a00':TEXT_DIM,
    fontFamily:'inherit',fontSize:'13px',fontWeight:'600',cursor:'pointer',
    transition:'all 0.18s',letterSpacing:'0.02em',whiteSpace:'nowrap',
  });

  return (
    <div style={{position:'relative',minHeight:'100vh',color:TEXT,fontFamily:"'Inter',system-ui,sans-serif",overflowX:'hidden'}}>
      <Toast/>
      {legalModal&&<LegalModal type={legalModal} onClose={()=>setLegalModal(null)}/>}

      {/* ══ NAVBAR ══ */}
      <header style={{position:'fixed',top:0,left:0,right:0,zIndex:100,height:'66px',background:'rgba(8,14,28,0.93)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
        <div className="nav-wave"/>
        <div className="nav-inner" style={{maxWidth:'1440px',margin:'0 auto',height:'100%',padding:'0 40px',display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',position:'relative',zIndex:1}}>
          <div>
            <button className="hide-mob" onClick={()=>navigate('/coach/signup')}
              style={{background:'none',border:'none',fontFamily:'inherit',fontSize:'13px',color:TEXT_DIM,cursor:'pointer',padding:'8px 0',transition:'color 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.color=GREEN_LIGHT}
              onMouseLeave={e=>e.currentTarget.style.color=TEXT_DIM}>For coaches</button>
          </div>
          <div onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} style={{cursor:'pointer',textAlign:'center'}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontWeight:'900',fontSize:'22px',color:'#F1EDE6',letterSpacing:'0.12em'}}>
              COACHLY<span style={{color:GREEN}}>.</span>
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',justifyContent:'flex-end'}}>
            {token&&tokenType==='user'?(
              <button onClick={()=>navigate('/dashboard')} style={{padding:'9px 22px',borderRadius:'100px',background:GREEN,color:'#0a1a00',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>Dashboard</button>
            ):token&&tokenType==='coach'?(
              <button onClick={()=>navigate('/coach/dashboard')} style={{padding:'9px 22px',borderRadius:'100px',background:GREEN,color:'#0a1a00',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>Coach dashboard</button>
            ):(<>
              <button onClick={()=>navigate('/user/login')}
                style={{padding:'9px 20px',borderRadius:'100px',border:'1px solid rgba(255,255,255,0.14)',background:'transparent',fontFamily:'inherit',fontSize:'13px',color:TEXT_DIM,cursor:'pointer',transition:'all 0.18s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.35)';e.currentTarget.style.color='#fff';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.14)';e.currentTarget.style.color=TEXT_DIM;}}>Log in</button>
              <button onClick={()=>navigate('/user/login')}
                style={{padding:'9px 22px',borderRadius:'100px',background:`linear-gradient(135deg,${GREEN_DARK},${GREEN})`,color:'#0a1a00',border:'none',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',cursor:'pointer',boxShadow:`0 4px 18px ${GREEN}44`,transition:'all 0.18s'}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 6px 28px ${GREEN}66`;e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow=`0 4px 18px ${GREEN}44`;e.currentTarget.style.transform='none';}}>Get started</button>
            </>)}
          </div>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section style={{position:'relative',height:'100vh',minHeight:'600px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        <div className="hero-wave-bg"/>
        <video
  ref={videoRef}
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  webkit-playsinline="true" onLoadedData={()=>setVideoLoaded(true)}
onCanPlay={()=>setVideoLoaded(true)}
          style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.32,transition:'opacity 1.5s ease',zIndex:1}}>
          <source src="https://bdtmcsyownhzpogzoljl.supabase.co/storage/v1/object/public/videos/WhatsApp%20Video%202026-06-23%20at%2012.12.24%20(1).mp4" type="video/mp4"/>
          <source src="https://bdtmcsyownhzpogzoljl.supabase.co/storage/v1/object/public/videos/WhatsApp%20Video%202026-06-23%20at%2012.12.24%20(1).mp4" type="video/mp4"/>
        </video>
        <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:2}}>
          <div style={{position:'absolute',top:'-20%',left:'-10%',width:'160%',height:'70%',background:`radial-gradient(ellipse 60% 55% at 35% 50%,${GREEN}14 0%,transparent 65%)`,animation:'waveX 18s ease-in-out infinite'}}/>
          <div style={{position:'absolute',bottom:'-20%',right:'-15%',width:'140%',height:'65%',background:`radial-gradient(ellipse 55% 50% at 65% 50%,${ORANGE}0E 0%,transparent 65%)`,animation:'waveX2 22s ease-in-out infinite'}}/>
        </div>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(6,13,26,0.15) 0%,rgba(6,13,26,0) 40%,rgba(11,21,40,1) 100%)',zIndex:3}}/>
        <div style={{position:'relative',zIndex:4,textAlign:'center',padding:'0 24px',maxWidth:'860px',margin:'0 auto'}}>
          <div style={{animation:'fadeUp 0.5s ease both',fontSize:'11px',fontWeight:'700',letterSpacing:'0.22em',textTransform:'uppercase',color:GREEN,marginBottom:'20px'}}>Every Sport · Every Level · Any Goal</div>
          <h1 className="hero-h1" style={{fontFamily:"'Playfair Display',serif",fontSize:'68px',fontWeight:'900',lineHeight:'1.05',color:'#F1F5F9',margin:0,letterSpacing:'-0.02em'}}>
            <AnimatedHeadline text="Find your coach." delay={200}/>
            <br/>
            <span className="gshimmer" style={{fontStyle:'italic'}}><AnimatedHeadline text="Any sport. 24/7." delay={440}/></span>
          </h1>
          <p style={{animation:'fadeUp 0.6s ease 0.8s both',fontSize:'16px',color:'rgba(241,245,249,0.45)',lineHeight:'1.8',fontWeight:'300',maxWidth:'460px',margin:'20px auto 40px'}}>
            Real coaches across every discipline — each with their own AI assistant to support you between sessions.
          </p>
          <div style={{animation:'fadeUp 0.6s ease 1s both',display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>document.getElementById('coaches-section')?.scrollIntoView({behavior:'smooth'})}
              style={{padding:'15px 38px',borderRadius:'100px',background:`linear-gradient(135deg,${GREEN_DARK},${GREEN})`,color:'#0a1a00',border:'none',fontFamily:'inherit',fontSize:'15px',fontWeight:'700',cursor:'pointer',boxShadow:`0 6px 32px ${GREEN}55`,transition:'all 0.22s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 10px 48px ${GREEN}77`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=`0 6px 32px ${GREEN}55`;}}>Find a coach</button>
            <button onClick={()=>navigate('/coach/signup')}
              style={{padding:'15px 38px',borderRadius:'100px',border:'1.5px solid rgba(241,245,249,0.28)',background:'rgba(241,245,249,0.07)',fontFamily:'inherit',fontSize:'15px',fontWeight:'500',cursor:'pointer',color:'rgba(241,245,249,0.8)',backdropFilter:'blur(8px)',transition:'all 0.22s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(241,245,249,0.55)';e.currentTarget.style.background='rgba(241,245,249,0.13)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(241,245,249,0.28)';e.currentTarget.style.background='rgba(241,245,249,0.07)';}}>Become a coach</button>
          </div>
        </div>
        <div style={{position:'absolute',bottom:'28px',left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',animation:'fadeUp 0.6s ease 1.4s both',zIndex:4}}>
          <span style={{fontSize:'10px',letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(255,255,255,0.2)'}}>Scroll</span>
          <div style={{width:'1px',height:'32px',background:`linear-gradient(to bottom,${GREEN},transparent)`,animation:'pulse 2s ease infinite'}}/>
        </div>
      </section>

      {/* ══ COACHES SECTION ══ */}
      <section id="coaches-section" style={{background:NAVY,position:'relative',overflow:'hidden'}}>
        <div className="coaches-wave-bg"/>
        <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:1}}>
          <div style={{position:'absolute',top:'-30%',right:'-20%',width:'120%',height:'80%',background:`radial-gradient(ellipse 50% 60% at 70% 40%,${GREEN}09 0%,transparent 65%)`,animation:'waveX2 20s ease-in-out infinite'}}/>
          <div style={{position:'absolute',bottom:'-30%',left:'-20%',width:'120%',height:'80%',background:`radial-gradient(ellipse 55% 55% at 30% 60%,${ORANGE}06 0%,transparent 65%)`,animation:'waveX 25s ease-in-out infinite'}}/>
        </div>
        <div className="sec-pad" style={{padding:'60px 52px 80px',maxWidth:'1440px',margin:'0 auto',position:'relative',zIndex:2}}>
          <Reveal>
            <div className="search-filter-wrap" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'16px',marginBottom:'32px'}}>
              <div className="search-box" style={{position:'relative',flex:'0 0 auto',minWidth:'260px',maxWidth:'400px'}}>
                <div style={{position:'absolute',left:'16px',top:'50%',transform:'translateY(-50%)',color:searchFocus?GREEN:TEXT_FAINT,transition:'color 0.2s',pointerEvents:'none'}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search coaches..."
                  value={searchQuery}
                  onChange={e=>setSearchQuery(e.target.value)}
                  onFocus={()=>setSearchFocus(true)}
                  onBlur={()=>setSearchFocus(false)}
                  style={{width:'100%',padding:'11px 40px 11px 42px',borderRadius:'100px',border:`1.5px solid ${searchFocus?GREEN:'rgba(255,255,255,0.1)'}`,background:'rgba(255,255,255,0.05)',color:TEXT,fontFamily:'inherit',fontSize:'13px',outline:'none',transition:'all 0.2s',boxShadow:searchFocus?`0 0 0 3px ${GREEN}22`:'none'}}
                />
                {searchQuery&&<button onClick={()=>setSearchQuery('')} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:TEXT_FAINT,cursor:'pointer',fontSize:'18px',lineHeight:1,padding:'2px'}}>×</button>}
              </div>
              {!loading&&categories.length>0&&(
                <div className="pill-bar" style={{display:'flex',flexWrap:'wrap',gap:'8px',flex:1}}>
                  <button onClick={()=>setActiveFilter('all')} style={makePill(activeFilter==='all')}
                    onMouseEnter={e=>{if(activeFilter!=='all'){e.currentTarget.style.borderColor=GREEN;e.currentTarget.style.color=GREEN;}}}
                    onMouseLeave={e=>{if(activeFilter!=='all'){e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.color=TEXT_DIM;}}}>All</button>
                  {categories.map(cat=>(
                    <button key={cat.id} onClick={()=>setActiveFilter(cat.slug)} style={makePill(activeFilter===cat.slug)}
                      onMouseEnter={e=>{if(activeFilter!==cat.slug){e.currentTarget.style.borderColor=GREEN;e.currentTarget.style.color=GREEN;}}}
                      onMouseLeave={e=>{if(activeFilter!==cat.slug){e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.color=TEXT_DIM;}}}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          {loading ? (
            <div style={{display:'flex',gap:'24px'}}>
              {[1,2,3].map(i=><div key={i} style={{flex:'0 0 calc(28% - 16px)',minWidth:'280px'}}><LoadingSkeleton type="card"/></div>)}
            </div>
          ) : isFiltering ? (
            filteredCoaches.length>0 ? (
              <CoachRow
                title={activeFilter==='all'?`Results for "${searchQuery}"`:categories.find(c=>c.slug===activeFilter)?.name||activeFilter}
                coaches={filteredCoaches}
                onView={id=>navigate(`/coach/${id}`)}
                bgDark={true}
              />
            ) : (
              <Reveal>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'70px 24px',background:'rgba(255,255,255,0.03)',border:`1px solid ${BORDER}`,borderRadius:'24px'}}>
                  <div style={{width:'64px',height:'64px',borderRadius:'50%',background:`${GREEN}14`,border:`1px solid ${GREEN}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',marginBottom:'18px'}}>🔍</div>
                  <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'20px',fontWeight:'700',color:TEXT,margin:'0 0 8px'}}>No coaches yet</h3>
                  <p style={{fontSize:'13px',color:TEXT_DIM,maxWidth:'360px',margin:0,lineHeight:'1.7'}}>
                    {searchQuery.trim()
                      ? `We couldn't find any coaches matching "${searchQuery}".`
                      : `There aren't any coaches in ${activeFilter==='all'?'this category':(categories.find(c=>c.slug===activeFilter)?.name||activeFilter)} yet — check back soon.`}
                  </p>
                </div>
              </Reveal>
            )
          ) : (
            topCoaches.length===0 ? (
              <Reveal>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'70px 24px',background:'rgba(255,255,255,0.03)',border:`1px solid ${BORDER}`,borderRadius:'24px'}}>
                  <div style={{width:'64px',height:'64px',borderRadius:'50%',background:`${GREEN}14`,border:`1px solid ${GREEN}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px',marginBottom:'18px'}}>🔍</div>
                  <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'20px',fontWeight:'700',color:TEXT,margin:'0 0 8px'}}>No coaches yet</h3>
                  <p style={{fontSize:'13px',color:TEXT_DIM,maxWidth:'360px',margin:0,lineHeight:'1.7'}}>We're still onboarding coaches — check back soon.</p>
                </div>
              </Reveal>
            ) : (<>
              <CoachRow title="Featured coaches" label="Top rated" coaches={topCoaches} onView={id=>navigate(`/coach/${id}`)} bgDark={true}/>
              {categories.map(cat=>(
                coachesByCat[cat.slug]?.length>0 && (
                  <CoachRow key={cat.id} title={cat.name} coaches={coachesByCat[cat.slug]} onView={id=>navigate(`/coach/${id}`)} bgDark={true}/>
                )
              ))}
            </>)
          )}
        </div>
      </section>

      {/* ══ MOTIVATIONAL TICKER ══ */}
      <MotivationalTicker/>

      {/* ══ HOW IT WORKS + CTA — single seamless animated wrapper ══ */}
      <div className="light-sections-wrap">
        <div className="light-wave-overlay"/>

        {/* HOW IT WORKS */}
        <section style={{position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
            <div style={{position:'absolute',top:'-40%',left:'-15%',width:'130%',height:'80%',background:`radial-gradient(ellipse 55% 55% at 40% 50%,${GREEN}0C 0%,transparent 65%)`,animation:'waveX 19s ease-in-out infinite'}}/>
            <div style={{position:'absolute',bottom:'-30%',right:'-15%',width:'110%',height:'70%',background:`radial-gradient(ellipse 50% 55% at 60% 55%,${ORANGE}0D 0%,transparent 65%)`,animation:'waveX2 24s ease-in-out infinite'}}/>
          </div>
          <div className="sec-pad" style={{padding:'80px 52px 100px',maxWidth:'980px',margin:'0 auto',position:'relative',zIndex:1}}>
            <Reveal>
              <div style={{textAlign:'center',marginBottom:'56px'}}>
                <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.18em',textTransform:'uppercase',color:ORANGE,marginBottom:'12px'}}>How it works</div>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(24px,3vw,40px)',fontWeight:'800',color:TEXT_B,margin:0}}>
                  Coaching, <span style={{fontStyle:'italic',color:GREEN_DARK}}>reimagined.</span>
                </h2>
              </div>
            </Reveal>
            <div className="how-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'3px',borderRadius:'22px',overflow:'hidden',boxShadow:'0 8px 48px rgba(0,0,0,0.09)'}}>
              {[
                {label:'Subscribe',color:GREEN_DARK,num:'01',title:'Choose your coach',body:'Browse real coaches across every sport and discipline. Pick the program built for your goals and subscribe monthly.'},
                {label:'Train',color:ORANGE,num:'02',title:'Get your plan + AI helper',body:'Each coach sets you a custom training plan and a built-in AI assistant for quick questions between sessions.'},
                {label:'Grow',color:GREEN_DARK,num:'03',title:'Track your progress',body:'Weekly reviews, direct coach messaging, and real progress tracking. Your coach adjusts your plan as you improve.'},
              ].map((step,i)=>(
                <Reveal key={i} delay={i*110} style={{display:'contents'}}>
                  <div style={{background:'rgba(255,255,255,0.6)',padding:'44px 30px',position:'relative',overflow:'hidden',transition:'background 0.22s,transform 0.22s',cursor:'default'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.88)';e.currentTarget.style.transform='translateY(-3px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.6)';e.currentTarget.style.transform='none';}}>
                    <div style={{position:'absolute',top:'8px',right:'12px',fontFamily:"'Playfair Display',serif",fontSize:'72px',fontWeight:'900',color:'rgba(0,0,0,0.04)',lineHeight:1,userSelect:'none'}}>{step.num}</div>
                    <div style={{width:'36px',height:'3px',borderRadius:'2px',background:step.color,marginBottom:'20px'}}/>
                    <div style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:step.color,marginBottom:'14px'}}>{step.label}</div>
                    <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'19px',fontWeight:'700',color:TEXT_B,marginBottom:'14px',lineHeight:'1.3'}}>{step.title}</h3>
                    <p style={{fontSize:'13px',color:TEXT_B_DIM,lineHeight:'1.85',margin:0}}>{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — no top border, flows directly from How It Works */}
        <section style={{position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
            <div style={{position:'absolute',top:'-50%',left:'-10%',width:'120%',height:'100%',background:`radial-gradient(ellipse 60% 55% at 45% 55%,${ORANGE}12 0%,transparent 65%)`,animation:'waveX 16s ease-in-out infinite'}}/>
            <div style={{position:'absolute',top:'-30%',right:'-20%',width:'100%',height:'90%',background:`radial-gradient(ellipse 50% 50% at 65% 45%,${GREEN}0C 0%,transparent 65%)`,animation:'waveX2 21s ease-in-out infinite'}}/>
          </div>
          <div className="sec-pad" style={{padding:'110px 52px',textAlign:'center',position:'relative',zIndex:1,maxWidth:'580px',margin:'0 auto'}}>
            <Reveal>
              <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.18em',textTransform:'uppercase',color:ORANGE,marginBottom:'18px'}}>Start today</div>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(28px,5vw,52px)',fontWeight:'900',color:TEXT_B,lineHeight:'1.1',marginBottom:'18px'}}>
                Ready to find<br/><span style={{fontStyle:'italic',color:GREEN_DARK}}>your coach?</span>
              </h2>
              <p style={{fontSize:'15px',color:TEXT_B_DIM,marginBottom:'40px',lineHeight:'1.8',fontWeight:'300'}}>
                Athletes everywhere are already training smarter. Your coach is waiting.
              </p>
              <div style={{display:'flex',gap:'14px',justifyContent:'center',flexWrap:'wrap'}}>
                <button onClick={()=>document.getElementById('coaches-section')?.scrollIntoView({behavior:'smooth'})}
                  style={{padding:'15px 44px',borderRadius:'100px',background:`linear-gradient(135deg,${GREEN_DARK},${GREEN})`,color:'#0a1a00',border:'none',fontFamily:'inherit',fontSize:'15px',fontWeight:'700',cursor:'pointer',boxShadow:`0 6px 32px ${GREEN}44`,transition:'all 0.22s'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 10px 44px ${GREEN}66`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=`0 6px 32px ${GREEN}44`;}}>Browse coaches</button>
                <button onClick={()=>navigate('/coach/signup')}
                  style={{padding:'15px 44px',borderRadius:'100px',border:'1.5px solid rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.45)',fontFamily:'inherit',fontSize:'15px',fontWeight:'600',cursor:'pointer',color:TEXT_B_DIM,transition:'all 0.22s',backdropFilter:'blur(8px)'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=ORANGE;e.currentTarget.style.color=ORANGE;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,0,0,0.1)';e.currentTarget.style.color=TEXT_B_DIM;}}>Become a coach</button>
              </div>
            </Reveal>
          </div>
        </section>
      </div>{/* end light-sections-wrap */}

      {/* ══ FOOTER ══ */}
      <footer style={{padding:'24px 52px',borderTop:`1px solid ${BORDER}`,background:NAVY,position:'relative',zIndex:1}}>
        <div className="footer-row" style={{maxWidth:'1440px',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'14px'}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontWeight:'900',fontSize:'17px',color:TEXT,letterSpacing:'0.1em'}}>COACHLY<span style={{color:GREEN}}>.</span></span>
          <div style={{display:'flex',gap:'24px',alignItems:'center'}}>
            {[['For coaches',()=>navigate('/coach/signup')],['Terms',()=>setLegalModal('terms')],['Privacy',()=>setLegalModal('privacy')]].map(([label,fn])=>(
              <button key={label} onClick={fn} style={{background:'none',border:'none',fontFamily:'inherit',fontSize:'13px',color:TEXT_DIM,cursor:'pointer',transition:'color 0.18s'}}
                onMouseEnter={e=>e.currentTarget.style.color=GREEN_LIGHT}
                onMouseLeave={e=>e.currentTarget.style.color=TEXT_DIM}>{label}</button>
            ))}
          </div>
          <div style={{fontSize:'12px',color:TEXT_FAINT}}>© {new Date().getFullYear()} Coachly</div>
        </div>
      </footer>
    </div>
  );
}