import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCoachMe,
  getCoachStats,
  getCoachClients,
  getCoachClient,
  getCoachDirectMessages,
  sendCoachDirectMessage,
  getCoachAiConversations,
  getCoachCheckins,
  replyCheckin,
  updateCoachProfile,
  getCoachContent,
  createCoachContent,
  updateCoachContent,
  deleteCoachContent,
  updateCoachAiTraining,
  clearToken,
} from '../api';

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const c = await getCoachMe();
        setCoach(c);
      } catch (err) {
        clearToken();
        navigate('/coach/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  function handleLogout() {
    clearToken();
    navigate('/coach/login');
  }

  function navTo(s) { setActiveSection(s); setSidebarOpen(false); }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '18px', fontWeight: '800', marginBottom: '10px' }}>Coachly<span style={{ color: 'var(--lime)' }}>.</span></div>
          <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Loading your dashboard…</div>
        </div>
      </div>
    );
  }
  if (!coach) return null;

  const sectionLabel = {
    overview: 'Overview', clients: 'Clients', messages: 'Messages',
    ai: 'AI Conversations', store: 'Store Editor', content: 'Program Content', training: 'AI Training',
  };

  return (
    // ── Use dashboard-layout so the same CSS rules apply ──
    <div className="dashboard-layout">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' mobile-open' : ''}`}>
        <div className="sb-logo">Coachly<span>.</span></div>

        <div className="sb-coach">
          <div className="sb-avatar">
            {coach.photo
              ? <img src={coach.photo} alt={coach.name} />
              : coach.name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-name">{coach.name}</div>
            <div className="sb-role">Coach</div>
            <div className="sb-status"><span className="sb-status-dot" />Active</div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section-label">Dashboard</div>
          {[
            { id: 'overview', label: 'Overview', icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
            { id: 'clients',  label: 'Clients',  icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { id: 'messages', label: 'Messages', icon: <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { id: 'ai',       label: 'AI Conversations', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> },
          ].map(({ id, label, icon }) => (
            <button key={id} className={`nav-item${activeSection === id ? ' active' : ''}`} onClick={() => navTo(id)}>
              {icon}{label}
            </button>
          ))}

          <div className="sb-section-label">Manage</div>
          {[
            { id: 'store',    label: 'Store Editor',    icon: <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
            { id: 'content',  label: 'Program Content', icon: <svg viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg> },
            { id: 'training', label: 'AI Training',     icon: <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
          ].map(({ id, label, icon }) => (
            <button key={id} className={`nav-item${activeSection === id ? ' active' : ''}`} onClick={() => navTo(id)}>
              {icon}{label}
            </button>
          ))}
        </nav>

        <div className="sb-bottom">
          <button className="sb-view-store" onClick={() => window.open(`/coach/${coach.id}`, '_blank')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View my store
          </button>
          <button className="sb-logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <span className="topbar-title">{sectionLabel[activeSection]}</span>
          </div>
          <div className="topbar-right">
            <span className="tb-date">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Content */}
        <div className="page-content">
          {activeSection === 'overview'  && <SectionOverview coach={coach} />}
          {activeSection === 'clients'   && <SectionClients  coach={coach} />}
          {activeSection === 'messages'  && <SectionMessages coach={coach} />}
          {activeSection === 'ai'        && <SectionAI       coach={coach} />}
          {activeSection === 'store'     && <SectionStore    coach={coach} setCoach={setCoach} />}
          {activeSection === 'content'   && <SectionContent  coach={coach} />}
          {activeSection === 'training'  && <SectionTraining coach={coach} setCoach={setCoach} />}
        </div>
      </main>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────
const AVATAR_COLORS = ['#E8633A','#2a7a4f','#5a5ac8','#c94e2a','#2d6b47','#8b5cf6','#0891b2'];
function avatarBg(str) {
  if (!str) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name) { return name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0,2) || '?'; }
function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════
function SectionOverview({ coach }) {
  const [stats, setStats] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCoachStats(), getCoachCheckins()])
      .then(([s, c]) => { setStats(s); setCheckins(c.slice(0, 5)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  return (
    <>
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Active subscribers', value: stats?.activeSubscribers || 0 },
          { label: 'Revenue this month', value: `$${(stats?.revenueThisMonth || 0).toFixed(0)}`, dark: true },
          { label: 'AI conversations', value: stats?.aiConversationsThisWeek || 0, sub: 'this week' },
          { label: 'Goals reached', value: stats?.goalsReached || 0, sub: 'milestones' },
        ].map(({ label, value, sub, dark }) => (
          <div key={label} className={`stat-card${dark ? ' dark' : ''}`}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            {sub && <div className="stat-sub">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head"><div className="card-title">Recent check-ins</div></div>
          <div className="activity-list">
            {checkins.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No recent check-ins</div>
            ) : checkins.map(c => (
              <div key={c.id} className="act-item">
                <div className="act-av" style={{ background: avatarBg(c.user_name) }}>{initials(c.user_name)}</div>
                <div className="act-body">
                  <div className="act-name">{c.user_name}</div>
                  <div className="act-text">Submitted check-in · Energy {c.energy ?? '?'}/5</div>
                  <div className="act-time">{timeAgo(c.created_at)}</div>
                </div>
                <span className="act-tag tag-goal">Check-in</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Quick actions</div></div>
          <div className="quick-actions">
            {[
              { label: 'Reply to clients', desc: 'View and respond to messages', section: 'messages' },
              { label: 'Review AI conversations', desc: 'Monitor AI coach interactions', section: 'ai' },
              { label: 'Upload content', desc: 'Add videos, guides, or resources', section: 'content' },
            ].map(({ label, desc, section }) => (
              <button key={label} className="qa-btn" onClick={() => {}}>
                <div className="qa-icon">
                  <svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div className="qa-label">{label}</div>
                  <div className="qa-desc">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// CLIENTS
// ═══════════════════════════════════════════════════════════════
function SectionClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getCoachClients().then(setClients).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  const filtered = clients.filter(c => {
    if (filter === 'active' && c.subscription_status !== 'active') return false;
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="clients-toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-btn${filter === 'active' ? ' active' : ''}`} onClick={() => setFilter('active')}>Active only</button>
      </div>

      <div className="clients-table">
        <div className="ct-head">
          <div>Client</div><div>Plan</div><div>Progress</div><div>Status</div><div>Actions</div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            No clients yet. Share your store link to get subscribers.
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="ct-row">
            <div className="ct-user">
              <div className="ct-av" style={{ background: avatarBg(c.name) }}>{initials(c.name)}</div>
              <div><div className="ct-name">{c.name}</div><div className="ct-email">{c.email}</div></div>
            </div>
            <div className="ct-cell">{c.plan_months} months</div>
            <div className="ct-cell">
              Month {c.current_month || 1} of {c.plan_months}
              <div className="progress-bar-sm"><div className="progress-bar-fill" style={{ width: `${((c.current_month || 1) / c.plan_months) * 100}%` }} /></div>
            </div>
            <div className="ct-cell">
              <span className={`ct-badge${c.subscription_status === 'active' ? ' badge-active' : ''}`}>{c.subscription_status || 'active'}</span>
            </div>
            <div className="ct-actions">
              <button className="ct-act-btn" title="View"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
              <button className="ct-act-btn" title="Message"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════
