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
      await createSubscription(coach.id, planMonths, planPrice, form);
      onDone();
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
  function onSubDone() { setShowIntake(false); setAlreadySubbed(true); showToast('Subscription active! Welcome aboard.', 'success'); setTimeout(() => navigate('/dashboard'), 1500); }

  const accentColor = coach?.store_color || '#C8FF00';
  const isDarkAccent = accentColor === '#C8FF00' || accentColor === '#ffffff';

  if (loading) return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <LoadingSkeleton type="card" count={3} />
    </div>
  );

  if (!coach) return <div style={{ textAlign: 'center', padding: '80px 20px', color: '#888' }}>Coach not found.</div>;

  const socials = [
    { key: 'instagram', icon: '📸', label: 'Instagram' },
    { key: 'tiktok', icon: '🎵', label: 'TikTok' },
    { key: 'youtube', icon: '▶️', label: 'YouTube' },
    { key: 'twitter', icon: '𝕏', label: 'Twitter' },
  ].filter(s => coach[s.key]);

  const planOptions = [3, 6, 12];

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Toast />

      {/* ── HERO ── */}
      <div style={{ position: 'relative', height: '420px', overflow: 'hidden' }}>
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
        <div style={{ position: 'absolute', bottom: '32px', left: '28px', right: '28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
            {/* Avatar */}
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #fff', overflow: 'hidden', background: avatarColor(coach.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
              {coach.photo ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(coach.name)}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#fff', fontFamily: 'Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{coach.name}</h1>
              {coach.sport && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{coach.sport}</div>}
            </div>
          </div>

          {/* CTA */}
          <button onClick={handleSubscribeClick} disabled={alreadySubbed} style={{ padding: '14px 32px', borderRadius: '100px', border: 'none', background: accentColor, color: isDarkAccent ? '#111' : '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
            {alreadySubbed ? '✓ Subscribed' : 'Subscribe now'}
          </button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '0', overflowX: 'auto' }}>
          {[
            { label: 'Clients', value: fmt(coach.subscriber_count || 0) },
            { label: 'Experience', value: coach.years_experience ? `${coach.years_experience}y` : '—' },
            { label: 'Location', value: coach.location || '—' },
            { label: 'Rating', value: '⭐ 5.0' },
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
                <a key={s.key} href={coach[s.key]} target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', textDecoration: 'none', border: '1px solid #eee' }} title={s.label}>
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
                  { icon: '🎯', title: 'Personalised program', desc: 'AI-generated workout plan based on your goals' },
                  { icon: '🥗', title: 'Daily meal plans', desc: 'Custom nutrition guidance every day' },
                  { icon: '💬', title: 'AI coach 24/7', desc: 'Ask anything, get answers instantly' },
                  { icon: '📊', title: 'Progress tracking', desc: 'Weekly check-ins and detailed analytics' },
                ].map(h => (
                  <div key={h.title} style={{ background: '#fff', borderRadius: '14px', padding: '18px', border: '1px solid #eee' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{h.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#111', marginBottom: '4px' }}>{h.title}</div>
                    <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.5' }}>{h.desc}</div>
                  </div>
                ))}
              </div>

              {/* Social proof */}
              {coach.subscriber_count > 0 && (
                <div style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`, border: `1px solid ${accentColor}44`, borderRadius: '16px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              {[
                { icon: '🏋️', title: 'Custom workout program', desc: 'A 5-day/week program generated by AI using your coach\'s exact methodology. Updates every month based on your progress.' },
                { icon: '🍽️', title: 'Daily meal plans', desc: 'Breakfast, lunch, snack and dinner planned every day. Tap any meal for the full recipe.' },
                { icon: '📸', title: 'Food scan & tracking', desc: 'Take a photo of any meal to instantly get calories, protein, carbs and fat. Your coach sees your eating habits.' },
                { icon: '🤖', title: 'AI coach (24/7)', desc: 'A personalised AI trained on your coach\'s methods. Ask about workouts, nutrition, motivation — anytime.' },
                { icon: '💌', title: 'Direct coach messaging', desc: 'Message your real human coach directly. They typically reply within 24–48h.' },
                { icon: '📈', title: 'Weekly check-ins', desc: 'Log your weight, energy, sleep and motivation weekly. Your coach reviews and adjusts your plan.' },
                { icon: '👥', title: 'Community access', desc: 'Join a community of clients on the same journey. Share wins, ask questions, stay motivated.' },
                { icon: '📚', title: 'Content library', desc: 'Exclusive videos, guides and resources from your coach — unlocked week by week.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', padding: '18px 0', borderBottom: i < 7 ? '1px solid #f0f0f0' : 'none' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COMMUNITY TAB */}
          {activeTab === 'community' && (
            <div>
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
              {['Cancel anytime', 'AI coach available 24/7', 'Personalised from day 1'].map(t => (
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
                    <a key={s.key} href={coach[s.key]} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '100px', background: '#f4f4f4', fontSize: '12px', fontWeight: '600', color: '#333', textDecoration: 'none', border: '1px solid #eee' }}>
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
    </div>
  );
}