import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getUserMe,
  getUserSubscriptions,
  getCoach,
  getChatHistory,
  sendChatMessage,
  getDMs,
  sendDM,
  markDMsRead,
  getTodayMeals,
  getCheckins,
  submitCheckin,
  getPosts,
  createPost,
  likePost,
  getComments,
  createComment,
  getContent,
  getProgram,
  getWorkoutLogs,
  logWorkout,
  getMeetings,
  logout,
} from '../api';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';
import ProfileSection from '../components/ProfileSection';
import NotificationBell from '../components/NotificationBell';

// ─── helpers ────────────────────────────────────────────────────
const AVATAR_COLORS = ['#E8633A','#2a7a4f','#5a5ac8','#c94e2a','#2d6b47','#8b5cf6','#0891b2','#b45309','#be185d','#065f46'];
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
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmt(n) { return n ? new Intl.NumberFormat().format(n) : '0'; }

// Resize + compress an image file before upload, to save storage
function compressImage(file, maxDimension = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Upload a base64 file (image or audio) to the backend, returns the public URL
async function uploadMedia(base64, fileName, fileType) {
  const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload-media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
    body: JSON.stringify({ fileBase64: base64, fileName, fileType }),
  });
  const data = await res.json();
  if (!data.url) throw new Error(data.error || 'Upload failed');
  return data.url;
}

// Shared mic recorder hook-like helper — call from a component with useRef/useState
function createRecorder({ onStop, maxSeconds = 120 }) {
  let mediaRecorder = null;
  let chunks = [];
  let timer = null;

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      clearTimeout(timer);
      const blob = new Blob(chunks, { type: 'audio/webm' });
      onStop(blob);
    };
    mediaRecorder.start();
    timer = setTimeout(() => stop(), maxSeconds * 1000);
  }

  function stop() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  }

  return { start, stop };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Clean icon set (no emojis)
