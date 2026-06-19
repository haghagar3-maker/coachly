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
import NotificationBell from '../components/NotificationBell';

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [msgUnread, setMsgUnread] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const c = await getCoachMe();
        setCoach(c);
      } catch (err) {
        console.error('Coach me error:', err.message);
        if (err.message.includes('401') || err.message.includes('403')) {
          clearToken();
          navigate('/coach/login');
        }
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

  function navTo(s) {
    setActiveSection(s);
    setSidebarOpen(false);
    if (s === 'messages') setMsgUnread(0);
    if (s === 'clients') setClientsUnread(0);
  }

  const [clientsUnread, setClientsUnread] = useState(0);
  const [calendarToday, setCalendarToday] = useState(0);

  useEffect(() => {
    async function pollUnread() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/notifications`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setMsgUnread(list.filter(n => !n.is_read && n.type === 'new_dm').length);
        setClientsUnread(list.filter(n => !n.is_read && n.type === 'new_subscriber').length);
      } catch {}
    }
    async function pollTodayMeetings() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coach/meetings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
        });
        const data = await res.json();
        const today = new Date().toISOString().slice(0, 10);
        const count = Array.isArray(data)
          ? data.filter(m => m.status !== 'cancelled' && m.scheduled_at?.slice(0, 10) === today).length
          : 0;
        setCalendarToday(count);
      } catch {}
    }
    pollUnread();
    pollTodayMeetings();
    const interval = setInterval(() => { pollUnread(); pollTodayMeetings(); }, 8000);
    return () => clearInterval(interval);
  }, []);

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
    ai: 'AI Conversations', store: 'Store Editor', content: 'Program Content', training: 'AI Training', nutrition: 'Client Nutrition', strategy: 'Client Strategy', calendar: 'Calendar',
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
            { id: 'clients',  label: 'Clients',  icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, badge: clientsUnread },
            { id: 'messages', label: 'Messages', icon: <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, badge: msgUnread },
            { id: 'ai',        label: 'AI Conversations', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> },
{ id: 'nutrition', label: 'Client Nutrition',  icon: <svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> },
{ id: 'strategy',  label: 'Client Strategy',   icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
{ id: 'calendar',  label: 'Calendar',          icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, badge: calendarToday },
          ].map(({ id, label, icon, badge }) => (
            <button key={id} className={`nav-item${activeSection === id ? ' active' : ''}`} onClick={() => navTo(id)}>
              {icon}{label}
              {badge > 0 && (
                <span style={{
                  marginLeft: 'auto', minWidth: '18px', height: '18px', borderRadius: '9px',
                  background: '#ff4d1c', color: '#fff', fontSize: '10px', fontWeight: '800',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
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
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="tb-date">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <NotificationBell token={localStorage.getItem('coachly_token')} />
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
          {activeSection === 'training'   && <SectionTraining   coach={coach} setCoach={setCoach} />}
          {activeSection === 'nutrition'  && <SectionNutrition  coach={coach} />}
          {activeSection === 'strategy'   && <SectionStrategy   coach={coach} />}
          {activeSection === 'calendar'   && <SectionCalendar   coach={coach} />}
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
                <div className="act-av" style={{ background: c.user?.photo ? 'transparent' : avatarBg(c.user_name), overflow: 'hidden', padding: 0 }}>{c.user?.photo ? <img src={c.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(c.user_name)}</div>
                <div className="act-body">
                  <div className="act-name">{c.user?.name || c.user_name || 'Unknown'}</div>
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
              <div className="ct-av" style={{ background: c.user?.photo ? 'transparent' : avatarBg(c.user?.name || c.name), overflow: 'hidden', padding: 0 }}>{c.user?.photo ? <img src={c.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(c.user?.name || c.name)}</div>
              <div><div className="ct-name">{c.user?.name || c.name || '?'}</div><div className="ct-email">{c.user?.email || c.email}</div></div>
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

  function openThread(t) {
    setActiveThread(t);
    setMessages([...(t.messages || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    // Mark as read in DB
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/dm/read-coach?userId=${t.user_id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
    }).catch(() => {});
    // Clear red dot locally
    setThreads(prev => prev.map(th => th.user_id === t.user_id ? { ...th, unread_count: 0 } : th));
  }

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
            <div className="mt-av" style={{ background: t.user?.photo ? 'transparent' : avatarBg(t.user?.name || t.user_name), padding: 0, overflow: 'hidden' }}>
  {t.user?.photo ? <img src={t.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(t.user?.name || t.user_name)}
</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mt-name">{t.user?.name || t.user_name || 'Unknown'}</div>
              <div className="mt-preview">{t.last_message?.content || t.last_message || 'No messages yet'}</div>
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
                <div className="ch-av" style={{ background: activeThread.user?.photo ? 'transparent' : avatarBg(activeThread.user?.name), padding: 0, overflow: 'hidden' }}>
  {activeThread.user?.photo ? <img src={activeThread.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(activeThread.user?.name)}
</div>
                <div>
                  <div className="ch-name">{activeThread.user?.name || activeThread.user_name || 'Unknown'}</div>
                  <div className="ch-status"><span className="ch-status-dot" />Active subscriber</div>
                </div>
              </div>
            </div>
            <div className="chat-messages">
              {messages.map(m => (
                <div key={m.id} className={`msg-wrap${m.sender_type === 'coach' ? ' user-msg' : ''}`}>
                  <div className="msg-av" style={{ background: m.sender_type === 'coach' ? 'var(--dark)' : avatarBg(activeThread.user?.name) }}>
                    {m.sender_type === 'coach' ? initials(coach.name) : initials(activeThread.user?.name)}
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
    getCoachAiConversations().then(d => setConversations(Array.isArray(d) ? d : [])).catch(e => { console.error(e); setConversations([]); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  const filtered = conversations.filter(c => filter === 'all' || c.has_flagged);

  if (activeConv) return (
    <div>
      <button className="btn-secondary" onClick={() => setActiveConv(null)} style={{ marginBottom: '16px' }}>← Back</button>
      <div className="card">
        <div className="card-head"><div className="card-title">{activeConv.user?.name || 'Client'} · AI conversation</div></div>
        <div style={{ position: 'relative' }}>
<div className="chat-messages" id="ai-conv-messages" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          {[...(activeConv.messages || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(m => (
            <div key={m.id} className={`msg-wrap${m.role === 'user' ? ' user-msg' : ''}`}>
              <div className="msg-av" style={{ background: m.role === 'assistant' ? 'linear-gradient(135deg,#1e3a2a,#2d6b47)' : activeConv.user?.photo ? 'transparent' : avatarBg(activeConv.user?.name || '?'), overflow: 'hidden', padding: m.role !== 'assistant' && activeConv.user?.photo ? 0 : undefined }}>
                {m.role === 'assistant' ? 'AI' : activeConv.user?.photo ? <img src={activeConv.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(activeConv.user?.name || '?')}
              </div>
              <div className={`bubble ${m.role === 'assistant' ? 'coach-bubble' : 'user-bubble'}`}>{m.content}</div>
            </div>
          ))}
        </div>
        </div>
        <button onClick={() => { const el = document.getElementById('ai-conv-messages'); if(el) el.scrollTop = el.scrollHeight; }} style={{ position: 'absolute', bottom: '16px', right: '16px', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--dark)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </button>
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
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.user?.photo ? 'transparent' : avatarBg(c.user?.name || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0, overflow: 'hidden', padding: 0 }}>{c.user?.photo ? <img src={c.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(c.user?.name || '?')}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{c.user?.name || 'Unknown'}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{c.message_count || 0} messages</div>
              </div>
              {c.has_flagged && <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '700', background: 'var(--coral-bg)', color: 'var(--coral)', padding: '2px 8px', borderRadius: '100px' }}>Flagged</span>}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {c.last_message?.content || 'No messages yet'}
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
    name: coach.name || '',
    tagline: coach.tagline || '',
    bio: coach.bio || '',
    sport: coach.sport || '',
    location: coach.location || '',
    years_experience: coach.years_experience || '',
    plan_price: coach.plan_price || '',
    store_color: coach.store_color || '#C8FF00',
    intro_video_url: coach.intro_video_url || '',
    instagram: coach.instagram || '',
    twitter: coach.twitter || '',
    youtube: coach.youtube || '',
    tiktok: coach.tiktok || '',
    media: coach.media || [],
    testimonials: coach.testimonials || [],
    credentials: coach.credentials || '',
    coaching_philosophy: coach.coaching_philosophy || '',
    what_included: coach.what_included || '',
  });
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    const cleaned = { ...form };
    if (cleaned.years_experience === '') cleaned.years_experience = null;
    if (cleaned.plan_price === '') cleaned.plan_price = null;
    try { await updateCoachProfile(cleaned); setCoach({ ...coach, ...cleaned }); setPreviewKey(k => k + 1); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function uploadPhoto(e, field) {
    const file = e.target.files[0];
    if (!file) return;
    const setter = field === 'photo' ? setPhotoUploading : setBannerUploading;
    setter(true);
    try {
      const base64 = await toBase64(file);
      await updateCoachProfile({ [field]: base64 });
      setCoach(prev => ({ ...prev, [field]: base64 }));
      upd(field, base64);
    } catch (err) { alert('Upload failed: ' + err.message); }
    finally { setter(false); }
  }

  const PRESET_COLORS = ['#C8FF00','#FF6B35','#5C6BC0','#00BCD4','#E91E63','#4CAF50','#FF9800','#ffffff'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '32px', alignItems: 'start' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Photos */}
      <div className="field-group">
        <div className="field-group-title">Photos</div>

        {/* Banner */}
        <div className="field">
          <label>Store banner</label>
          <div style={{
            width: '100%', height: '120px', borderRadius: '10px', overflow: 'hidden',
            background: coach.banner ? 'none' : 'var(--border)', position: 'relative',
            border: '1px dashed var(--border)', cursor: 'pointer',
          }}
            onClick={() => document.getElementById('banner-upload').click()}
          >
            {coach.banner
              ? <img src={coach.banner} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '13px' }}>
                  Click to upload banner
                </div>
            }
            <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', padding: '4px 10px', borderRadius: '6px' }}>
              {bannerUploading ? 'Uploading…' : 'Change'}
            </div>
          </div>
          <input id="banner-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadPhoto(e, 'banner')} />
        </div>

        {/* Profile photo */}
        <div className="field">
          <label>Profile photo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--border)', flexShrink: 0, cursor: 'pointer',
              border: '2px solid var(--border)',
            }} onClick={() => document.getElementById('photo-upload').click()}>
              {coach.photo
                ? <img src={coach.photo} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '22px', fontWeight: '700', color: 'var(--muted)' }}>
                    {coach.name?.charAt(0).toUpperCase()}
                  </div>
              }
            </div>
            <div>
              <button className="btn-secondary" onClick={() => document.getElementById('photo-upload').click()} disabled={photoUploading}>
                {photoUploading ? 'Uploading…' : 'Change photo'}
              </button>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>JPG or PNG, max 2MB</div>
            </div>
          </div>
          <input id="photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadPhoto(e, 'photo')} />
        </div>
      </div>

      {/* Store details */}
      <div className="field-group">
        <div className="field-group-title">Store settings</div>
        {[
          { key: 'name', label: 'Display name', type: 'text' },
          { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'e.g. Strength coach for busy professionals' },
          { key: 'bio', label: 'Bio', type: 'textarea', rows: 5 },
          { key: 'sport', label: 'Sport / Niche', type: 'text' },
          { key: 'location', label: 'Location', type: 'text' },
          { key: 'years_experience', label: 'Years experience', type: 'number' },
          { key: 'plan_price', label: 'Monthly price (USD)', type: 'number', placeholder: '199' },
        ].map(({ key, label, type, placeholder, rows }) => (
          <div key={key} className="field">
            <label>{label}</label>
            {type === 'textarea'
              ? <textarea value={form[key]} onChange={e => upd(key, e.target.value)} rows={rows} placeholder={placeholder} />
              : <input type={type} value={form[key]} onChange={e => upd(key, e.target.value)} placeholder={placeholder} />}
          </div>
        ))}
      </div>

      {/* Store color */}
      <div className="field-group">
        <div className="field-group-title">Store color</div>
        <div className="field">
          <label>Accent color</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {PRESET_COLORS.map(c => (
              <div key={c} onClick={() => upd('store_color', c)} style={{
                width: 32, height: 32, borderRadius: '50%', background: c,
                cursor: 'pointer', border: form.store_color === c ? '3px solid var(--dark)' : '2px solid var(--border)',
                boxSizing: 'border-box', transition: 'transform 0.1s',
              }} />
            ))}
            <input type="color" value={form.store_color} onChange={e => upd('store_color', e.target.value)}
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          </div>
        </div>
      </div>

      {/* Intro video */}
      <div className="field-group">
        <div className="field-group-title">Intro video</div>
        <div className="field">
          <label>YouTube URL <span style={{ fontWeight: '400', color: 'var(--muted)', fontSize: '11px' }}>— must be a public video, no playlist links</span></label>
          <input type="url" value={form.intro_video_url} onChange={e => upd('intro_video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          {form.intro_video_url && (
            <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9' }}>
              <iframe
                src={form.intro_video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>

      {/* Social links */}
      <div className="field-group">
        <div className="field-group-title">Social media</div>
        {[
          { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
          { key: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/yourhandle' },
          { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
          { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="field">
            <label>{label}</label>
            <input type="url" value={form[key]} onChange={e => upd(key, e.target.value)} placeholder={placeholder} />
          </div>
        ))}
      </div>

      {/* Media gallery */}
      <div className="field-group">
        <div className="field-group-title">Photos & videos gallery</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>Add images or YouTube links — shown as a gallery on your store page.</div>
        {(form.media || []).map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <select value={m.type || 'image'} onChange={e => { const arr = [...(form.media||[])]; arr[i] = { ...arr[i], type: e.target.value }; upd('media', arr); }} style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--dark)', flexShrink: 0 }}>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            {m.type === 'video'
              ? <input type="text" placeholder="Paste YouTube URL" value={m.url || ''} onChange={e => { const arr = [...(form.media||[])]; arr[i] = { ...arr[i], url: e.target.value }; upd('media', arr); }} style={{ flex: 1, padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--dark)' }} />
              : <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {m.url && m.url.startsWith('data:') && <img src={m.url} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />}
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', borderRadius: '7px', border: '1px dashed var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>
                    {m.url ? 'Change image' : '+ Upload image'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (file.size > 500 * 1024) { alert('Image too large! Max 500KB. Compress it at squoosh.app first.'); return; }
                      const base64 = await toBase64(file);
                      const arr = [...(form.media||[])]; arr[i] = { ...arr[i], url: base64 }; upd('media', arr);
                    }} />
                  </label>
                </div>
            }
            <input type="text" placeholder="Caption (optional)" value={m.caption || ''} onChange={e => { const arr = [...(form.media||[])]; arr[i] = { ...arr[i], caption: e.target.value }; upd('media', arr); }} style={{ width: '140px', padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--dark)' }} />
            <button onClick={() => upd('media', (form.media||[]).filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff4d1c', fontSize: '16px', cursor: 'pointer', flexShrink: 0 }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => upd('media', [...(form.media||[]), { type: 'image', url: '', caption: '' }])} style={{ flex: 1, background: 'none', border: '1px dashed var(--border)', borderRadius: '8px', padding: '10px', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add image</button>
          <button onClick={() => upd('media', [...(form.media||[]), { type: 'video', url: '', caption: '' }])} style={{ flex: 1, background: 'none', border: '1px dashed var(--border)', borderRadius: '8px', padding: '10px', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add video</button>
        </div>
      </div>

      {/* Testimonials */}
      <div className="field-group">
        <div className="field-group-title">Testimonials</div>
        {(form.testimonials || []).map((t, i) => (
          <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
            <input type="text" placeholder="Client name" value={t.name || ''} onChange={e => { const arr = [...form.testimonials]; arr[i] = { ...arr[i], name: e.target.value }; upd('testimonials', arr); }} style={{ width: '100%', marginBottom: '8px', padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--dark)', boxSizing: 'border-box' }} />
            <textarea placeholder="What they said…" value={t.text || ''} onChange={e => { const arr = [...form.testimonials]; arr[i] = { ...arr[i], text: e.target.value }; upd('testimonials', arr); }} rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--dark)', resize: 'vertical', boxSizing: 'border-box' }} />
            <button onClick={() => upd('testimonials', form.testimonials.filter((_, j) => j !== i))} style={{ marginTop: '6px', background: 'none', border: 'none', color: 'var(--coral)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
          </div>
        ))}
        <button onClick={() => upd('testimonials', [...(form.testimonials || []), { name: '', text: '' }])} style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '8px', padding: '10px', width: '100%', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add testimonial</button>
      </div>

      {/* Credentials */}
      <div className="field-group">
        <div className="field-group-title">Credentials & certifications</div>
        <div className="field">
          <label>Your certifications / achievements</label>
          <textarea value={form.credentials} onChange={e => upd('credentials', e.target.value)} rows={3} placeholder="e.g. NASM Certified PT, 10+ years competitive bodybuilding, worked with 200+ clients…" />
        </div>
        <div className="field">
          <label>Coaching philosophy</label>
          <textarea value={form.coaching_philosophy} onChange={e => upd('coaching_philosophy', e.target.value)} rows={4} placeholder="What do you believe in? What separates your coaching from everyone else?" />
        </div>
      </div>

      {/* What's included */}
      <div className="field-group">
        <div className="field-group-title">What's included (customize)</div>
        <div className="field">
          <label>Describe what clients get — shown on your store page</label>
          <textarea value={form.what_included} onChange={e => upd('what_included', e.target.value)} rows={5} placeholder="Custom workout program updated monthly&#10;Daily meal plans tailored to your goals&#10;Direct messaging with me&#10;Weekly check-in reviews…" />
        </div>
      </div>

      <div className="save-bar">
        <div className="save-bar-left">Changes are saved live</div>
        <div className="save-bar-right">
          <button className="btn-save-live" onClick={async () => { await save(); setPreviewKey(k => k + 1); }} disabled={saving}>{saving ? 'Saving…' : 'Save & preview'}</button>
        </div>
      </div>
    </div>

    {/* Live preview */}
    <div style={{ position: 'sticky', top: '20px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Store preview</span>
        <button onClick={() => setPreviewKey(k => k + 1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>Refresh</button>
      </div>
      <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', background: '#fff', height: '80vh' }}>
        <iframe
          key={previewKey}
          src={`/coach/${coach.id}`}
          style={{ width: '100%', height: '100%', border: 'none', transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%', height: '133%' }}
          title="Store preview"
        />
      </div>
      <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)' }}>
        Click "Save & preview" to see your changes
      </div>
    </div>
  </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTENT
// ═══════════════════════════════════════════════════════════════
function SectionContent({ coach }) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('byweek'); // 'byweek' | 'all'
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [newWeekTitle, setNewWeekTitle] = useState('');
  const [addingWeek, setAddingWeek] = useState(false);

  useEffect(() => {
    getCoachContent().then(setContent).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  // Group by week
  const weeks = {};
  content.forEach(c => {
    const w = c.week_number || 1;
    if (!weeks[w]) weeks[w] = { week: w, title: c.week_title || `Week ${w}`, items: [] };
    weeks[w].items.push(c);
  });
  const weekList = Object.values(weeks).sort((a, b) => a.week - b.week);

  const allFiltered = content.filter(c => filterType === 'all' || c.type === filterType);

  function typeIcon(type) {
    if (type === 'video') return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
    );
    if (type === 'pdf') return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    );
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
    );
  }

  async function deleteItem(id) {
    if (!confirm('Delete this content?')) return;
    try {
      await deleteCoachContent(id);
      setContent(prev => prev.filter(c => c.id !== id));
    } catch (err) { alert(err.message); }
  }

  return (
    <div>
      {/* Header tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', background: 'var(--card)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)' }}>
          {[['byweek','By week'],['all','All content']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: view === v ? 'var(--dark)' : 'transparent',
              color: view === v ? '#fff' : 'var(--muted)',
              fontFamily: 'inherit',
            }}>{l}</button>
          ))}
        </div>
        <button className="btn-save-live" onClick={() => { setEditItem(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          + Upload content
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(200,255,0,0.07)', border: '1px solid rgba(200,255,0,0.15)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--lime)" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {view === 'byweek'
          ? 'Content here appears in each subscriber\'s Content Library → By Week view. Locked weeks are revealed automatically on schedule.'
          : 'Post anything here — bonus videos, tips, mindset clips. These appear in subscribers\' All content feed. No week structure needed.'}
      </div>

      {view === 'byweek' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {weekList.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
              No content yet. Click "Upload content" to add your first piece.
            </div>
          )}
          {weekList.map(({ week, title, items }) => (
            <div key={week} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>Week {week}</span>
                  <span style={{ fontSize: '15px', fontWeight: '700' }}>{title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(200,255,0,0.12)', color: 'var(--lime)', padding: '3px 10px', borderRadius: '100px', fontWeight: '600' }}>
                    Live · {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => { setEditItem({ week_number: week, week_title: title }); setShowModal(true); }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', color: 'var(--dark)', fontFamily: 'inherit' }}>
                    + Add content
                  </button>
                </div>
              </div>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--muted)' }}>
                    {typeIcon(item.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)} · {item.duration || 'No duration'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button className="content-btn" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                    <button className="content-btn" style={{ color: 'var(--coral)', borderColor: 'rgba(255,77,28,0.25)' }} onClick={() => deleteItem(item.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Add week */}
          {addingWeek ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input value={newWeekTitle} onChange={e => setNewWeekTitle(e.target.value)} placeholder="Week title e.g. Foundation"
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '13px', color: 'var(--dark)' }} />
              <button className="btn-save-live" onClick={async () => {
                if (!newWeekTitle.trim()) return;
                const week = weekList.length + 1;
                try {
                  const item = await createCoachContent({ title: 'Intro', type: 'guide', week_number: week, week_title: newWeekTitle.trim() });
                  setContent(prev => [...prev, item]);
                  setNewWeekTitle(''); setAddingWeek(false);
                } catch (err) { alert(err.message); }
              }}>Add week</button>
              <button onClick={() => setAddingWeek(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '20px' }}>×</button>
            </div>
          ) : (
            <button onClick={() => setAddingWeek(true)} style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              + Add new week
            </button>
          )}
        </div>
      ) : (
        /* All content grid */
        <div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {['all','video','pdf','guide','mindset'].map(t => (
              <button key={t} className={`filter-btn${filterType === t ? ' active' : ''}`} onClick={() => setFilterType(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="library-grid">
            {allFiltered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                No content yet.
              </div>
            ) : allFiltered.map(c => (
              <div key={c.id} className="lib-card">
                <div className="lib-thumb" style={{ background: c.type === 'video' ? '#1a2f1a' : c.type === 'pdf' ? '#1a1a2f' : '#2f1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    {typeIcon(c.type)}
                  </div>
                  <div className={`lib-type-tag ${c.type === 'video' ? 'lt-video' : c.type === 'pdf' ? 'lt-pdf' : 'lt-guide'}`}>{c.type}</div>
                </div>
                <div className="lib-body">
                  <div className="lib-name">{c.title}</div>
                  <div className="lib-meta">{c.duration || ''} · {timeAgo(c.created_at)}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button className="content-btn" onClick={() => { setEditItem(c); setShowModal(true); }}>Edit</button>
                    <button className="content-btn" style={{ color: 'var(--coral)', borderColor: 'rgba(255,77,28,0.25)' }} onClick={() => deleteItem(c.id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="lib-card" style={{ border: '1px dashed var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '140px' }}
              onClick={() => { setEditItem(null); setShowModal(true); }}>
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>+</div>
                Post something new
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showModal && (
        <ContentModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={async (data) => {
            try {
              if (editItem?.id) {
                const updated = await updateCoachContent(editItem.id, data);
                setContent(prev => prev.map(c => c.id === editItem.id ? updated : c));
              } else {
                const created = await createCoachContent(data);
                setContent(prev => [...prev, created]);
              }
              setShowModal(false); setEditItem(null);
            } catch (err) { alert(err.message); }
          }}
        />
      )}
    </div>
  );
}

function ContentModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    title: item?.title || '',
    type: item?.type || 'video',
    url: item?.url || '',
    duration: item?.duration || '',
    week_number: item?.week_number || 1,
    week_title: item?.week_title || '',
    description: item?.description || '',
  });
  const [saving, setSaving] = useState(false);
  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '16px', fontWeight: '700' }}>{item?.id ? 'Edit content' : 'Upload content'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="field">
            <label>Title</label>
            <input type="text" value={form.title} onChange={e => upd('title', e.target.value)} placeholder="e.g. How to bench properly" />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={e => upd('type', e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '13px', color: 'var(--dark)' }}>
              {['video','pdf','guide','mindset','audio'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>URL / Link <span style={{ fontWeight: '400', color: 'var(--muted)', fontSize: '11px' }}>— or upload a file below</span></label>
            <input type="url" value={form.url} onChange={e => upd('url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: '1px dashed var(--border)', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)', background: 'var(--bg)' }}>
                {form._uploading ? 'Uploading…' : form.url && !form.url.startsWith('http') ? '✓ File uploaded — click to replace' : '+ Upload file (PDF, MP4, MOV, JPG…)'}
                <input type="file" accept="video/*,application/pdf,image/*,audio/*" style={{ display: 'none' }} disabled={form._uploading} onChange={async e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 50 * 1024 * 1024) { alert('Max file size is 50MB'); return; }
                  upd('_uploading', true);
                  try {
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = reader.result;
                      const res = await fetch(`${import.meta.env.VITE_API_URL||''}/api/upload-content`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coachly_token')}` }, body: JSON.stringify({ fileBase64: base64, fileName: file.name, fileType: file.type }) });
                      const data = await res.json();
                      if (data.url) { upd('url', data.url); upd('_uploading', false); upd('type', file.type.startsWith('video') ? 'video' : file.type === 'application/pdf' ? 'pdf' : form.type); }
                      else { upd('_uploading', false); alert('Upload failed: ' + (data.error || 'Unknown error')); }
                    };
                    reader.readAsDataURL(file);
                  } catch { upd('_uploading', false); alert('Upload failed'); }
                }} />
              </label>
              {form.url && !form.url.startsWith('http') && !form.url.startsWith('data:') && <div style={{ fontSize: '11px', color: '#2ecc6a', marginTop: '4px' }}>✓ File uploaded to storage</div>}
              {form._uploading && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Uploading to storage…</div>}
            </div>
          </div>
          <div className="field">
            <label>Duration</label>
            <input type="text" value={form.duration} onChange={e => upd('duration', e.target.value)} placeholder="e.g. 42 min" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="field">
              <label>Week number</label>
              <input type="number" value={form.week_number} onChange={e => upd('week_number', e.target.value)} min="1" />
            </div>
            <div className="field">
              <label>Week title</label>
              <input type="text" value={form.week_title} onChange={e => upd('week_title', e.target.value)} placeholder="Foundation" />
            </div>
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <textarea value={form.description} onChange={e => upd('description', e.target.value)} rows={3} placeholder="What will subscribers learn?" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-save-live" disabled={saving} onClick={async () => {
            if (!form.title) return alert('Title required');
            setSaving(true);
            await onSave(form);
            setSaving(false);
          }}>{saving ? 'Saving…' : item?.id ? 'Save changes' : 'Upload'}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI TRAINING