function SectionMessages({ coach }) {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCoachDirectMessages().then(setThreads).catch(console.error).finally(() => setLoading(false));
  }, []);

  function openThread(t) { setActiveThread(t); setMessages(t.messages || []); }

  async function send() {
    if (!input.trim() || !activeThread) return;
    try {
      await sendCoachDirectMessage(activeThread.user_id, input);
      setMessages(prev => [...prev, { id: Date.now(), sender_type: 'coach', content: input, created_at: new Date().toISOString() }]);
      setInput('');
    } catch (err) { console.error(err); }
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  return (
    <div className="messages-wrap">
      <div className="msg-list">
        <div className="msg-list-head">Direct Messages</div>
        {threads.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>No messages yet</div>
        ) : threads.map(t => (
          <div key={t.user_id} className={`msg-thread${activeThread?.user_id === t.user_id ? ' active' : ''}`} onClick={() => openThread(t)}>
            <div className="mt-av" style={{ background: avatarBg(t.user_name) }}>{initials(t.user_name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mt-name">{t.user_name}</div>
              <div className="mt-preview">{t.last_message || 'No messages yet'}</div>
            </div>
            <div className="mt-time">{t.last_message_time ? timeAgo(t.last_message_time) : ''}</div>
            {t.unread_count > 0 && <div className="mt-unread" />}
          </div>
        ))}
      </div>

      <div className="chat-area">
        {!activeThread ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '13px' }}>
            Select a conversation
          </div>
        ) : (
          <>
            <div className="chat-head">
              <div className="ch-coach">
                <div className="ch-av" style={{ background: avatarBg(activeThread.user_name) }}>{initials(activeThread.user_name)}</div>
                <div>
                  <div className="ch-name">{activeThread.user_name}</div>
                  <div className="ch-status"><span className="ch-status-dot" />Active subscriber</div>
                </div>
              </div>
            </div>
            <div className="chat-messages">
              {messages.map(m => (
                <div key={m.id} className={`msg-wrap${m.sender_type === 'coach' ? ' user-msg' : ''}`}>
                  <div className="msg-av" style={{ background: m.sender_type === 'coach' ? 'var(--dark)' : avatarBg(activeThread.user_name) }}>
                    {m.sender_type === 'coach' ? initials(coach.name) : initials(activeThread.user_name)}
                  </div>
                  <div className={`bubble ${m.sender_type === 'coach' ? 'coach-bubble' : 'user-bubble'}`}>{m.content}</div>
                </div>
              ))}
            </div>
            <div className="chat-input-wrap">
              <input className="chat-input" placeholder="Type your message…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
              <button className="chat-send" onClick={send}>
                <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI CONVERSATIONS
// ═══════════════════════════════════════════════════════════════
function SectionAI({ coach }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getCoachAiConversations().then(setConversations).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  const filtered = conversations.filter(c => filter === 'all' || c.has_flagged);

  if (activeConv) return (
    <div>
      <button className="btn-secondary" onClick={() => setActiveConv(null)} style={{ marginBottom: '16px' }}>← Back</button>
      <div className="card">
        <div className="card-head"><div className="card-title">{activeConv.user_name} · AI conversation</div></div>
        <div className="chat-messages" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          {(activeConv.messages || []).map(m => (
            <div key={m.id} className={`msg-wrap${m.role === 'user' ? ' user-msg' : ''}`}>
              <div className="msg-av" style={{ background: m.role === 'assistant' ? 'linear-gradient(135deg,#1e3a2a,#2d6b47)' : avatarBg(activeConv.user_name) }}>
                {m.role === 'assistant' ? 'AI' : initials(activeConv.user_name)}
              </div>
              <div className={`bubble ${m.role === 'assistant' ? 'coach-b' : 'user-b'}`}>{m.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-btn${filter === 'flagged' ? ' active' : ''}`} onClick={() => setFilter('flagged')}>Flagged</button>
      </div>
      <div className="ai-clients-grid">
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            Conversations appear once clients start chatting with their AI coach.
          </div>
        ) : filtered.map(c => (
          <div key={c.user_id} className="ai-client-card" onClick={() => setActiveConv(c)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarBg(c.user_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{initials(c.user_name)}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{c.user_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{c.message_count || 0} messages</div>
              </div>
              {c.has_flagged && <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '700', background: 'var(--coral-bg)', color: 'var(--coral)', padding: '2px 8px', borderRadius: '100px' }}>Flagged</span>}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {c.last_message || 'No messages yet'}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// STORE EDITOR
// ═══════════════════════════════════════════════════════════════
function SectionStore({ coach, setCoach }) {
  const [form, setForm] = useState({
    name: coach.name || '', tagline: coach.tagline || '', bio: coach.bio || '',
    sport: coach.sport || '', location: coach.location || '',
    years_experience: coach.years_experience || '', plan_price: coach.plan_price || '',
  });
  const [saving, setSaving] = useState(false);

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    try { await updateCoachProfile(form); setCoach({ ...coach, ...form }); alert('Saved!'); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  const fields = [
    { key: 'name', label: 'Display name', type: 'text' },
    { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'e.g. Strength coach for busy professionals' },
    { key: 'bio', label: 'Bio', type: 'textarea', rows: 5 },
    { key: 'sport', label: 'Sport / Niche', type: 'text' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'years_experience', label: 'Years experience', type: 'number' },
    { key: 'plan_price', label: 'Monthly price (USD)', type: 'number', placeholder: '199' },
  ];

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="field-group">
        <div className="field-group-title">Store settings</div>
        {fields.map(({ key, label, type, placeholder, rows }) => (
          <div key={key} className="field">
            <label>{label}</label>
            {type === 'textarea'
              ? <textarea value={form[key]} onChange={e => upd(key, e.target.value)} rows={rows} placeholder={placeholder} />
              : <input type={type} value={form[key]} onChange={e => upd(key, e.target.value)} placeholder={placeholder} />}
          </div>
        ))}
      </div>
      <div className="save-bar">
        <div className="save-bar-left">Changes are saved live</div>
        <div className="save-bar-right">
          <button className="btn-save-live" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTENT
// ═══════════════════════════════════════════════════════════════
function SectionContent() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCoachContent().then(setContent).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  return (
    <div className="library-grid">
      {content.length === 0 ? (
        <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
          Upload your first content piece. Subscribers will see it immediately.
        </div>
      ) : content.map(c => (
        <div key={c.id} className="lib-card">
          <div className="lib-thumb">
            <div className={`lib-type-tag ${c.type === 'video' ? 'lt-video' : c.type === 'pdf' ? 'lt-pdf' : 'lt-guide'}`}>{c.type}</div>
          </div>
          <div className="lib-body">
            <div className="lib-name">{c.title}</div>
            <div className="lib-meta">{c.duration || 'No duration'}</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button className="content-btn">Edit</button>
              <button className="content-btn" style={{ color: 'var(--coral)', borderColor: 'rgba(255,77,28,0.25)' }}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI TRAINING
// ═══════════════════════════════════════════════════════════════
function SectionTraining({ coach, setCoach }) {
  const [form, setForm] = useState({ ai_who: coach.ai_who || '', ai_method: coach.ai_method || '', ai_tone: coach.ai_tone || '' });
  const [saving, setSaving] = useState(false);

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    try { await updateCoachAiTraining(form); setCoach({ ...coach, ...form }); alert('AI training updated!'); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  const blocks = [
    { key: 'ai_who', title: 'Who you are', desc: 'Background, values, what makes you different', placeholder: 'I\'m a former NCAA athlete…' },
    { key: 'ai_method', title: 'Your coaching method', desc: 'Training philosophy, periodization, nutrition principles', placeholder: 'I use linear periodization…' },
    { key: 'ai_tone', title: 'How you talk', desc: 'Tone, personality, communication style', placeholder: 'I\'m direct but supportive…' },
  ];

  return (
    <>
      <div className="ai-status-bar" style={{ marginBottom: '20px' }}>
        <div className="ai-pulse" />
        <div className="ai-status-text">Your AI is <strong>active</strong></div>
      </div>

      {blocks.map(({ key, title, desc, placeholder }) => (
        <div key={key} className="ai-train-block" style={{ marginBottom: '14px' }}>
          <div className="ai-train-block-head">
            <div style={{ flex: 1 }}>
              <div className="ai-train-block-title">{title}</div>
              <div className="ai-train-block-desc">{desc}</div>
            </div>
          </div>
          <textarea className="textarea-field" value={form[key]} onChange={e => upd(key, e.target.value)} placeholder={placeholder} />
        </div>
      ))}

      <button className="btn-save-live" onClick={save} disabled={saving} style={{ marginTop: '8px' }}>
        {saving ? 'Saving…' : 'Push update to AI'}
      </button>
    </>
  );
}