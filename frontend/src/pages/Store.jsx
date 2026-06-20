import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCoach,
  getPublicPosts,
  createSubscription,
  getUserMe,
  userSignup,
  userLogin,
  saveToken,
} from '../api';
import Toast, { showToast } from '../components/Toast';
import LoadingSkeleton from '../components/LoadingSkeleton';

// ─── helpers ────────────────────────────────────────────────────
const AVATAR_COLORS = ['#E8633A','#2a7a4f','#5a5ac8','#c94e2a','#2d6b47','#8b5cf6','#0891b2'];
function avatarColor(id) {
  if (!id) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}
function fmt(n) { return n ? new Intl.NumberFormat().format(n) : '0'; }
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Auth Modal ──────────────────────────────────────────────────
function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (mode === 'signup') {
        if (!form.name || !form.email || !form.password) throw new Error('All fields required');
        res = await userSignup({ name: form.name, email: form.email, password: form.password });
      } else {
        res = await userLogin(form.email, form.password);
      }
      saveToken(res.token, 'user');
      onSuccess(res.user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>
          {mode === 'signup' ? 'Join now' : 'Welcome back'}
        </div>
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          {mode === 'signup' ? 'Create your account to subscribe.' : 'Log in to continue.'}
        </div>
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: '14px' }}>
              <input className="input" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} required style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #e5e5e5', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}
          <div style={{ marginBottom: '14px' }}>
            <input className="input" type="email" placeholder="Email address" value={form.email} onChange={e => set('email', e.target.value)} required style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #e5e5e5', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <input className="input" type="password" placeholder="Password" value={form.password} onChange={e => set('password', e.target.value)} required style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #e5e5e5', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: '#111', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: '#888' }}>
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <span style={{ color: '#111', cursor: 'pointer', fontWeight: '700' }} onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Intake Modal ────────────────────────────────────────────────
function IntakeModal({ coach, planMonths, planPrice, onClose, onDone }) {
  const [form, setForm] = useState({ goal: '', weight: '', calorie_target: '', food_restrictions: '', injuries: '' });
  const [loading, setLoading] = useState(false);
  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createSubscription(coach.id, planMonths, planPrice, form);
      onDone(result?.subscription?.id || result?.id);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px', overflowY: 'auto', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '480px', margin: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>Tell {coach.name?.split(' ')[0]} about yourself</div>
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>This helps personalise your plan from day one.</div>
        <form onSubmit={submit}>
          {[
            { key: 'goal', label: 'Your main goal *', placeholder: 'e.g. Lose 10kg, build muscle, run a marathon…' },
            { key: 'weight', label: 'Current weight', placeholder: 'e.g. 85kg' },
            { key: 'calorie_target', label: 'Daily calorie target', placeholder: 'e.g. 2200' },
            { key: 'food_restrictions', label: 'Food restrictions / allergies', placeholder: 'e.g. Vegetarian, lactose intolerant…' },
            { key: 'injuries', label: 'Injuries or limitations', placeholder: 'e.g. Lower back pain, knee surgery…' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#555', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
              <input className="input" placeholder={placeholder} value={form[key]} onChange={e => set(key, e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e5e5e5', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: '#111', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Subscribing…' : `Subscribe — ${planMonths} months${planPrice ? ` · $${planPrice}` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Store ──────────────────────────────────────────────────
function TestimonialsCarousel({ testimonials, accentColor }) {
  const [current, setCurrent] = useState(0);
  const colors = ['#111', '#1a1a2e', '#0f2027', '#16213e', '#1b1b2f'];

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % testimonials.length), 3500);
    return () => clearInterval(t);
  }, [testimonials.length]);

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '16px' }}>What clients say</div>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '20px' }}>
        <div style={{ display: 'flex', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)', transform: `translateX(-${current * 100}%)` }}>
          {testimonials.map((t, i) => (
            <div key={i} style={{ minWidth: '100%', background: colors[i % colors.length], borderRadius: '20px', padding: '32px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', left: '20px', fontSize: '120px', color: accentColor, opacity: 0.15, fontFamily: 'Georgia', lineHeight: 1 }}>"</div>
              <div style={{ fontSize: '13px', color: accentColor, fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>★★★★★</div>
              <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#fff', margin: '0 0 20px', fontStyle: 'italic', position: 'relative', zIndex: 1 }}>"{t.text}"</p>
              <div style={{ fontSize: '13px', fontWeight: '700', color: accentColor }}>— {t.name}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
        {testimonials.map((_, i) => (
          <div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? '20px' : '6px', height: '6px', borderRadius: '100px', background: i === current ? accentColor : '#ddd', cursor: 'pointer', transition: 'all 0.3s' }} />
        ))}
      </div>
    </div>
  );
}
function StarRating({ coachId, accentColor, onRated }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/review?coachId=${coachId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` }
    }).then(r => r.json()).then(d => { if (d.rating) { setRating(d.rating); setSubmitted(true); } }).catch(() => {});
  }, [coachId]);

  async function submit(val) {
    setRating(val);
    setSubmitted(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
        body: JSON.stringify({ coachId, rating: val }),
      });
      const d = await r.json();
      if (d.avg) onRated(d.avg);
      showToast('Thanks for your rating!', 'success');
    } catch { showToast('Failed to submit', 'error'); }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '16px', padding: '18px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>Rate this coach</div>
        <div style={{ fontSize: '12px', color: '#888' }}>{submitted ? `You rated ${rating} star${rating > 1 ? 's' : ''}` : 'Tap a star to rate'}</div>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1,2,3,4,5].map(star => (
          <span key={star}
            onMouseEnter={() => !submitted && setHover(star)}
            onMouseLeave={() => !submitted && setHover(0)}
            onClick={() => !submitted && submit(star)}
            style={{ fontSize: '28px', cursor: submitted ? 'default' : 'pointer', color: star <= (hover || rating) ? accentColor : '#ddd', transition: 'color 0.15s' }}>★</span>
        ))}
      </div>
    </div>
  );
}
function PaymentModal({ subId, coach, onClose, onPaid }) {
  const [proofBase64, setProofBase64] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const accentColor = coach.store_color || '#C8FF00';
  const isDark = accentColor === '#C8FF00' || accentColor === '#ffffff';

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProofBase64(reader.result);
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!proofBase64) return;
    setUploading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/user/submit-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
        body: JSON.stringify({ subscriptionId: subId, proofBase64 }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      onPaid();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '460px', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>Complete your payment</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>Pay {coach.name?.split(' ')[0]} directly, then upload your proof below.</div>

        {/* Payment details */}
        <div style={{ background: '#f8f7f4', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: '12px' }}>Payment details</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ background: accentColor, color: isDark ? '#111' : '#fff', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '100px' }}>{coach.payment_method}</div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#111', marginBottom: '8px', wordBreak: 'break-all' }}>{coach.payment_details}</div>
          {coach.payment_instructions && (
            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', borderTop: '1px solid #e5e5e5', paddingTop: '10px', marginTop: '8px' }}>{coach.payment_instructions}</div>
          )}
        </div>

        {/* Proof upload */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#111', marginBottom: '8px' }}>Upload payment screenshot</div>
          <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #ddd', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: proofBase64 ? '#f8f7f4' : '#fff' }}>
            {proofBase64
              ? <img src={proofBase64} alt="proof" style={{ maxHeight: '140px', borderRadius: '8px', objectFit: 'contain' }} />
              : <div style={{ color: '#aaa', fontSize: '13px' }}>Tap to upload screenshot</div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>

        <button onClick={submit} disabled={!proofBase64 || uploading} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: proofBase64 ? accentColor : '#e5e5e5', color: proofBase64 ? (isDark ? '#111' : '#fff') : '#aaa', fontSize: '15px', fontWeight: '800', cursor: proofBase64 ? 'pointer' : 'default', fontFamily: 'inherit', marginBottom: '12px' }}>
          {uploading ? 'Submitting…' : 'Submit proof — awaiting approval'}
        </button>
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#aaa' }}>Your coach will review and approve your access within 24–48h.</div>
      </div>
    </div>
  );
}

export default function Store() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coach, setCoach] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planMonths, setPlanMonths] = useState(3);
  const [showAuth, setShowAuth] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [alreadySubbed, setAlreadySubbed] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [coachRating, setCoachRating] = useState(null);

  useEffect(() => {
    setLoading(true);
    getCoach(id)
      .then(c => { setCoach(c); return getPublicPosts(c.id); })
      .then(setPosts)
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
    const token = localStorage.getItem('coachly_token');
    const tokenType = localStorage.getItem('coachly_token_type');
    if (token && tokenType === 'user') getUserMe().then(setCurrentUser).catch(() => {});
  }, [id]);

  function getPlanPrice(months) {
    if (!coach) return null;
    const base = parseFloat(coach.plan_price) || null;
    if (!base) return null;
    if (months === 3) return base * 3;
    if (months === 6) return base * 6;
    if (months === 12) return base * 12;
    return base;
  }

  function handleSubscribeClick() {
    if (localStorage.getItem('coachly_token_type') === 'coach') { showToast('Log in as a user to subscribe', 'error'); return; }
    if (!currentUser) { setShowAuth(true); return; }
    setShowIntake(true);
  }

  function onAuthSuccess(user) { setCurrentUser(user); setShowAuth(false); setShowIntake(true); }
  const [showPayment, setShowPayment] = useState(null); // { subId, coach }
  function onSubDone(subId) {
    setShowIntake(false);
    if (coach.payment_method && coach.payment_details) {
      setShowPayment({ subId, coach });
    } else {
      showToast("This coach hasn't set up a payment method yet. Please message them directly to complete your subscription.", 'error');
    }
  }

  // Dynamic SEO meta tags
  useEffect(() => {
    if (!coach) return;
    document.title = `${coach.name} — ${coach.sport || 'Fitness'} Coach | Coachly`;
    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    const desc = coach.tagline || coach.bio?.slice(0, 155) || `Train with ${coach.name} on Coachly`;
    setMeta('description', desc);
    setMeta('og:title', `${coach.name} — ${coach.sport || 'Coach'} | Coachly`);
    setMeta('og:description', desc);
    setMeta('og:image', coach.photo || coach.banner || '');
    setMeta('og:url', window.location.href);
    setMeta('og:type', 'profile');
    // JSON-LD structured data
    const existing = document.getElementById('coach-jsonld');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'coach-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: coach.name, jobTitle: `${coach.sport || 'Fitness'} Coach`, description: desc, image: coach.photo || '', url: window.location.href, aggregateRating: coach.rating ? { '@type': 'AggregateRating', ratingValue: coach.rating, bestRating: 5 } : undefined });
    document.head.appendChild(script);
    return () => { document.title = 'Coachly'; script.remove(); };
  }, [coach]);

  const accentColor = coach?.store_color || '#C8FF00';
  const isDarkAccent = accentColor === '#C8FF00' || accentColor === '#ffffff';

  if (loading) return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <LoadingSkeleton type="card" count={3} />
    </div>
  );

  if (!coach) return <div style={{ textAlign: 'center', padding: '80px 20px', color: '#888' }}>Coach not found.</div>;

  const socials = [
    { key: 'instagram', label: 'Instagram', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
    { key: 'tiktok', label: 'TikTok', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> },
    { key: 'youtube', label: 'YouTube', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg> },
    { key: 'twitter', label: 'Twitter', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  ].filter(s => coach[s.key]);

  const planOptions = [3, 6, 12];

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Toast />

      {/* ── HERO ── */}
      <div style={{ position: 'relative', height: '520px', overflow: 'hidden' }}>
        {/* Banner */}
        <div style={{
          position: 'absolute', inset: 0,
          background: coach.banner ? `url(${coach.banner}) center/cover` : `linear-gradient(135deg, #111 0%, #2d2d2d 100%)`,
        }} />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%)' }} />

        {/* Back button */}
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '100px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back
        </button>

        {/* Share button */}
        <button onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast('Link copied!', 'success'); }} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '100px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
          Share ↑
        </button>

        {/* Hero content */}
        <div style={{ position: 'absolute', bottom: '32px', left: '28px', right: '28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
            {/* Avatar */}
            <div style={{ width: '110px', height: '110px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.95)', overflow: 'hidden', background: avatarColor(coach.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '800', color: '#fff', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              {coach.photo ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(coach.name)}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '36px', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em', textShadow: '0 2px 16px rgba(0,0,0,0.5)', lineHeight: 1.1 }}>{coach.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {coach.sport && <div style={{ fontSize: '11px', color: '#fff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', padding: '5px 14px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.25)' }}>{coach.sport}</div>}
                {coach.location && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>{coach.location}</div>}
                {coach.years_experience && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>{coach.years_experience}y exp</div>}
              </div>
            </div>
          </div>

          {/* Right side — stats + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {coach.subscriber_count > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{coach.subscriber_count}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px' }}>Clients</div>
                </div>
              )}
              {coach.years_experience && (
                <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{coach.years_experience}y</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px' }}>Exp</div>
                </div>
              )}
            </div>
            <button onClick={handleSubscribeClick} disabled={alreadySubbed} style={{ padding: '14px 32px', borderRadius: '100px', border: 'none', background: accentColor, color: isDarkAccent ? '#111' : '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
            {alreadySubbed ? '✓ Subscribed' : 'Subscribe now'}
          </button>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '0', overflowX: 'auto' }}>
          {[
            { label: 'Clients', value: fmt(coach.subscriber_count || 0) },
            { label: 'Experience', value: coach.years_experience ? `${coach.years_experience}y` : '—' },
            { label: 'Location', value: coach.location || '—' },
            { label: 'Rating', value: (coachRating || coach.rating) ? `${coachRating || coach.rating}` : '—' },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ padding: '18px 32px', textAlign: 'center', borderRight: i < 3 ? '1px solid #eee' : 'none', flexShrink: 0 }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#111' }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{label}</div>
            </div>
          ))}

          {/* Social links in stats bar */}
          {socials.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', flexShrink: 0 }}>
              {socials.map(s => (
                <a key={s.key} href={coach[s.key]} target="_blank" rel="noopener noreferrer" title={s.label}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#fff', flexShrink: 0,
                    background: s.key === 'instagram' ? 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' : s.key === 'tiktok' ? '#010101' : s.key === 'youtube' ? '#FF0000' : '#000',
                  }}>
                  {s.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div>
          {/* STAR RATING */}
          {currentUser && (
            <StarRating coachId={coach.id} currentUser={currentUser} accentColor={accentColor} onRated={setCoachRating} />
          )}
          {/* Tagline */}
          {coach.tagline && (
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#111', marginBottom: '24px', fontFamily: 'Georgia, serif', lineHeight: '1.4', fontStyle: 'italic' }}>
              "{coach.tagline}"
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #eee', marginBottom: '28px' }}>
            {[
              { key: 'about', label: 'About' },
              { key: 'program', label: 'What you get' },
              { key: 'community', label: `Community (${posts.length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: activeTab === tab.key ? '#111' : '#888', borderBottom: `2px solid ${activeTab === tab.key ? '#111' : 'transparent'}`, marginBottom: '-2px', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div>
              {coach.bio && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '12px' }}>About</div>
                  <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#333', margin: 0 }}>{coach.bio}</p>
                </div>
              )}

              {/* Intro video */}
              {coach.intro_video_url && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '12px' }}>Intro Video</div>
                  <div style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '16/9', background: '#111' }}>
                    <iframe src={coach.intro_video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                  </div>
                </div>
              )}

              {/* Highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                {[
                  { title: 'Personalised program', desc: 'Custom workout plan built around your coach\'s exact method and your goals' },
                  { title: 'Daily meal plans', desc: 'Custom nutrition guidance every day' },
                  { title: 'AI coach 24/7', desc: 'Ask anything, get answers instantly' },
                  { title: 'Progress tracking', desc: 'Weekly check-ins and detailed analytics' },
                ].map(h => (
                  <div key={h.title} style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid #e8e8e8', borderTop: `3px solid ${accentColor}` }}>
                    <div style={{ width: '28px', height: '3px', background: accentColor, borderRadius: '2px', marginBottom: '12px' }} />
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#111', marginBottom: '4px' }}>{h.title}</div>
                    <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.5' }}>{h.desc}</div>
                  </div>
                ))}
              </div>

              {/* Credentials */}
              {(coach.credentials || coach.coaching_philosophy) && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '16px' }}>Credentials</div>
                  {coach.credentials && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: '12px' }}>Certifications & achievements</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {coach.credentials.split('·').map((c, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', borderRadius: '100px', background: '#fff', border: `1.5px solid ${accentColor}` }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#111', whiteSpace: 'nowrap' }}>{c.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {coach.coaching_philosophy && (
                    <div style={{ background: '#111', borderRadius: '14px', padding: '20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>Coaching philosophy</div>
                      <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#fff', margin: 0, fontStyle: 'italic' }}>"{coach.coaching_philosophy}"</p>
                    </div>
                  )}
                </div>
              )}
                {coach.subscriber_count > 0 && (
                <div style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`, border: `1px solid ${accentColor}44`, borderRadius: '16px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: '#111' }}>{fmt(coach.subscriber_count)}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>clients trust {coach.name?.split(' ')[0]}</div>
                    <div style={{ fontSize: '13px', color: '#555' }}>Join them and start your transformation today</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WHAT YOU GET TAB */}
          {activeTab === 'program' && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '20px' }}>Everything included in your plan</div>
              {(coach.what_included
                ? coach.what_included.split('\n').filter(Boolean).map((line) => ({ title: line, desc: '' }))
                : [
                  { title: 'Custom workout program', desc: 'A 5-day/week program generated by AI using your coach\'s exact methodology.' },
                  { title: 'Daily meal plans', desc: 'Breakfast, lunch, snack and dinner planned every day.' },
                  { title: 'Food scan & tracking', desc: 'Take a photo of any meal to instantly get calories and macros.' },
                  { title: 'AI coach (24/7)', desc: 'A personalised AI trained on your coach\'s methods.' },
                  { title: 'Direct coach messaging', desc: 'Message your real human coach directly.' },
                  { title: 'Weekly check-ins', desc: 'Log your progress weekly. Your coach reviews and adjusts your plan.' },
                  { title: 'Community access', desc: 'Join a community of clients on the same journey.' },
                  { title: 'Content library', desc: 'Exclusive videos, guides and resources from your coach.' },
                ]
              ).map((item, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: '16px', padding: '18px 0', borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <div style={{ width: '4px', height: '44px', borderRadius: '4px', background: accentColor, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MEDIA GALLERY */}
          {activeTab === 'about' && Array.isArray(coach.media) && coach.media.filter(m => m.url).length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '16px' }}>Gallery</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {coach.media.filter(m => m.url).map((m, i) => (
                  <div key={i} style={{ borderRadius: '12px', overflow: 'hidden', background: '#111', aspectRatio: '16/9', position: 'relative' }}>
                    {m.type === 'video'
                      ? (m.url?.includes('youtube.com') || m.url?.includes('youtu.be')
                          ? <iframe src={m.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                          : <video src={m.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
                      : <img src={m.url} alt={m.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    }
                    {m.caption && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '20px 12px 10px', fontSize: '12px', color: '#fff', fontWeight: '600' }}>{m.caption}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TESTIMONIALS */}
          {activeTab === 'about' && Array.isArray(coach.testimonials) && coach.testimonials.length > 0 && (
            <TestimonialsCarousel testimonials={coach.testimonials} accentColor={accentColor} />
          )}

          {/* COMMUNITY TAB */}
          {activeTab === 'community' && (
            <div style={{ position: 'relative' }}>
              {/* Blurred preview */}
              <div style={{ filter: !currentUser ? 'blur(6px)' : 'none', pointerEvents: !currentUser ? 'none' : 'auto', userSelect: 'none' }}>
              {posts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontSize: '14px' }}>No community posts yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {posts.map(post => (
                    <div key={post.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '16px', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarColor(post.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
                          {post.user?.photo ? <img src={post.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(post.user?.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#111' }}>{post.user?.name || 'Member'}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>{timeAgo(post.created_at)}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#333', margin: 0 }}>{post.content}</p>
                      {post.photo && <img src={post.photo} alt="post" style={{ marginTop: '12px', borderRadius: '10px', maxWidth: '100%' }} />}
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#aaa', display: 'flex', gap: '16px' }}>
                        <span>♥ {fmt(post.likes_count)}</span>
                        <span>💬 {post.comment_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
              {/* Lock overlay for non-subscribers */}
              {!currentUser && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px' }}>🔒</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#111', fontFamily: 'Georgia, serif' }}>
                    "The people around you shape who you become."
                  </div>
                  <div style={{ fontSize: '13px', color: '#888', maxWidth: '300px', lineHeight: '1.6' }}>
                    Join the community — share your wins, get support, and stay accountable.
                  </div>
                  <button onClick={handleSubscribeClick} style={{ padding: '14px 32px', borderRadius: '100px', border: 'none', background: accentColor, color: isDarkAccent ? '#111' : '#fff', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 20px ${accentColor}66` }}>
                    Subscribe to join →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — sticky pricing */}
        <div style={{ position: 'sticky', top: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', border: '1px solid #eee', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '4px' }}>Choose your plan</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#111', marginBottom: '20px', fontFamily: 'Georgia, serif' }}>
              Start with {coach.name?.split(' ')[0]}
            </div>

            {/* Plan options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {planOptions.map(months => {
                const price = getPlanPrice(months);
                const perMonth = price ? (price / months).toFixed(0) : null;
                const selected = planMonths === months;
                const badge = months === 6 ? 'Most Popular' : months === 12 ? 'Best Value' : null;
                return (
                  <div key={months} onClick={() => setPlanMonths(months)} style={{ padding: '14px 16px', borderRadius: '14px', border: `2px solid ${selected ? '#111' : '#e5e5e5'}`, background: selected ? '#111' : '#fff', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
                    {badge && <div style={{ position: 'absolute', top: '-9px', right: '14px', background: accentColor, color: isDarkAccent ? '#111' : '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{badge}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: selected ? '#fff' : '#111' }}>{months} months</div>
                        {perMonth && <div style={{ fontSize: '12px', color: selected ? 'rgba(255,255,255,0.6)' : '#888', marginTop: '2px' }}>${perMonth}/month</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: selected ? accentColor : '#111' }}>${price || '—'}</div>
                        <div style={{ fontSize: '11px', color: selected ? 'rgba(255,255,255,0.5)' : '#aaa' }}>total</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subscribe button */}
            <button onClick={handleSubscribeClick} disabled={alreadySubbed} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: accentColor, color: isDarkAccent ? '#111' : '#fff', fontSize: '16px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 20px ${accentColor}66`, transition: 'transform 0.1s, box-shadow 0.1s' }}>
              {alreadySubbed ? '✓ Subscribed' : `Get started →`}
            </button>

            {/* Trust signals */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['AI coach available 24/7', 'Personalised from day 1'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', flexShrink: 0 }}>✓</div>
                  {t}
                </div>
              ))}
            </div>

            {/* Social links */}
            {socials.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Follow {coach.name?.split(' ')[0]}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {socials.map(s => (
                    <a key={s.key} href={coach[s.key]} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', color: '#fff', textDecoration: 'none',
                        background: s.key === 'instagram' ? 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' : s.key === 'tiktok' ? '#010101' : s.key === 'youtube' ? '#FF0000' : '#000',
                      }}>
                      {s.icon} {s.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={onAuthSuccess} />}
      {showIntake && coach && <IntakeModal coach={coach} planMonths={planMonths} planPrice={getPlanPrice(planMonths)} onClose={() => setShowIntake(false)} onDone={onSubDone} />}
      {showPayment && <PaymentModal subId={showPayment.subId} coach={showPayment.coach} onClose={() => setShowPayment(null)} onPaid={() => { setShowPayment(null); setAlreadySubbed(true); showToast('Proof submitted! Your coach will approve shortly.', 'success'); }} />}
    </div>
  );
}