function IconCamera({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function IconImage({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
function IconMic({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}
function IconPaperclip({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
function IconUtensils({ size = 32, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
      <path d="M5 12v10" />
      <path d="M19 2v10c0 1.1-.9 2-2 2h0a2 2 0 0 1-2-2V2" />
      <path d="M19 12v10" />
    </svg>
  );
}
function IconFlame({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
function IconBeef({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12.5" cy="8.5" r="2.5" />
      <path d="M12.5 2a6.5 6.5 0 0 0-6.5 6.5c0 1.25.45 2.45 1.27 3.4l-4.5 4.5a2 2 0 1 0 2.83 2.83l4.5-4.5a6.5 6.5 0 1 0 2.4-12.73z" />
    </svg>
  );
}
function IconWheat({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-7l5-5" /><path d="M9.5 7.5 12 5l2.5 2.5" /><path d="M7 12l5-5 5 5" /><path d="M4.5 14.5 12 7l7.5 7.5" />
    </svg>
  );
}
function IconDroplet({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69s-5.5 5.27-8 9.91c-1 2-1 5 1.5 7.5a8 8 0 0 0 13 0c2.5-2.5 2.5-5.5 1.5-7.5-2.5-4.64-8-9.91-8-9.91z" />
    </svg>
  );
}
function IconPlateEmpty({ size = 48, color = 'var(--muted)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
    </svg>
  );
}
function IconSunrise({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="2" x2="12" y2="9" /><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" /><line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" /><line x1="23" y1="22" x2="1" y2="22" /><polyline points="8 6 12 2 16 6" />
    </svg>
  );
}
function IconSun({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function IconApple({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6c-1.5-2-4-2.5-6-1-2.5 1.8-3 6-1 9.5 1.8 3 4.5 5 7 5s5.2-2 7-5c2-3.5 1.5-7.7-1-9.5-2-1.5-4.5-1-6 1z" />
      <path d="M12 6c0-1.5.5-3 1.5-4" />
    </svg>
  );
}
function IconMoon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// ─── stat card ──────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ─── section wrapper ────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div className="dash-section">
      {(title || action) && (
        <div className="section-header">
          {title && <h2 className="section-title">{title}</h2>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION: HOME DASHBOARD
// ═══════════════════════════════════════════════════════════════
function SectionHome({ user, coach, subscription, onNavigate }) {
  const [program, setProgram] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIds, setLoggedIds] = useState(new Set());

  useEffect(() => {
    if (!coach) return;
    setLoading(true);
    Promise.all([
      getProgram(coach.id).catch(() => []),
      getCheckins(coach.id).catch(() => []),
      getWorkoutLogs(coach.id).catch(() => []),
    ]).then(([prog, chk, wl]) => {
      setProgram(prog);
      setCheckins(chk);
      setLogs(wl);
      console.log('WORKOUT LOGS:', JSON.stringify(wl));
      console.log('PROGRAMS:', JSON.stringify(prog.map(p => ({id: p.id, day: p.day_name}))));
      const ids = new Set(wl.map((l) => `${l.program_id}-${l.exercise_index}`));
      wl.filter(l => parseInt(l.exercise_index) === -1).forEach(l => ids.add(`rest-${l.program_id}`));
      setLoggedIds(ids);
    }).finally(() => setLoading(false));
  }, [coach]);

  async function markDone(programId, exerciseIndex) {
    const key = `${programId}-${exerciseIndex}`;
    if (loggedIds.has(key)) return;
    try {
      await logWorkout(programId, exerciseIndex);
      setLoggedIds((prev) => new Set([...prev, key]));
      showToast('Exercise logged!', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Today's day name
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayProgram = program.filter((p) => p.day_name?.toLowerCase() === todayDay.toLowerCase());

  // Streak: consecutive days with a checkin in the last 7
  const weekStreak = checkins.filter((c) => {
    const d = new Date(c.created_at);
    return (Date.now() - d.getTime()) < 7 * 86400000;
  }).length;

  const lastCheckin = checkins[0];

  if (loading) return <LoadingSkeleton type="card" count={3} />;

  return (
    <div>
      {/* Greeting */}
      <div className="dash-greeting">
        <div className="dash-greeting-text">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          <span>{user?.name?.split(' ')[0] || 'there'}</span>
        </div>
        <div className="dash-date">{todayLabel()}</div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <StatCard label="Week streak" value={`${weekStreak}`} sub="check-ins" />
        <StatCard
          label="Plan"
          value={subscription ? `${subscription.plan_months}mo` : '—'}
          sub={subscription?.status || '—'}
        />
        <StatCard
          label="Last check-in"
          value={lastCheckin ? timeAgo(lastCheckin.created_at) : '—'}
          sub={lastCheckin ? `Energy ${lastCheckin.energy ?? '?'}/5` : 'none yet'}
        />
      </div>

      {/* Today's workout */}
      <Section
        title="Today's workout"
        action={
          <button className="btn-sm" onClick={() => onNavigate('strategy')}>
            Full plan →
          </button>
        }
      >
        {todayProgram.length === 0 ? (
          <EmptyState
            message={program.length === 0
              ? 'Your coach hasn\'t assigned a program yet.'
              : 'No training scheduled today — rest day!'}
          />
        ) : (
          <div className="workout-list">
            {todayProgram.map((prog) => (
              <div key={prog.id} className="workout-day-card">
                <div className="workout-day-name">{prog.day_name}</div>
                {(prog.exercises || []).map((ex, idx) => {
                  const key = `${prog.id}-${idx}`;
                  const done = loggedIds.has(key);
                  return (
                    <div key={idx} className={`exercise-row${done ? ' done' : ''}`}>
                      <div className="exercise-info">
                        <div className="exercise-name">{ex.name || ex}</div>
                        {ex.sets && (
                          <div className="exercise-meta">
                            {ex.sets} sets × {ex.reps || ex.duration || '—'}
                            {ex.weight ? ` @ ${ex.weight}` : ''}
                          </div>
                        )}
                      </div>
                      <button
                        className={`exercise-check${done ? ' checked' : ''}`}
                        onClick={() => markDone(prog.id, idx)}
                        disabled={done}
                      >
                        {done ? '✓' : '○'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Quick check-in prompt */}
      {!lastCheckin || (Date.now() - new Date(lastCheckin.created_at).getTime()) > 86400000 ? (
        <Section>
          <div className="checkin-prompt">
            <div>
              <div className="checkin-prompt-title">Daily check-in</div>
              <div className="checkin-prompt-sub">How are you feeling today? Your coach reviews these.</div>
            </div>
            <button className="btn-primary btn-sm" onClick={() => onNavigate('progress')}>
              Check in →
            </button>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION: AI COACH CHAT
// ═══════════════════════════════════════════════════════════════
function SectionChat({ user, coach }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!coach) return;
    getChatHistory(coach.id)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coach]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const optimistic = { id: `opt-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await sendChatMessage(text, coach.id, timezone);
      const aiMsg = { id: `ai-${Date.now()}`, role: 'assistant', content: res.reply, flagged: res.flagged, created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      showToast(err.message, 'error');
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingSkeleton type="chat" />;

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <div className="chat-av">
          {coach?.photo
            ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : initials(coach?.name)}
        </div>
        <div>
          <div className="chat-coach-name">{coach?.name} AI</div>
          <div className="chat-coach-sub">Powered by your coach's methods · always available</div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            Ask {coach?.name?.split(' ')[0] || 'your coach'} anything about your workouts, nutrition, or mindset.
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.role === 'user' ? 'user' : 'ai'}`}>
            {msg.role === 'assistant' && (
              <div className="chat-msg-av">
                {coach?.photo
                  ? <img src={coach.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initials(coach?.name)}
              </div>
            )}
            <div className={`chat-bubble${msg.flagged ? ' flagged' : ''}`}>
              {msg.content}
              {msg.flagged && (
                <div className="chat-flag-note">⚠ Your coach has been notified</div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat-msg ai">
            <div className="chat-msg-av">{initials(coach?.name)}</div>
            <div className="chat-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={send}>
        <input
          className="chat-input"
          placeholder={`Ask ${coach?.name?.split(' ')[0] || 'your coach'}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className="chat-send" disabled={!input.trim() || sending}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION: DIRECT MESSAGE COACH
// ═══════════════════════════════════════════════════════════════
function SectionDM({ user, coach }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingMedia, setPendingMedia] = useState(null); // { type: 'image'|'audio', base64, url? }
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const bottomRef = useRef(null);
  const recorderRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (!coach) return;
    getDMs(coach.id)
      .then((dms) => {
        setMessages(dms);
        markDMsRead(coach.id).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coach]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handlePickImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAttachOpen(false);
    try {
      const compressed = await compressImage(file);
      setPendingMedia({ type: 'image', base64: compressed });
    } catch {
      showToast('Failed to process image', 'error');
    }
    e.target.value = '';
  }

  async function startRecording() {
    setAttachOpen(false);
    try {
      recorderRef.current = createRecorder({
        maxSeconds: 120,
        onStop: async (blob) => {
          setRecording(false);
          clearInterval(recordIntervalRef.current);
          const base64 = await blobToBase64(blob);
          setPendingMedia({ type: 'audio', base64 });
        },
      });
      await recorderRef.current.start();
      setRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      showToast('Microphone access denied', 'error');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function cancelPendingMedia() {
    setPendingMedia(null);
  }

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text && !pendingMedia) return;
    if (sending) return;
    setSending(true);

    const media = pendingMedia;
    setInput('');
    setPendingMedia(null);

    const optimistic = {
      id: `opt-${Date.now()}`, sender_type: 'user', content: text || null,
      image_url: media?.type === 'image' ? media.base64 : null,
      audio_url: media?.type === 'audio' ? media.base64 : null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      let imageUrl, audioUrl;
      if (media?.type === 'image') {
        imageUrl = await uploadMedia(media.base64, `dm_${Date.now()}.jpg`, 'image/jpeg');
      } else if (media?.type === 'audio') {
        audioUrl = await uploadMedia(media.base64, `dm_${Date.now()}.webm`, 'audio/webm');
      }
      const msg = await sendDM(coach.id, text, imageUrl, audioUrl);
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...optimistic, ...msg, image_url: imageUrl || null, audio_url: audioUrl || null } : m));
    } catch (err) {
      showToast(err.message, 'error');
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingSkeleton type="chat" />;

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <div className="chat-av" style={{ background: coach?.photo ? 'transparent' : avatarColor(coach?.id) }}>
          {coach?.photo
            ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : initials(coach?.name)}
        </div>
        <div>
          <div className="chat-coach-name">{coach?.name}</div>
          <div className="chat-coach-sub">Human coach · replies within 24–48h</div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            Send {coach?.name?.split(' ')[0] || 'your coach'} a direct message. They typically reply within 24–48 hours.
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.sender_type === 'user' ? 'user' : 'ai'}`}>
            {msg.sender_type === 'coach' && (
              <div className="chat-msg-av" style={{ background: coach?.photo ? 'transparent' : avatarColor(coach?.id) }}>
                {coach?.photo
                  ? <img src={coach.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initials(coach?.name)}
              </div>
            )}
            <div className="chat-bubble">
              {msg.image_url && (
                <img src={msg.image_url} alt="" style={{ maxWidth: '220px', borderRadius: '10px', display: 'block', marginBottom: msg.content ? '8px' : 0 }} />
              )}
              {msg.audio_url && (
                <audio controls src={msg.audio_url} style={{ display: 'block', marginBottom: msg.content ? '8px' : 0, maxWidth: '220px' }} />
              )}
              {msg.content}
              <div className="chat-msg-time">{timeAgo(msg.created_at)}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Pending media preview */}
      {pendingMedia && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
          {pendingMedia.type === 'image' ? (
            <img src={pendingMedia.base64} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
          ) : (
            <audio controls src={pendingMedia.base64} style={{ height: '32px', maxWidth: '200px' }} />
          )}
          <span style={{ fontSize: '12px', color: 'var(--muted)', flex: 1 }}>Ready to send</span>
          <button type="button" onClick={cancelPendingMedia} style={{ background: 'none', border: 'none', color: '#ff4d1c', fontSize: '18px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(255,77,28,0.08)', borderTop: '1px solid rgba(255,77,28,0.2)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff4d1c', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#ff4d1c' }}>Recording… {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}</span>
          <button type="button" onClick={stopRecording} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: '100px', border: 'none', background: '#ff4d1c', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Stop</button>
        </div>
      )}

      <form className="chat-input-row" onSubmit={send} style={{ position: 'relative' }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePickImage} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePickImage} />

        <button type="button" onClick={() => setAttachOpen(o => !o)} disabled={recording}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
          <IconPaperclip />
        </button>

        {attachOpen && (
          <div style={{ position: 'absolute', bottom: '54px', left: '8px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 10 }}>
            <button type="button" onClick={() => cameraInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--dark)', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}><IconCamera /> Camera</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--dark)', fontFamily: 'inherit', width: '100%', textAlign: 'left', borderTop: '1px solid var(--border)' }}><IconImage /> Gallery</button>
          </div>
        )}

        <input
          className="chat-input"
          placeholder="Message your coach…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || recording}
        />

        {!input.trim() && !pendingMedia ? (
          <button type="button" onClick={startRecording} disabled={recording} className="chat-send">
            <IconMic />
          </button>
        ) : (
          <button type="submit" className="chat-send" disabled={(!input.trim() && !pendingMedia) || sending}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION: STRATEGY (workout program)
// ═══════════════════════════════════════════════════════════════
function IconDumbbell({ size = 40, color = 'var(--muted)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" />
      <rect x="2" y="9" width="3" height="6" rx="1" /><rect x="19" y="9" width="3" height="6" rx="1" />
      <rect x="5" y="7" width="2" height="10" rx="1" /><rect x="17" y="7" width="2" height="10" rx="1" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}
function GenerateProgram({ coach, onGenerated }) {
  const [generating, setGenerating] = useState(false);
  async function generate() {
    setGenerating(true);
    try {
      const { generateProgram } = await import('../api');
      const result = await generateProgram(coach.id);
      onGenerated(result);
      showToast('Program generated!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setGenerating(false); }
  }
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><IconDumbbell /></div>
      <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No program yet</div>
      <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>Generate a personalized workout program based on your coach's method and your goals.</div>
      <button className="btn-primary" onClick={generate} disabled={generating}>
        {generating ? 'Generating your program…' : 'Generate my program'}
      </button>
    </div>
  );
}
function SectionStrategy({ coach }) {
  const [program, setProgram] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIds, setLoggedIds] = useState(new Set());
  const [openDay, setOpenDay] = useState(null);

  useEffect(() => {
    if (!coach) return;
    Promise.all([
      getProgram(coach.id).catch(() => []),
      getWorkoutLogs(coach.id).catch(() => []),
    ]).then(([prog, wl]) => {
      setProgram(prog);
      const ids = new Set(wl.map((l) => `${l.program_id}-${l.exercise_index}`));
      wl.filter(l => parseInt(l.exercise_index) === -1).forEach(l => ids.add(`rest-${l.program_id}`));
      setLoggedIds(ids);
      // Auto-open today's day
      const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayProg = prog.find((p) => p.day_name?.toLowerCase() === todayDay.toLowerCase());
      if (todayProg) setOpenDay(todayProg.id);
    }).finally(() => setLoading(false));
  }, [coach]);

  async function markDone(programId, exerciseIndex) {
    const key = `${programId}-${exerciseIndex}`;
    if (loggedIds.has(key)) return;
    try {
      await logWorkout(programId, exerciseIndex);
      setLoggedIds((prev) => new Set([...prev, key]));
      showToast('Exercise logged!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  }

  if (loading) return <LoadingSkeleton type="card" count={4} />;
  if (program.length === 0) return <GenerateProgram coach={coach} onGenerated={setProgram} />;

  const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const weeks = {};
  program.forEach((p) => {
    const w = p.week_number || 1;
    if (!weeks[w]) weeks[w] = [];
    weeks[w].push(p);
  });
  Object.values(weeks).forEach(days => days.sort((a, b) => DAY_ORDER.indexOf(a.day_name) - DAY_ORDER.indexOf(b.day_name)));

  return (
    <div>
      {Object.entries(weeks).map(([week, days]) => (
        <Section key={week} title={`Week ${week}`}>
          <div className="strategy-days">
            {days.map((day) => {
              const exercises = day.exercises || [];
              const completedCount = exercises.filter((_, idx) => loggedIds.has(`${day.id}-${idx}`)).length;
              const isOpen = openDay === day.id;
              const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
              const isToday = day.day_name?.toLowerCase() === todayDay.toLowerCase();

              return (
                <div key={day.id} className={`strategy-day${isToday ? ' today' : ''}`}>
                  <button
                    className="strategy-day-header"
                    onClick={() => setOpenDay(isOpen ? null : day.id)}
                  >
                    <div className="strategy-day-left">
                      <span className="strategy-day-name">{day.day_name}</span>
                      {isToday && <span className="today-badge">Today</span>}
                      {day.session_title && <span className="strategy-focus">{day.session_title}</span>}
                    </div>
                    <div className="strategy-day-right">
                      {exercises.length > 0 && (
                        <span className="strategy-progress">
                          {completedCount}/{exercises.length}
                        </span>
                      )}
                      <button
                        onClick={async e => { e.stopPropagation(); setLoggedIds(prev => { const next = new Set(prev); exercises.forEach((_, idx) => next.add(`${day.id}-${idx}`)); next.add(`rest-${day.id}`); return next; }); showToast('✅ Day completed!', 'success'); if (exercises.length === 0) { await logWorkout(day.id, -1).catch(()=>{}); } else { await Promise.all(exercises.map((_,idx) => logWorkout(day.id, idx).catch(()=>{}))); } }}
                        style={{ background: (completedCount === exercises.length && exercises.length > 0) || loggedIds.has(`rest-${day.id}`) ? '#2ecc6a' : 'var(--border)', border: 'none', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: '700', color: (completedCount === exercises.length && exercises.length > 0) || loggedIds.has(`rest-${day.id}`) ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', marginRight: '6px' }}
                      >
                        {(completedCount === exercises.length && exercises.length > 0) || loggedIds.has(`rest-${day.id}`) ? '✓ Done' : 'Mark done'}
                      </button>
                      <span className="strategy-chevron">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="strategy-exercises">
                      {exercises.length === 0 ? (
                        <div style={{ padding: '12px 20px', color: 'var(--muted)', fontSize: '13px' }}>
                          Rest day
                        </div>
                      ) : exercises.map((ex, idx) => {
                        const key = `${day.id}-${idx}`;
                        const done = loggedIds.has(key);
                        return (
                          <div key={idx} className={`exercise-row${done ? ' done' : ''}`}>
                            <div className="exercise-info">
                              <div className="exercise-name">{ex.name || ex}</div>
                              {ex.sets && (
                                <div className="exercise-meta">
                                  {ex.sets} sets × {ex.reps || ex.duration || '—'}
                                  {ex.weight ? ` @ ${ex.weight}` : ''}
                                  {ex.rest ? ` · ${ex.rest} rest` : ''}
                                </div>
                              )}
                              {ex.notes && <div className="exercise-notes">{ex.notes}</div>}
                            </div>
                            <button
                              className={`exercise-check${done ? ' checked' : ''}`}
                              onClick={() => markDone(day.id, idx)}
                              disabled={done}
                            >
                              {done ? '✓' : '○'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION: NUTRITION
// ═══════════════════════════════════════════════════════════════
function SectionNutrition({ user, coach }) {
  const [meals, setMeals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recipeModal, setRecipeModal] = useState(null);
  const [mealStatus, setMealStatus] = useState({}); // { breakfast: 'followed'|'skipped' }

  useEffect(() => {
    if (!coach) return;
    getTodayMeals(coach.id)
      .then((m) => {
        setMeals(m);
        if (m) {
          const saved = {};
          ['breakfast','lunch','snack','dinner'].forEach(k => {
            if (m[`${k}_status`] && m[`${k}_status`] !== 'pending') saved[k] = m[`${k}_status`];
          });
          setMealStatus(saved);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coach]);

  async function openRecipe(mealName) {
    setRecipeModal({ mealName, recipe: null, loading: true });
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/meals/recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('coachly_token')}`,
        },
        body: JSON.stringify({ mealName, coachId: coach.id }),
      });
      if (!res.ok) throw new Error('Failed to load recipe');
      const recipe = await res.json();
      setRecipeModal({ mealName, recipe, loading: false });
    } catch (e) {
      showToast(e.message, 'error');
      setRecipeModal(null);
    }
  }

  const mealSlots = [
    { key: 'breakfast', label: 'Breakfast', icon: <IconSunrise /> },
    { key: 'lunch', label: 'Lunch', icon: <IconSun /> },
    { key: 'snack', label: 'Snack', icon: <IconApple /> },
    { key: 'dinner', label: 'Dinner', icon: <IconMoon /> },
  ];

  if (loading) return (
    <div>
      <div style={{ height: '80px', marginBottom: '16px', background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', animation: 'shimmer 1.4s infinite', backgroundSize: '200% 100%' }} />
      <LoadingSkeleton type="card" count={4} />
    </div>
  );

  return (
    <div>
      {/* Macro summary */}
      {meals && (
        <div className="macro-bar">
          <div className="macro-item">
            <div className="macro-value">{meals.total_calories || '—'}</div>
            <div className="macro-label">kcal</div>
          </div>
          <div className="macro-divider" />
          <div className="macro-item">
            <div className="macro-value">{meals.total_protein || '—'}</div>
            <div className="macro-label">protein</div>
          </div>
          <div className="macro-divider" />
          <div className="macro-item">
            <div className="macro-value">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
            <div className="macro-label">today</div>
          </div>
        </div>
      )}

      {/* Meal cards */}
      <div className="meal-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mealSlots.map(({ key, label, icon }) => {
          const mealName = meals?.[key];
          const isNotApplicable = mealName && /not applicable/i.test(mealName);
          const hasRealMeal = mealName && !isNotApplicable;
          return (
            <div
              key={key}
              className={`meal-card${hasRealMeal ? ' has-meal' : ''}`}
              onClick={() => hasRealMeal && openRecipe(mealName)}
              style={{ cursor: hasRealMeal ? 'pointer' : 'default' }}
            >
              <div className="meal-slot-label">
                <span className="meal-icon">{icon}</span>
                {label}
              </div>
              {hasRealMeal ? (
                <div className="meal-name">{mealName}</div>
              ) : isNotApplicable ? (
                <div className="meal-empty" style={{ fontStyle: 'italic' }}>{mealName}</div>
              ) : (
                <div className="meal-empty">No meal planned</div>
              )}
              {hasRealMeal && <div className="meal-tap">Tap for recipe →</div>}
              {hasRealMeal && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }} onClick={e => e.stopPropagation()}>
                  {mealStatus[key] ? (
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', fontWeight: '700', color: mealStatus[key] === 'followed' ? '#2ecc6a' : '#ff4d1c' }}>
                      {mealStatus[key] === 'followed' ? '✓ Followed' : '✗ Skipped'}
                    </div>
                  ) : (
                    <>
                      <button onClick={async () => { setMealStatus(p => ({ ...p, [key]: 'followed' })); showToast('✅ Logged!', 'success'); fetch(`${import.meta.env.VITE_API_URL||''}/api/meals/status`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('coachly_token')}`},body:JSON.stringify({coachId:coach.id,meal:key,status:'followed'})}).catch(()=>{}); }} style={{ flex: 1, padding: '5px 8px', borderRadius: '8px', border: '1px solid #2ecc6a', background: 'rgba(46,204,106,0.1)', color: '#2ecc6a', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>✓ Followed</button>
                      <button onClick={async () => { setMealStatus(p => ({ ...p, [key]: 'skipped' })); showToast('❌ Skipped', 'error'); fetch(`${import.meta.env.VITE_API_URL||''}/api/meals/status`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('coachly_token')}`},body:JSON.stringify({coachId:coach.id,meal:key,status:'skipped'})}).catch(()=>{}); }} style={{ flex: 1, padding: '5px 8px', borderRadius: '8px', border: '1px solid rgba(255,77,28,0.4)', background: 'rgba(255,77,28,0.08)', color: '#ff4d1c', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>✗ Skipped</button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!meals && (
        <EmptyState message="Generating your meal plan… this may take a moment on first load." />
      )}

      {/* Recipe modal */}
      {recipeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 999,
        }} onClick={() => setRecipeModal(null)}>
          <div style={{
            background: 'var(--card)', borderRadius: '20px 20px 0 0',
            padding: '28px 24px 40px', width: '100%', maxWidth: '560px',
            maxHeight: '85vh', overflowY: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', margin: 0 }}>
                {recipeModal.mealName}
              </h3>
              <button onClick={() => setRecipeModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>

            {recipeModal.loading ? (
              <LoadingSkeleton type="card" count={2} />
            ) : recipeModal.recipe ? (
              <>
                {recipeModal.recipe.coach_note && (
                  <div className="recipe-coach-note">
                    <strong>{coach?.name?.split(' ')[0]}:</strong> {recipeModal.recipe.coach_note}
                  </div>
                )}
                <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: '10px' }}>Ingredients</h4>
                <div className="recipe-ingredients">
                  {(recipeModal.recipe.ingredients || []).map((ing, i) => (
                    <div key={i} className="recipe-ingredient-row">
                      <span>{ing.name}</span>
                      <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{ing.qty}</span>
                    </div>
                  ))}
                </div>
                <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', margin: '20px 0 10px' }}>Method</h4>
                <ol className="recipe-steps">
                  {(recipeModal.recipe.steps || []).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION: FOOD SCAN
// ═══════════════════════════════════════════════════════════════
function SectionFoodScan({ user, coach }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!coach) return;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/food/history?coachId=${coach.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
    }).then(r => r.json()).then(setHistory).catch(() => {}).finally(() => setLoading(false));
  }, [coach]);

  async function analyze(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/food/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
        body: JSON.stringify({ imageBase64: base64, coachId: coach.id }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      const imageUrl = `data:image/jpeg;base64,${base64}`;
      setResult({ ...data, image_base64: imageUrl });
      setHistory(prev => [{ ...data, image_base64: imageUrl, created_at: new Date().toISOString() }, ...prev]);
      showToast('Meal analyzed!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div>
      <Section title="Food Scan">
        <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--card)', borderRadius: '16px', border: '2px dashed var(--border)', marginBottom: '20px', cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--muted)' }}><IconCamera size={40} /></div>
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>
            {analyzing ? 'Analyzing your meal…' : 'Take a photo of your meal'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            AI will estimate calories, protein, carbs & fat
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={analyze} disabled={analyzing} />
        </div>

        {result && (
          <div style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>{result.meal_name}</div>
              <div style={{ fontSize: '12px', fontWeight: '700', background: result.health_score >= 7 ? 'rgba(46,204,106,0.15)' : 'rgba(255,77,28,0.12)', color: result.health_score >= 7 ? '#2ecc6a' : '#ff4d1c', padding: '4px 12px', borderRadius: '100px' }}>
                {result.health_score}/10
              </div>
            </div>
            <div className="foodscan-macros">
              {[['🔥', result.calories, 'kcal'], ['💪', `${result.protein}g`, 'protein'], ['🌾', `${result.carbs}g`, 'carbs'], ['🧈', `${result.fat}g`, 'fat']].map(([icon, val, label]) => (
                <div key={label} style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: '10px', padding: '10px 6px' }}>
                  <div style={{ fontSize: '18px' }}>{icon}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700' }}>{val}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{label}</div>
                </div>
              ))}
            </div>
            {result.coach_comment && (
              <div style={{ background: 'rgba(200,255,0,0.07)', border: '1px solid rgba(200,255,0,0.15)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--lime)' }}>{coach?.name?.split(' ')[0]}:</strong> {result.coach_comment}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Recent scans">
        {loading ? <LoadingSkeleton type="list" /> : history.length === 0 ? (
          <EmptyState message="No food scans yet. Take a photo of your next meal!" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {history.map((item, i) => (
              <div key={i} style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '120px', overflow: 'hidden', background: 'var(--border)' }}>
                  {item.image_base64 && item.image_base64.length > 100
  ? <img src={item.image_base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}><IconUtensils size={28} /></div>}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.meal_name || 'Meal'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>{item.calories} kcal · {item.protein}g protein</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{timeAgo(item.created_at)}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: item.health_score >= 7 ? '#2ecc6a' : '#ff4d1c' }}>{item.health_score}/10</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// SECTION: COMMUNITY
// ═══════════════════════════════════════════════════════════════
function SectionCommunity({ user, coach }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState(null); // postId
  const [comments, setComments] = useState({});
  const [commentInput, setCommentInput] = useState('');
  const [likedIds, setLikedIds] = useState(new Set());
  const [pendingMedia, setPendingMedia] = useState(null); // { type: 'image'|'audio', base64 }
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (!coach) return;
    getPosts(coach.id)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coach]);

  async function handlePickImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPendingMedia({ type: 'image', base64: compressed });
    } catch {
      showToast('Failed to process image', 'error');
    }
    e.target.value = '';
  }

  async function startRecording() {
    try {
      recorderRef.current = createRecorder({
        maxSeconds: 120,
        onStop: async (blob) => {
          setRecording(false);
          clearInterval(recordIntervalRef.current);
          const base64 = await blobToBase64(blob);
          setPendingMedia({ type: 'audio', base64 });
        },
      });
      await recorderRef.current.start();
      setRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      showToast('Microphone access denied', 'error');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function post(e) {
    e.preventDefault();
    const text = newPost.trim();
    if (!text && !pendingMedia) return;
    if (posting) return;
    setPosting(true);
    const media = pendingMedia;
    setPendingMedia(null);
    try {
      let photo, audioUrl;
      if (media?.type === 'image') photo = await uploadMedia(media.base64, `post_${Date.now()}.jpg`, 'image/jpeg');
      else if (media?.type === 'audio') audioUrl = await uploadMedia(media.base64, `post_${Date.now()}.webm`, 'audio/webm');

      const p = await createPost(coach.id, text || null, photo, audioUrl);
      setPosts((prev) => [{ ...p, user: { name: user?.name }, comment_count: 0 }, ...prev]);
      setNewPost('');
      showToast('Posted!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPosting(false);
    }
  }

  async function like(postId) {
    if (likedIds.has(postId)) return;
    setLikedIds((prev) => new Set([...prev, postId]));
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: (p.likes || 0) + 1, likes_count: (p.likes_count || p.likes || 0) + 1 } : p));
    await likePost(postId).catch(() => {});
  }

  async function loadComments(postId) {
    if (openComments === postId) { setOpenComments(null); return; }
    setOpenComments(postId);
    if (comments[postId]) return;
    try {
      const c = await getComments(postId);
      setComments((prev) => ({ ...prev, [postId]: c }));
    } catch {}
  }

  async function submitComment(postId) {
    const text = commentInput.trim();
    if (!text) return;
    setCommentInput('');
    try {
      const c = await createComment(postId, text);
      const enriched = { ...c, user: { name: user?.name } };
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), enriched] }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) return <LoadingSkeleton type="list" />;

  return (
    <div>
      {/* Post composer */}
      <Section>
        <form className="post-composer" onSubmit={post}>
          <div className="post-composer-av" style={{ background: avatarColor(user?.id) }}>
            {initials(user?.name)}
          </div>
          <div className="post-composer-right" style={{ width: '100%' }}>
            <textarea
              className="post-composer-input"
              placeholder={`Share with ${coach?.name?.split(' ')[0]}'s community…`}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={2}
            />

            {pendingMedia && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                {pendingMedia.type === 'image' ? (
                  <img src={pendingMedia.base64} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                ) : (
                  <audio controls src={pendingMedia.base64} style={{ height: '32px', maxWidth: '200px' }} />
                )}
                <button type="button" onClick={() => setPendingMedia(null)} style={{ background: 'none', border: 'none', color: '#ff4d1c', fontSize: '16px', cursor: 'pointer' }}>×</button>
              </div>
            )}

            {recording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', color: '#ff4d1c', fontWeight: '600' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d1c', animation: 'pulse 1s infinite' }} />
                Recording… {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}
                <button type="button" onClick={stopRecording} style={{ padding: '4px 12px', borderRadius: '100px', border: 'none', background: '#ff4d1c', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Stop</button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePickImage} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePickImage} />
                <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={recording} title="Camera" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', display: 'flex', alignItems: 'center' }}><IconCamera /></button>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={recording} title="Gallery" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', display: 'flex', alignItems: 'center' }}><IconImage /></button>
                <button type="button" onClick={startRecording} disabled={recording} title="Record voice note" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', display: 'flex', alignItems: 'center' }}><IconMic /></button>
              </div>
              <button
                type="submit"
                className="btn-primary btn-sm"
                disabled={(!newPost.trim() && !pendingMedia) || posting}
                style={{ opacity: posting ? 0.7 : 1 }}
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      </Section>

      {/* Feed */}
      {posts.length === 0 ? (
        <EmptyState message="No community posts yet. Be the first to share!" />
      ) : (
        <div className="post-feed">
          {posts.map((p) => (
            <div key={p.id} className="post-card">
              <div className="post-header">
                <div className="post-av" style={{ background: avatarColor(p.user_id) }}>
                  {p.user?.photo
                    ? <img src={p.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : initials(p.user?.name)}
                </div>
                <div>
                  <div className="post-author">{p.user?.name || 'Member'}</div>
                  <div className="post-time">{timeAgo(p.created_at)}</div>
                </div>
              </div>
              {p.content && <div className="post-body">{p.content}</div>}
              {p.photo && <img src={p.photo} alt="" className="post-photo" />}
              {p.audio_url && <audio controls src={p.audio_url} style={{ display: 'block', width: '100%', marginTop: '8px' }} />}
              <div className="post-actions">
                <button
                  className={`post-action${likedIds.has(p.id) ? ' liked' : ''}`}
                  onClick={() => like(p.id)}
                >
                  ♥ {fmt(p.likes_count || p.likes || 0)}
                </button>
                <button className="post-action" onClick={() => loadComments(p.id)}>
                  💬 {p.comment_count || 0}
                </button>
              </div>

              {/* Comments */}
              {openComments === p.id && (
                <div className="comments-wrap">
                  {(comments[p.id] || []).map((c) => (
                    <div key={c.id} className="comment-row">
                      <div className="comment-av" style={{ background: avatarColor(c.user_id) }}>
                        {initials(c.user?.name)}
                      </div>
                      <div className="comment-bubble">
                        <span className="comment-author">{c.user?.name || 'Member'}</span>
                        {' '}{c.content}
                      </div>
                    </div>
                  ))}
                  <div className="comment-input-row">
                    <input
                      className="comment-input"
                      placeholder="Add a comment…"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitComment(p.id); } }}
                    />
                    <button className="comment-send" onClick={() => submitComment(p.id)}>↑</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION: MY PROGRESS (check-ins)
// ═══════════════════════════════════════════════════════════════
function SectionProgress({ user, coach }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weight: '', energy: '', sleep: '', motivation: '', nutritionFollowed: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  function setF(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  useEffect(() => {
    if (!coach) return;
    getCheckins(coach.id)
      .then(setCheckins)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coach]);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        coachId: coach.id,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        energy: form.energy ? parseInt(form.energy) : undefined,
        sleep: form.sleep ? parseFloat(form.sleep) : undefined,
        motivation: form.motivation ? parseInt(form.motivation) : undefined,
        nutritionFollowed: form.nutritionFollowed ? parseInt(form.nutritionFollowed) : undefined,
        notes: form.notes || undefined,
      };
      const res = await submitCheckin(payload);
      setCheckins((prev) => [res, ...prev]);
      setForm({ weight: '', energy: '', sleep: '', motivation: '', nutritionFollowed: '', notes: '' });
      setShowForm(false);
      showToast('Check-in submitted!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSkeleton type="list" />;

  const ratingField = (key, label, max = 5) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
        {label} (1–{max})
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setF(key, String(v))}
            style={{
              width: '38px', height: '38px', borderRadius: '10px',
              border: `2px solid ${form[key] === String(v) ? 'var(--orange)' : 'var(--border)'}`,
              background: form[key] === String(v) ? 'var(--orange)' : 'var(--card)',
              color: form[key] === String(v) ? '#fff' : 'var(--text)',
              fontWeight: '700', fontSize: '14px', cursor: 'pointer',
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <Section
        title="My progress"
        action={
          <button className="btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Check in'}
          </button>
        }
      >
        {/* Check-in form */}
        {showForm && (
          <div className="checkin-form-wrap">
            <form onSubmit={submit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Weight (optional)
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 82.5"
                  value={form.weight}
                  onChange={(e) => setF('weight', e.target.value)}
                  style={{ maxWidth: '180px' }}
                />
              </div>

              {ratingField('energy', 'Energy level')}
              {ratingField('sleep', 'Sleep quality')}
              {ratingField('motivation', 'Motivation')}
              {ratingField('nutritionFollowed', 'Nutrition adherence')}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Notes for your coach (optional)
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Anything your coach should know about this week…"
                  value={form.notes}
                  onChange={(e) => setF('notes', e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Submitting…' : 'Submit check-in'}
              </button>
            </form>
          </div>
        )}

        {/* History */}
        {checkins.length === 0 && !showForm ? (
          <EmptyState
            message="No check-ins yet. Submit your first one to start tracking your progress."
            cta="Check in now"
            onCta={() => setShowForm(true)}
          />
        ) : (
          <div className="checkin-history">
            {checkins.map((c) => (
              <div key={c.id} className="checkin-card">
                <div className="checkin-date">{new Date(c.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div className="checkin-metrics">
                  {c.weight && <div className="metric"><span>{c.weight}kg</span><label>weight</label></div>}
                  {c.energy != null && <div className="metric"><span>{c.energy}/5</span><label>energy</label></div>}
                  {c.sleep != null && <div className="metric"><span>{c.sleep}/5</span><label>sleep</label></div>}
                  {c.motivation != null && <div className="metric"><span>{c.motivation}/5</span><label>motivation</label></div>}
                  {c.nutrition_followed != null && <div className="metric"><span>{c.nutrition_followed}/5</span><label>nutrition</label></div>}
                </div>
                {c.notes && <div className="checkin-notes">{c.notes}</div>}
                {c.coach_reply && (
                  <div className="checkin-coach-reply">
                    <strong>{coach?.name?.split(' ')[0]}:</strong> {c.coach_reply}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION: CONTENT LIBRARY
// ═══════════════════════════════════════════════════════════════
function SectionContent({ coach }) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!coach) return;
    getContent(coach.id)
      .then(setContent)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coach]);

  const types = ['all', ...new Set(content.map((c) => c.content_type).filter(Boolean))];
  const filtered = filter === 'all' ? content : content.filter((c) => c.content_type === filter);
  const unlocked = filtered.filter((c) => !c.is_locked);
  const locked = filtered.filter((c) => c.is_locked);

  if (loading) return <LoadingSkeleton type="card" count={4} />;
  if (content.length === 0) return <EmptyState message="Your coach hasn't added any content yet. Check back soon." />;

  return (
    <div>
      {/* Filter strip */}
      {types.length > 1 && (
        <div className="content-filters">
          {types.map((t) => (
            <button
              key={t}
              className={`filter-pill${filter === t ? ' active' : ''}`}
              onClick={() => setFilter(t)}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      )}

      {/* Unlocked content */}
      {unlocked.length > 0 && (
        <div className="content-grid">
          {unlocked.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Locked content */}
      {locked.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px' }}>
            Coming in week {locked[0]?.week_number}+
          </div>
          <div className="content-grid">
            {locked.map((item) => (
              <ContentCard key={item.id} item={item} locked />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContentCard({ item, locked }) {
  const typeIcon = { video: '▶', pdf: '📄', article: '📝', audio: '🎧' };

  return (
    <div className={`content-card${locked ? ' locked' : ''}`}>
      <div className="content-card-top">
        <span className="content-type-badge">{typeIcon[item.content_type] || '📁'} {item.content_type || 'Resource'}</span>
        {item.week_number && <span className="content-week">Week {item.week_number}</span>}
      </div>
      <div className="content-title">{item.title}</div>
      {item.description && <div className="content-desc">{item.description}</div>}
      {locked ? (
        <div className="content-locked-msg">🔒 Unlocks in week {item.week_number}</div>
      ) : item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="content-link">
          Open {item.content_type === 'video' ? 'video' : 'resource'} →
        </a>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION: UPCOMING SESSIONS
// ═══════════════════════════════════════════════════════════════
function SectionSessions({ coach }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    getMeetings()
      .then(setMeetings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton type="list" />;

  const now = Date.now();
  const filtered = meetings.filter(m => m.coach_id === coach?.id);
  const upcoming = filtered.filter(m => m.status !== 'cancelled' && new Date(m.scheduled_at).getTime() >= now);

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  }
  function fmtFull(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + fmtTime(ts);
  }

  // Build calendar
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // make Mon=0

  // Map sessions by date string
  const sessionsByDay = {};
  filtered.filter(m => m.status !== 'cancelled').forEach(m => {
    const d = new Date(m.scheduled_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      if (!sessionsByDay[key]) sessionsByDay[key] = [];
      sessionsByDay[key].push(m);
    }
  });

  const today = new Date();
  const todayKey = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;

  const selectedSessions = selectedDay ? (sessionsByDay[selectedDay] || []) : [];

  return (
    <div>
      {/* Calendar card */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
        {/* Month header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setCurrentMonth(new Date(year, month - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '18px', padding: '4px 8px' }}>‹</button>
          <div style={{ fontSize: '15px', fontWeight: '700' }}>
            {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '18px', padding: '4px 8px' }}>›</button>
        </div>

        {/* Day labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 16px 4px' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', padding: '4px 16px 16px' }}>
          {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const hasSessions = !!sessionsByDay[day];
            const isToday = day === todayKey;
            const isSelected = day === selectedDay;
            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                style={{
                  position: 'relative', textAlign: 'center', padding: '8px 4px', borderRadius: '10px', cursor: hasSessions ? 'pointer' : 'default',
                  background: isSelected ? 'var(--dark)' : isToday ? 'rgba(200,255,0,0.12)' : 'transparent',
                  border: isToday && !isSelected ? '1px solid var(--lime)' : '1px solid transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: isToday || hasSessions ? '700' : '400', color: isSelected ? '#fff' : isToday ? '#fff' : hasSessions ? '#ff4d1c' : 'var(--dark)' }}>{day}</div>
                {hasSessions && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '3px' }}>
                    {sessionsByDay[day].slice(0, 3).map((_, i) => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSelected || isToday ? '#fff' : '#ff4d1c' }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day sessions */}
      {selectedDay && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {new Date(year, month, selectedDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {selectedSessions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>No sessions this day.</div>
          ) : selectedSessions.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '10px' }}>
              <div className="chat-av" style={{ background: coach?.photo ? 'transparent' : avatarColor(coach?.id), flexShrink: 0 }}>
                {coach?.photo ? <img src={coach.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(coach?.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>{m.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{fmtTime(m.scheduled_at)}</div>
                {m.notes && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{m.notes}</div>}
              </div>
              {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm" style={{ flexShrink: 0 }}>Join call</a>}
            </div>
          ))}
        </div>
      )}

      {/* Upcoming list */}
      <Section title="Upcoming sessions">
        {upcoming.length === 0 ? (
          <EmptyState message="No upcoming sessions. Your coach will schedule one soon." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming.sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)).map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ flexShrink: 0, textAlign: 'center', width: '44px', padding: '6px', background: 'rgba(200,255,0,0.08)', borderRadius: '10px', border: '1px solid rgba(200,255,0,0.2)' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--lime)', lineHeight: 1 }}>{new Date(m.scheduled_at).getDate()}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', marginTop: '2px' }}>{new Date(m.scheduled_at).toLocaleDateString('en-GB', { month: 'short' })}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{m.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{fmtFull(m.scheduled_at)}</div>
                  {m.notes && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>{m.notes}</div>}
                </div>
                {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm" style={{ flexShrink: 0 }}>Join</a>}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
  

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION SWITCHER (coach picker)
// ═══════════════════════════════════════════════════════════════
function SectionSwitchCoach({ subscriptions, currentCoachId, onSwitch, onBrowse }) {
  return (
    <div>
      <Section title="My coaches">
        {subscriptions.length === 0 ? (
          <EmptyState
            message="You're not subscribed to any coaches yet."
            cta="Browse coaches"
            onCta={onBrowse}
          />
        ) : (
          <div className="switch-coach-list">
            {subscriptions.map((sub) => {
              const c = sub.coach;
              if (!c) return null;
              const active = c.id === currentCoachId;
              return (
                <div
                  key={sub.id}
                  className={`switch-coach-row${active ? ' active' : ''}`}
                  onClick={() => onSwitch(c.id)}
                >
                  <div className="switch-coach-av" style={{ background: c.photo ? 'transparent' : avatarColor(c.id) }}>
                    {c.photo
                      ? <img src={c.photo} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : initials(c.name)}
                  </div>
                  <div className="switch-coach-info">
                    <div className="switch-coach-name">{c.name}</div>
                    <div className="switch-coach-sport">{c.sport || ''} · {sub.plan_months}mo plan</div>
                  </div>
                  {active && <span className="active-pill">Active</span>}
                </div>
              );
            })}
          </div>
        )}
        <button className="btn-sm" style={{ marginTop: '16px' }} onClick={onBrowse}>
          + Browse more coaches
        </button>
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function UserDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [coach, setCoach] = useState(null);
  const [activeCoachId, setActiveCoachId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [section, setSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // DM unread badge
  const [dmUnread, setDmUnread] = useState(0);
  const [sidebarMeetings, setSidebarMeetings] = useState([]);
  const [sessionsUnread, setSessionsUnread] = useState(0);
  const [communityUnread, setCommunityUnread] = useState(0);
  const [contentUnread, setContentUnread] = useState(0);
  const [chatFlaggedUnread, setChatFlaggedUnread] = useState(0);
  const [mutedTypes, setMutedTypes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('coachly_muted') || '[]'); } catch { return []; }
  });

  // Load user + subscriptions on mount
  useEffect(() => {
    Promise.all([getUserMe(), getUserSubscriptions()])
      .then(async ([u, subs]) => {
        setUser(u);
        setSubscriptions(subs);

        if (!subs || subs.length === 0) { setLoading(false); return; }

        // Determine active coach from URL param or first sub
        const paramCoach = searchParams.get('coach');
        const targetId = paramCoach || subs[0]?.coach_id;
        setActiveCoachId(targetId);

        // Fetch coach profile
        const c = await getCoach(targetId).catch(() => null);
        setCoach(c);
      })
      .catch((err) => {
        showToast(err.message, 'error');
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, []);

  // Switch coach
  async function switchCoach(coachId) {
    if (coachId === activeCoachId) { setSection('home'); return; }
    setActiveCoachId(coachId);
    setSearchParams({ coach: coachId });
    setCoach(null);
    setSection('home');
    const c = await getCoach(coachId).catch(() => null);
    setCoach(c);
  }

  // Check DM unread count on section change
  useEffect(() => {
    if (!coach) return;
    getMeetings().then(setSidebarMeetings).catch(() => {});
  }, [coach]);

  useEffect(() => {
    if (!coach || section !== 'dm') return;
    getDMs(coach.id).then((dms) => {
      const unread = dms.filter((m) => m.sender_type === 'coach' && !m.is_read).length;
      setDmUnread(unread);
    }).catch(() => {});
  }, [coach, section]);

  // Poll all notification-based badges (sessions, community, content)
  useEffect(() => {
    async function pollBadges() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/notifications`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setSessionsUnread(list.filter(n => !n.is_read && (n.type === 'new_session' || n.type === 'session_cancelled')).length);
        setCommunityUnread(list.filter(n => !n.is_read && n.type === 'community_post').length);
        setContentUnread(list.filter(n => !n.is_read && n.type === 'new_content').length);
      } catch {}
    }
    pollBadges();
    const interval = setInterval(pollBadges, 8000);
    return () => clearInterval(interval);
  }, []);

  // AI Coach flagged messages badge
  useEffect(() => {
    if (!coach) return;
    getChatHistory(coach.id).then((msgs) => {
      const flagged = (msgs || []).filter(m => m.flagged && !m.seen_by_user).length;
      setChatFlaggedUnread(flagged);
    }).catch(() => {});
  }, [coach]);

  // Poll subscription status while pending — auto-switches to the full dashboard the moment the coach approves
  const pendingStatus = subscriptions.find((s) => s.coach_id === activeCoachId)?.status;
  const isPending = pendingStatus === 'pending_payment';
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(async () => {
      try {
        const subs = await getUserSubscriptions();
        const updated = subs.find((s) => s.coach_id === activeCoachId);
        if (updated && updated.status !== 'pending_payment') {
          showToast('Your coach approved you! Welcome aboard 🎉', 'success');
        }
        setSubscriptions(subs);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [isPending, activeCoachId]);

  function navigate2(s) {
    if (s === 'switch-coach') { setSection('switch-coach'); return; }
    setSection(s);
    setSidebarOpen(false);
    if (s === 'sessions') {
      setSessionsUnread(0);
      markBadgeRead('new_session', 'session_cancelled');
    }
    if (s === 'community') {
      setCommunityUnread(0);
      markBadgeRead('community_post');
    }
    if (s === 'content') {
      setContentUnread(0);
      markBadgeRead('new_content');
    }
    if (s === 'chat') {
      setChatFlaggedUnread(0);
      if (coach) {
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/chat/seen`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
          body: JSON.stringify({ coachId: coach.id }),
        }).catch(() => {});
      }
    }
  }

  async function markBadgeRead(...types) {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
      });
      const data = await res.json();
      const toMark = (Array.isArray(data) ? data : []).filter(n => !n.is_read && types.includes(n.type));
      await Promise.all(toMark.map(n =>
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/notifications/${n.id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
        }).catch(() => {})
      ));
    } catch {}
  }

  const activeSub = subscriptions.find((s) => s.coach_id === activeCoachId && s.status === 'active')
    || subscriptions.find((s) => s.coach_id === activeCoachId);

  // Enrich subscriptions with coach data (we only have the active one loaded)
  const enrichedSubs = subscriptions.map((s) => ({
    ...s,
    coach: s.coach_id === activeCoachId ? coach : { id: s.coach_id, name: `Coach` },
  }));

  const badges = {
    dm: dmUnread > 0 ? dmUnread : null,
    chat: chatFlaggedUnread > 0 ? chatFlaggedUnread : null,
    sessions: sessionsUnread > 0 ? sessionsUnread : null,
    community: communityUnread > 0 ? communityUnread : null,
    content: contentUnread > 0 ? contentUnread : null,
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Coachly</div>
          <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading your dashboard…</div>
        </div>
      </div>
    );
  }

  // Subscription pending coach approval — show waiting screen, auto-unlocks via polling above
  const pendingSub = subscriptions.find((s) => s.coach_id === activeCoachId && s.status === 'pending_payment');
  if (pendingSub) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
        <Toast />
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: coach?.photo ? 'transparent' : avatarColor(coach?.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: '#fff' }}>
          {coach?.photo ? <img src={coach.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(coach?.name)}
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '700' }}>
          Waiting for {coach?.name?.split(' ')[0] || 'your coach'}'s approval
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '360px', lineHeight: '1.6' }}>
          Your payment proof was submitted. {coach?.name?.split(' ')[0] || 'Your coach'} reviews requests within 24–48h — this page switches to your dashboard automatically once you're approved, no need to refresh.
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d1c', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Checking for updates…</span>
        </div>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
          onClick={async () => { await logout().catch(() => {}); navigate('/'); }}
        >
          Log out
        </button>
      </div>
    );
  }

  // No subscriptions
  if (subscriptions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
        <Toast />
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '700' }}>
          Welcome, {user?.name?.split(' ')[0] || 'there'}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '15px', maxWidth: '360px', lineHeight: '1.6' }}>
          You're not subscribed to any coaches yet. Browse the marketplace to find your perfect match.
        </div>
        <button className="btn-primary" onClick={() => navigate('/')}>Browse coaches</button>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}
          onClick={async () => { await logout().catch(() => {}); navigate('/'); }}
        >
          Log out
        </button>
      </div>
    );
  }

  const sectionTitles = {
    home: 'Dashboard', chat: 'AI Coach', dm: 'Message Coach',
    strategy: 'My Strategy', nutrition: 'Nutrition', community: 'Community',
    progress: 'My Progress', content: 'Content Library', 'switch-coach': 'My Coaches', profile: 'My Profile', foodscan: 'Food Scan', sessions: 'Sessions',
  };

  return (
    <div className="dashboard-layout">
      <Toast />

      <Sidebar
        user={user}
        coach={coach}
        subscription={activeSub}
        activeSection={section}
        onNavigate={navigate2}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badges={badges}
        meetings={sidebarMeetings}
      />

      <div className="dash-main">
        {/* Top bar */}
        <div className="dash-topbar">
          <button className="topbar-menu-btn" onClick={() => setSidebarOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="topbar-title">{sectionTitles[section] || ''}</div>
          <NotificationBell
            token={localStorage.getItem('coachly_token')}
            mutedTypes={mutedTypes}
            onMuteToggle={(type) => setMutedTypes(prev =>
              prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
            )}
          />
          <button
            className="topbar-logout"
            onClick={async () => { await logout().catch(() => {}); navigate('/'); }}
            title="Log out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <div className="dash-content">
          {section === 'home' && <SectionHome user={user} coach={coach} subscription={activeSub} onNavigate={navigate2} />}
          {section === 'chat' && <SectionChat user={user} coach={coach} />}
          {section === 'dm' && <SectionDM user={user} coach={coach} />}
          {section === 'strategy' && <SectionStrategy coach={coach} />}
          {section === 'nutrition' && <SectionNutrition user={user} coach={coach} />}
          {section === 'foodscan' && <SectionFoodScan user={user} coach={coach} />}
          {section === 'community' && <SectionCommunity user={user} coach={coach} />}
          {section === 'progress' && <SectionProgress user={user} coach={coach} />}
          {section === 'content' && <SectionContent coach={coach} />}
          {section === 'sessions' && <SectionSessions coach={coach} />}
          {section === 'switch-coach' && (
            <SectionSwitchCoach
              subscriptions={enrichedSubs}
              currentCoachId={activeCoachId}
              onSwitch={switchCoach}
              onBrowse={() => navigate('/')}
            />
          )}
          {section === 'profile' && (
            <ProfileSection
              user={user}
              subscriptions={enrichedSubs}
              onUpdate={(updated, refreshSubs) => {
                if (updated) setUser(updated);
                if (refreshSubs) getUserSubscriptions().then(setSubscriptions).catch(() => {});
              }}
              onLogout={async () => { await logout().catch(() => {}); navigate('/'); }}
            />
          )}
        </div>
      </div>

      <BottomNav activeSection={section} onNavigate={navigate2} badges={badges} />
    </div>
  );
}
