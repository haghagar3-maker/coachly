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
  logout,
} from '../api';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Toast, { showToast } from '../components/Toast';
import ProfileSection from '../components/ProfileSection';

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
function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
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
      setLoggedIds(new Set(wl.map((l) => `${l.program_id}-${l.exercise_index}`)));
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
      const res = await sendChatMessage(text, coach.id);
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
  const bottomRef = useRef(null);

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

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const optimistic = { id: `opt-${Date.now()}`, sender_type: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const msg = await sendDM(coach.id, text);
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...msg } : m));
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
              {msg.content}
              <div className="chat-msg-time">{timeAgo(msg.created_at)}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={send}>
        <input
          className="chat-input"
          placeholder="Message your coach…"
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
// SECTION: STRATEGY (workout program)
// ═══════════════════════════════════════════════════════════════
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
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏋️</div>
      <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No program yet</div>
      <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>Generate a personalized workout program based on your coach's method and your goals.</div>
      <button className="btn-primary" onClick={generate} disabled={generating}>
        {generating ? 'Generating your program…' : '✨ Generate my program'}
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
      setLoggedIds(new Set(wl.map((l) => `${l.program_id}-${l.exercise_index}`)));
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

  // Group by week
  const weeks = {};
  program.forEach((p) => {
    const w = p.week_number || 1;
    if (!weeks[w]) weeks[w] = [];
    weeks[w].push(p);
  });

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
                      {day.focus && <span className="strategy-focus">{day.focus}</span>}
                    </div>
                    <div className="strategy-day-right">
                      {exercises.length > 0 && (
                        <span className="strategy-progress">
                          {completedCount}/{exercises.length}
                        </span>
                      )}
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
  const [recipeModal, setRecipeModal] = useState(null); // { mealName, recipe, loading }

  useEffect(() => {
    if (!coach) return;
    getTodayMeals(coach.id)
      .then(setMeals)
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
    { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { key: 'lunch', label: 'Lunch', icon: '☀️' },
    { key: 'snack', label: 'Snack', icon: '🍎' },
    { key: 'dinner', label: 'Dinner', icon: '🌙' },
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
      <div className="meal-grid">
        {mealSlots.map(({ key, label, icon }) => {
          const mealName = meals?.[key];
          return (
            <div
              key={key}
              className={`meal-card${mealName ? ' has-meal' : ''}`}
              onClick={() => mealName && openRecipe(mealName)}
              style={{ cursor: mealName ? 'pointer' : 'default' }}
            >
              <div className="meal-slot-label">
                <span className="meal-icon">{icon}</span>
                {label}
              </div>
              {mealName ? (
                <div className="meal-name">{mealName}</div>
              ) : (
                <div className="meal-empty">No meal planned</div>
              )}
              {mealName && <div className="meal-tap">Tap for recipe →</div>}
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
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📸</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
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
                  {item.image_base64 ? <img src={item.image_base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🍽️</div>}
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

  useEffect(() => {
    if (!coach) return;
    getPosts(coach.id)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coach]);

  async function post(e) {
    e.preventDefault();
    const text = newPost.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const p = await createPost(coach.id, text, null);
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
          <div className="post-composer-right">
            <textarea
              className="post-composer-input"
              placeholder={`Share with ${coach?.name?.split(' ')[0]}'s community…`}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={2}
            />
            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={!newPost.trim() || posting}
              style={{ alignSelf: 'flex-end', opacity: posting ? 0.7 : 1 }}
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
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
              <div className="post-body">{p.content}</div>
              {p.photo && <img src={p.photo} alt="" className="post-photo" />}
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
    if (!coach || section !== 'dm') return;
    getDMs(coach.id).then((dms) => {
      const unread = dms.filter((m) => m.sender_type === 'coach' && !m.is_read).length;
      setDmUnread(unread);
    }).catch(() => {});
  }, [coach, section]);

  function navigate2(s) {
    if (s === 'switch-coach') { setSection('switch-coach'); return; }
    setSection(s);
    setSidebarOpen(false);
  }

  const activeSub = subscriptions.find((s) => s.coach_id === activeCoachId && s.status === 'active')
    || subscriptions.find((s) => s.coach_id === activeCoachId);

  // Enrich subscriptions with coach data (we only have the active one loaded)
  const enrichedSubs = subscriptions.map((s) => ({
    ...s,
    coach: s.coach_id === activeCoachId ? coach : { id: s.coach_id, name: `Coach` },
  }));

  const badges = { dm: dmUnread > 0 ? dmUnread : null };

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
    progress: 'My Progress', content: 'Content Library', 'switch-coach': 'My Coaches', profile: 'My Profile', foodscan: 'Food Scan',
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