// ═══════════════════════════════════════════════════════════════
function SectionTraining({ coach, setCoach }) {
  const [form, setForm] = useState({
    ai_who: coach.ai_who || '',
    ai_method: coach.ai_method || '',
    ai_tone: coach.ai_tone || '',
    ai_limits: coach.ai_limits || '',
    ai_examples: coach.ai_examples || '',
    ai_workout_strategy: coach.ai_workout_strategy || '',
    ai_nutrition_strategy: coach.ai_nutrition_strategy || '',
  });
  const [quickUpdate, setQuickUpdate] = useState('');
  const [quickType, setQuickType] = useState('Behavior');
  const [updates, setUpdates] = useState(coach.ai_quick_updates || []);
  const [saving, setSaving] = useState(false);
  const [savingQuick, setSavingQuick] = useState(false);

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function save(key) {
    setSaving(key);
    try {
      await updateCoachAiTraining(form);
      setCoach({ ...coach, ...form });
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function addQuickUpdate() {
    if (!quickUpdate.trim()) return;
    setSavingQuick(true);
    const entry = { id: Date.now(), type: quickType, content: quickUpdate.trim(), time: new Date().toISOString() };
    const newUpdates = [entry, ...updates];
    try {
      await updateCoachAiTraining({ ...form, ai_quick_updates: newUpdates });
      setUpdates(newUpdates);
      setCoach({ ...coach, ai_quick_updates: newUpdates });
      setQuickUpdate('');
    } catch (err) { alert(err.message); }
    finally { setSavingQuick(false); }
  }

  async function removeUpdate(id) {
    const newUpdates = updates.filter(u => u.id !== id);
    await updateCoachAiTraining({ ...form, ai_quick_updates: newUpdates });
    setUpdates(newUpdates);
  }

  // Training health scores
  const health = {
    Identity: form.ai_who.length > 100 ? 90 : Math.max(10, Math.floor(form.ai_who.length / 2)),
    Method: form.ai_method.length > 100 ? 85 : Math.max(10, Math.floor(form.ai_method.length / 2)),
    Tone: form.ai_tone.length > 80 ? 80 : Math.max(10, Math.floor(form.ai_tone.length / 1.5)),
    Examples: form.ai_examples.length > 200 ? 90 : Math.max(5, Math.floor(form.ai_examples.length / 4)),
    Nutrition: form.ai_nutrition_strategy.length > 100 ? 90 : Math.max(10, Math.floor(form.ai_nutrition_strategy.length / 2)),
    Limits: form.ai_limits.length > 80 ? 95 : Math.max(5, Math.floor(form.ai_limits.length / 1.5)),
  };

  const blocks = [
    { key: 'ai_who', title: 'Who you are', desc: 'Your identity as a coach — background, values, what makes you different. The AI uses this to introduce itself to new clients.', placeholder: "I've been coaching for 9 years…" },
    { key: 'ai_method', title: 'Your coaching method', desc: 'How you actually coach — training philosophy, periodization approach, nutrition principles. The AI answers client questions from this foundation.', placeholder: 'My training is built around 3-4 week progressive blocks…' },
    { key: 'ai_tone', title: 'How you talk to clients', desc: 'Your tone, personality, expressions you use. The AI should sound like you — not like a generic chatbot.', placeholder: "I'm direct but supportive. I use 'we' not 'you should'…" },
    { key: 'ai_examples', title: 'Example conversations', desc: 'Paste 3–5 real conversations (or write examples). The AI learns your exact style from these.', placeholder: 'Client: I missed 3 days this week\nMe: Life happens. What day are we restarting?…' },
    { key: 'ai_workout_strategy', title: '🏋️ Workout program strategy', desc: 'How you build programs — exercises you prefer, sets/reps, rest times, weekly structure, progressions. The AI generates client programs based on this.', placeholder: 'I always start with compound lifts. 4 sets of 8-12 reps. 60-90s rest. Never 2 leg days back to back. Week 1-2 lighter, Week 3-4 heavier…' },
    { key: 'ai_nutrition_strategy', title: '🍽️ Nutrition strategy', desc: 'How you set calories and macros — formulas you use, protein targets, foods you push or avoid, meal timing rules. The AI generates client meal plans based on this.', placeholder: 'I set calories at 14x bodyweight (lbs) for cutting, 16x for maintenance. Protein always 1g per lb bodyweight. Carbs around workouts. Avoid: processed sugar, fried foods. Push: lean protein, vegetables, whole grains. 4 meals/day, last meal 3hrs before bed…' },
    { key: 'ai_limits', title: 'What the AI must never say', desc: 'Hard limits — things that go against your method, could harm clients, or that you want to always handle personally.', placeholder: 'Never recommend cutting below 1600 calories…' },
  ];

  const tagColors = { Behavior: '#5c6bc0', Nutrition: '#2a9d4e', 'Hard Limit': '#c94e2a', Tone: '#e67e00', General: '#888' };
  const [docs, setDocs] = useState(coach.ai_docs || []);
  const [uploading, setUploading] = useState(false);

  async function uploadDoc(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const entry = { id: Date.now(), name: file.name, type: file.type, content: text.slice(0, 5000), time: new Date().toISOString() };
      const newDocs = [entry, ...docs];
      await updateCoachAiTraining({ ...form, ai_docs: newDocs });
      setDocs(newDocs);
      setCoach({ ...coach, ai_docs: newDocs });
      alert('Document uploaded! AI will use this content.');
    } catch (err) { alert('Upload failed: ' + err.message); }
    finally { setUploading(false); e.target.value = ''; }
  }

  async function removeDoc(id) {
    const newDocs = docs.filter(d => d.id !== id);
    await updateCoachAiTraining({ ...form, ai_docs: newDocs });
    setDocs(newDocs);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
      {/* Left — training blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="ai-status-bar" style={{ marginBottom: '4px' }}>
          <div className="ai-pulse" />
          <div className="ai-status-text">Your AI is <strong>active</strong></div>
        </div>

        {blocks.map(({ key, title, desc, placeholder }) => (
          <div key={key} className="ai-train-block">
            <div className="ai-train-block-head">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="ai-train-block-title">{title}</div>
                  {form[key].length > 20 && (
                    <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(200,255,0,0.12)', color: 'var(--lime)', padding: '2px 8px', borderRadius: '100px' }}>Trained</span>
                  )}
                </div>
                <div className="ai-train-block-desc">{desc}</div>
              </div>
            </div>
            <textarea className="textarea-field" value={form[key]} onChange={e => upd(key, e.target.value)} placeholder={placeholder} rows={key === 'ai_examples' ? 6 : 4} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Changes saved automatically</span>
              <button className="btn-save-live" style={{ padding: '7px 16px', fontSize: '12px' }} onClick={() => save(key)} disabled={saving === key}>
                {saving === key ? 'Saving…' : 'Push update to AI'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '20px' }}>
        {/* Training health */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px' }}>Training health</div>
          {Object.entries(health).map(([label, score]) => (
            <div key={label} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: score > 70 ? '#2a9d4e' : score > 40 ? '#e67e00' : '#c94e2a' }}>{score}%</span>
              </div>
              <div style={{ height: '5px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: score > 70 ? '#2a9d4e' : score > 40 ? '#e67e00' : '#c94e2a', borderRadius: '100px', transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
          {Object.entries(health).some(([, v]) => v < 50) && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(201,78,42,0.08)', borderRadius: '8px', fontSize: '12px' }}>
              <div style={{ color: '#c94e2a', fontWeight: '700', marginBottom: '3px' }}>
                Improve: {Object.entries(health).filter(([,v]) => v < 50).map(([k]) => k).join(', ')}
              </div>
              <div style={{ color: 'var(--muted)' }}>Add more detail to improve AI accuracy.</div>
            </div>
          )}
        </div>

        {/* Document upload */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>📄 Upload documents</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>Upload PDFs, guides, or text files. The AI will read and learn from them.</div>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: '1px dashed var(--border)', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)' }}>
            {uploading ? 'Reading file…' : '+ Upload file (PDF, TXT)'}
            <input type="file" accept=".pdf,.txt,.md,.doc,.docx" style={{ display: 'none' }} onChange={uploadDoc} disabled={uploading} />
          </label>
          {docs.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {docs.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '16px' }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{timeAgo(d.time)}</div>
                  </div>
                  <button onClick={() => removeDoc(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d1c', fontSize: '14px' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick update */}
        <div style={{ background: 'var(--dark)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Push a quick update</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '14px' }}>Add a small targeted instruction. The AI remembers all previous updates and stacks them.</div>
          <textarea value={quickUpdate} onChange={e => setQuickUpdate(e.target.value)}
            placeholder="Example: Starting this week, always ask clients about their sleep before adjusting their program…"
            rows={4}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontFamily: 'inherit', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
            <select value={quickType} onChange={e => setQuickType(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontFamily: 'inherit', fontSize: '12px' }}>
              {['Behavior','Nutrition','Hard Limit','Tone','General'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={addQuickUpdate} disabled={savingQuick}
              style={{ padding: '8px 16px', borderRadius: '7px', background: 'var(--lime)', color: 'var(--dark)', border: 'none', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
              {savingQuick ? '…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Updates log */}
        {updates.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>Updates log</div>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{updates.length} updates</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {updates.map(u => (
                <div key={u.id} style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', background: `${tagColors[u.type] || '#888'}22`, color: tagColors[u.type] || '#888', padding: '2px 8px', borderRadius: '100px' }}>{u.type}</span>
                    <button onClick={() => removeUpdate(u.id)} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer' }}>Remove</button>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>{u.content}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px', opacity: 0.6 }}>{timeAgo(u.time)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// CLIENT NUTRITION
// ═══════════════════════════════════════════════════════════════
function SectionNutrition({ coach }) {
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('plans'); // 'plans' | 'scans'
  const [mealPlans, setMealPlans] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    getCoachClients().then(setClients).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function viewClient(c) {
    setSelected(c);
    setTab('plans');
    await loadPlans(c);
  }

  async function loadPlans(c) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coach/client-meal-plans?userId=${c.user_id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
      });
      const data = await res.json();
      setMealPlans(Array.isArray(data) ? data : []);
    } catch { setMealPlans([]); }
    finally { setLoadingDetail(false); }
  }

  async function loadScans(c) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coach/client-nutrition?userId=${c.user_id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
      });
      const data = await res.json();
      setScans(Array.isArray(data) ? data : []);
    } catch { setScans([]); }
    finally { setLoadingDetail(false); }
  }

  function switchTab(t) {
    setTab(t);
    if (t === 'scans' && scans.length === 0) loadScans(selected);
    if (t === 'plans' && mealPlans.length === 0) loadPlans(selected);
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  const today = new Date().toISOString().slice(0, 10);

  if (selected) return (
    <div>
      <button className="btn-secondary" onClick={() => setSelected(null)} style={{ marginBottom: '16px' }}>← Back</button>
      <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{selected.user?.name || '?'} — Nutrition</div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>Audit the AI's meal plans against your nutrition strategy, or review food scan history.</div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', background: 'var(--card)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)', marginBottom: '20px', width: 'fit-content' }}>
        {[['plans', 'AI Meal Plans'], ['scans', 'Food Scans']].map(([v, l]) => (
          <button key={v} onClick={() => switchTab(v)} style={{
            padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
            background: tab === v ? 'var(--dark)' : 'transparent',
            color: tab === v ? '#fff' : 'var(--muted)',
            fontFamily: 'inherit',
          }}>{l}</button>
        ))}
      </div>

      {loadingDetail ? (
        <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>
      ) : tab === 'plans' ? (
        mealPlans.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No AI meal plans generated yet for this client.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mealPlans.map((p, i) => {
              const isToday = p.date === today;
              return (
                <div key={i} style={{
                  background: 'var(--card)', borderRadius: '14px', border: isToday ? '2px solid var(--lime)' : '1px solid var(--border)',
                  padding: '16px 18px', position: 'relative',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>
                      {new Date(p.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {isToday && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: '800', background: 'rgba(200,255,0,0.15)', color: 'var(--lime)', padding: '2px 8px', borderRadius: '100px' }}>TODAY</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{p.total_calories || '—'} kcal · {p.total_protein || '—'} protein</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[['Breakfast', p.breakfast, p.breakfast_status], ['Lunch', p.lunch, p.lunch_status], ['Snack', p.snack, p.snack_status], ['Dinner', p.dinner, p.dinner_status]].map(([label, val, status]) => (
                      <div key={label} style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--muted)', minWidth: '64px', flexShrink: 0 }}>{label}</span>
                        <span style={{ color: val && /not applicable/i.test(val) ? 'var(--muted)' : 'var(--dark)', fontStyle: val && /not applicable/i.test(val) ? 'italic' : 'normal' }}>{val || '—'}</span>
                        {status && status !== 'pending' && (
                          <span style={{ marginLeft: 'auto', fontWeight: '700', color: status === 'followed' ? '#2ecc6a' : '#ff4d1c', flexShrink: 0 }}>
                            {status === 'followed' ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        scans.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No food scans yet for this client.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scans.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                {m.image_base64
                  ? <img src={m.image_base64} alt="" style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 52, height: 52, borderRadius: '10px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🍽️</div>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '3px' }}>{m.meal_name || 'Meal'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{m.calories} kcal · {m.protein}g protein · {m.carbs}g carbs · {m.fat}g fat</div>
                  {m.coach_comment && <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>"{m.coach_comment}"</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: m.health_score >= 7 ? '#2ecc6a' : '#ff4d1c' }}>{m.health_score}/10</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{timeAgo(m.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Click a client to audit their AI-generated meal plans or food scan history.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {clients.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No clients yet.</div>
        ) : clients.map(c => (
          <div key={c.id} onClick={() => viewClient(c)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: c.user?.photo ? 'transparent' : avatarBg(c.user?.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0, overflow: 'hidden' }}>{c.user?.photo ? <img src={c.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(c.user?.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{c.user?.name || '?'}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{c.plan_months} month plan · {c.status || 'active'}</div>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--muted)"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CALENDAR (coach meetings)
// ═══════════════════════════════════════════════════════════════
function SectionCalendar({ coach }) {
  const [meetings, setMeetings] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [form, setForm] = useState({ userId: '', title: '', notes: '', link: '', date: '', time: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/coach/meetings`, { headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` } }).then(r => r.json()),
      getCoachClients(),
    ]).then(([m, c]) => { setMeetings(Array.isArray(m) ? m : []); setClients(c || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function createMeeting() {
    if (!isGroup && !form.userId) { alert('Please select a client'); return; }
    if (!form.title || !form.date || !form.time) { alert('Title, date and time are required'); return; }
    setSaving(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coach/meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
        body: JSON.stringify({
          userId: isGroup ? undefined : form.userId,
          isGroup,
          title: form.title,
          notes: form.notes,
          link: form.link,
          scheduledAt,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create session');
      }

      if (isGroup) {
        const { meetings: created } = await res.json();
        const enriched = (created || []).map(m => {
          const client = clients.find(c => c.user_id === m.user_id);
          return { ...m, user: client?.user || null };
        });
        setMeetings(prev => [...prev, ...enriched].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
      } else {
        const meeting = await res.json();
        const client = clients.find(c => c.user_id === form.userId);
        setMeetings(prev => [...prev, { ...meeting, user: client?.user || null }].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
      }

      setForm({ userId: '', title: '', notes: '', link: '', date: '', time: '' });
      setIsGroup(false);
      setShowForm(false);
    } catch (e) { alert(e.message || 'Failed to create session'); }
    finally { setSaving(false); }
  }

  async function cancelMeeting(id) {
    if (!confirm('Cancel this session?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coach/meeting/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
      });
      const cancelledMeeting = meetings.find(m => m.id === id);
      if (cancelledMeeting?.group_id) {
        setMeetings(prev => prev.map(m => m.group_id === cancelledMeeting.group_id ? { ...m, status: 'cancelled' } : m));
      } else {
        setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: 'cancelled' } : m));
      }
    } catch (e) { alert('Failed to cancel'); }
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  const now = Date.now();
  const oneOnOne = meetings.filter(m => !m.group_id);
  const groupMeetingsRaw = meetings.filter(m => m.group_id);

  // Collapse group meetings into one card per group_id
  const groupedByGroupId = {};
  groupMeetingsRaw.forEach(m => {
    if (!groupedByGroupId[m.group_id]) {
      groupedByGroupId[m.group_id] = { ...m, attendees: [m.user].filter(Boolean), ids: [m.id] };
    } else {
      groupedByGroupId[m.group_id].attendees.push(m.user);
      groupedByGroupId[m.group_id].ids.push(m.id);
    }
  });
  const groupCards = Object.values(groupedByGroupId);

  const upcoming1on1 = oneOnOne.filter(m => m.status !== 'cancelled' && new Date(m.scheduled_at).getTime() >= now);
  const past1on1 = oneOnOne.filter(m => m.status === 'cancelled' || new Date(m.scheduled_at).getTime() < now);
  const upcomingGroup = groupCards.filter(m => m.status !== 'cancelled' && new Date(m.scheduled_at).getTime() >= now);
  const pastGroup = groupCards.filter(m => m.status === 'cancelled' || new Date(m.scheduled_at).getTime() < now);

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' + new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Schedule and manage sessions with clients.</div>
        <button className="btn-save-live" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ New session'}</button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Group session toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <input
                type="checkbox"
                id="group-toggle"
                checked={isGroup}
                onChange={e => { setIsGroup(e.target.checked); upd('userId', ''); }}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="group-toggle" style={{ fontSize: '13px', fontWeight: '600', cursor: 'pointer', margin: 0 }}>
                Group session — invite all active clients
              </label>
            </div>

            {!isGroup && (
              <div className="field">
                <label>Client</label>
                <select value={form.userId} onChange={e => upd('userId', e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', fontFamily: 'inherit', fontSize: '13px', color: 'var(--dark)' }}>
                  <option value="">Select a client…</option>
                  {clients.map(c => <option key={c.user_id} value={c.user_id}>{c.user?.name || '?'}</option>)}
                </select>
              </div>
            )}

            <div className="field">
              <label>Title</label>
              <input type="text" value={form.title} onChange={e => upd('title', e.target.value)} placeholder={isGroup ? 'e.g. Live group coaching call' : 'e.g. Monthly progress review'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="field">
                <label>Date</label>
                <input type="date" value={form.date} onChange={e => upd('date', e.target.value)} />
              </div>
              <div className="field">
                <label>Time</label>
                <input type="time" value={form.time} onChange={e => upd('time', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Meeting link</label>
              <input type="url" value={form.link} onChange={e => upd('link', e.target.value)} placeholder="https://zoom.us/j/... or meet.google.com/..." />
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2} placeholder="What should the client prepare or bring?" />
            </div>
            <button className="btn-save-live" disabled={saving} onClick={createMeeting} style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Scheduling…' : isGroup ? 'Schedule for all clients' : 'Schedule session'}
            </button>
          </div>
        </div>
      )}

      {/* 1-ON-1 SESSIONS */}
      <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>1-on-1 Sessions</div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', marginBottom: '8px' }}>Upcoming</div>
      {upcoming1on1.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
          No upcoming 1-on-1 sessions.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {upcoming1on1.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: m.user?.photo ? 'transparent' : avatarBg(m.user?.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                {m.user?.photo ? <img src={m.user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(m.user?.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>{m.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{m.user?.name || '?'} · {fmtDate(m.scheduled_at)}</div>
                {m.notes && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>{m.notes}</div>}
              </div>
              {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" className="content-btn">Join link</a>}
              <button className="content-btn" style={{ color: 'var(--coral)', borderColor: 'rgba(255,77,28,0.25)' }} onClick={() => cancelMeeting(m.id)}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', marginBottom: '8px' }}>Past</div>
      {past1on1.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginBottom: '28px' }}>No past 1-on-1 sessions yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
          {past1on1.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)', opacity: 0.6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{m.title}{m.status === 'cancelled' ? ' — Cancelled' : ''}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{m.user?.name || '?'} · {fmtDate(m.scheduled_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GROUP SESSIONS */}
      <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Group Sessions</div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', marginBottom: '8px' }}>Upcoming</div>
      {upcomingGroup.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
          No upcoming group sessions.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {upcomingGroup.map(m => (
            <div key={m.group_id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', marginRight: '4px', flexShrink: 0 }}>
                {m.attendees.slice(0, 4).map((u, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: u?.photo ? 'transparent' : avatarBg(u?.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff', overflow: 'hidden', border: '2px solid var(--card)', marginLeft: i > 0 ? '-10px' : 0 }}>
                    {u?.photo ? <img src={u.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(u?.name)}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>{m.title} <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--lime)' }}>· {m.attendees.length} attendee{m.attendees.length !== 1 ? 's' : ''}</span></div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{fmtDate(m.scheduled_at)}</div>
                {m.notes && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>{m.notes}</div>}
              </div>
              {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" className="content-btn">Join link</a>}
              <button className="content-btn" style={{ color: 'var(--coral)', borderColor: 'rgba(255,77,28,0.25)' }} onClick={() => cancelMeeting(m.ids[0])}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', marginBottom: '8px' }}>Past</div>
      {pastGroup.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No past group sessions yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pastGroup.map(m => (
            <div key={m.group_id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)', opacity: 0.6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{m.title}{m.status === 'cancelled' ? ' — Cancelled' : ''} <span style={{ fontSize: '11px' }}>· {m.attendees.length} attendee{m.attendees.length !== 1 ? 's' : ''}</span></div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{fmtDate(m.scheduled_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CLIENT STRATEGY
// ═══════════════════════════════════════════════════════════════
function SectionStrategy({ coach }) {
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [program, setProgram] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCoachClients().then(setClients).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function viewClient(c) {
    setSelected(c);
    setLoadingProgram(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coach/client-program?userId=${c.user_id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
      });
      const data = await res.json();
      setProgram(Array.isArray(data) ? data : []);
    } catch { setProgram([]); }
    finally { setLoadingProgram(false); }
  }

  async function saveDay(day) {
    setSaving(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coach/program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coachly_token')}` },
        body: JSON.stringify({ userId: selected.user_id, weekNumber: day.week_number, dayName: day.day_name, sessionTitle: day.session_title, exercises: day.exercises }),
      });
      setProgram(prev => prev.map(d => d.id === day.id ? day : d));
      setEditingDay(null);
    } catch (e) { alert('Save failed'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>;

  if (!selected) return (
    <div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Click a client to view and edit their workout program.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {clients.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No clients yet.</div>
        ) : clients.map(c => (
          <div key={c.id} onClick={() => viewClient(c)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarBg(c.user?.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{initials(c.user?.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{c.user?.name || '?'}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{c.plan_months} month plan · {c.status || 'active'}</div>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--muted)"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <button className="btn-secondary" onClick={() => { setSelected(null); setEditingDay(null); }} style={{ marginBottom: '16px' }}>← Back</button>
      <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{selected.user?.name || '?'} — Workout Program</div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>You can edit any day or exercise below. Changes save immediately.</div>
      {loadingProgram ? (
        <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>Loading…</div>
      ) : program.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No program generated yet for this client.</div>
      ) : program.map(day => (
        <div key={day.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: editingDay?.id === day.id ? '1px solid var(--border)' : 'none' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>{day.day_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{day.session_title}</div>
            </div>
            <button className="content-btn" onClick={() => setEditingDay(editingDay?.id === day.id ? null : { ...day, exercises: day.exercises || [] })}>
              {editingDay?.id === day.id ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingDay?.id === day.id ? (
            <div style={{ padding: '16px' }}>
              <div className="field" style={{ marginBottom: '12px' }}>
                <label>Session title</label>
                <input type="text" value={editingDay.session_title} onChange={e => setEditingDay(p => ({ ...p, session_title: e.target.value }))} />
              </div>
              {editingDay.exercises.map((ex, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 70px 32px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input type="text" value={ex.name} placeholder="Exercise" onChange={e => setEditingDay(p => ({ ...p, exercises: p.exercises.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} style={{ padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--dark)' }} />
                  <input type="text" value={ex.sets} placeholder="Sets" onChange={e => setEditingDay(p => ({ ...p, exercises: p.exercises.map((x, j) => j === i ? { ...x, sets: e.target.value } : x) }))} style={{ padding: '7px 8px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--dark)', textAlign: 'center' }} />
                  <input type="text" value={ex.reps} placeholder="Reps" onChange={e => setEditingDay(p => ({ ...p, exercises: p.exercises.map((x, j) => j === i ? { ...x, reps: e.target.value } : x) }))} style={{ padding: '7px 8px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--dark)', textAlign: 'center' }} />
                  <input type="text" value={ex.rest} placeholder="Rest" onChange={e => setEditingDay(p => ({ ...p, exercises: p.exercises.map((x, j) => j === i ? { ...x, rest: e.target.value } : x) }))} style={{ padding: '7px 8px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', fontSize: '12px', color: 'var(--dark)', textAlign: 'center' }} />
                  <button onClick={() => setEditingDay(p => ({ ...p, exercises: p.exercises.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d1c', fontSize: '16px', padding: 0 }}>×</button>
                </div>
              ))}
              <button onClick={() => setEditingDay(p => ({ ...p, exercises: [...p.exercises, { name: '', sets: 3, reps: '12', rest: '60s' }] }))} style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', marginTop: '4px' }}>+ Add exercise</button>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setEditingDay(null)}>Cancel</button>
                <button className="btn-save-live" style={{ padding: '8px 18px', fontSize: '12px' }} disabled={saving} onClick={() => saveDay(editingDay)}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '10px 16px 14px' }}>
              {(day.exercises || []).length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Rest day</div>
              ) : (day.exercises || []).map((ex, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--muted)', padding: '3px 0', borderBottom: i < day.exercises.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontWeight: '600', color: 'var(--dark)' }}>{ex.name}</span> — {ex.sets} sets × {ex.reps} · {ex.rest} rest
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Click a client to view and edit their workout program.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {clients.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No clients yet.</div>
        ) : clients.map(c => (
          <div key={c.id} onClick={() => viewClient(c)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarBg(c.user?.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{initials(c.user?.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{c.user?.name || '?'}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{c.plan_months} month plan · {c.status || 'active'}</div>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--muted)"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}