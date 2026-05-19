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

  // Load coach data
  useEffect(() => {
    async function load() {
      try {
        const c = await getCoachMe();
        setCoach(c);
      } catch (err) {
        console.error(err);
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

  if (loading) return <div>Loading...</div>;
  if (!coach) return null;

  return (
    <div style={{ display: 'flex' }}>
      {/* Sidebar overlay on mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sb-logo">
          Coachly<span>.</span>
        </div>

        <div className="sb-coach">
          <div className="sb-avatar">
            {coach.name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div style={{ flex: 1 }}>
            <div className="sb-name">{coach.name}</div>
            <div className="sb-role">Coach</div>
            <div className="sb-status">
              <span className="sb-status-dot" />
              Active
            </div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section-label">Dashboard</div>
          <button
            className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveSection('overview'); setSidebarOpen(false); }}
          >
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Overview
          </button>
          <button
            className={`nav-item ${activeSection === 'clients' ? 'active' : ''}`}
            onClick={() => { setActiveSection('clients'); setSidebarOpen(false); }}
          >
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Clients
          </button>
          <button
            className={`nav-item ${activeSection === 'messages' ? 'active' : ''}`}
            onClick={() => { setActiveSection('messages'); setSidebarOpen(false); }}
          >
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Messages
          </button>
          <button
            className={`nav-item ${activeSection === 'ai' ? 'active' : ''}`}
            onClick={() => { setActiveSection('ai'); setSidebarOpen(false); }}
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            AI Conversations
          </button>

          <div className="sb-section-label">Manage</div>
          <button
            className={`nav-item ${activeSection === 'store' ? 'active' : ''}`}
            onClick={() => { setActiveSection('store'); setSidebarOpen(false); }}
          >
            <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Store Editor
          </button>
          <button
            className={`nav-item ${activeSection === 'content' ? 'active' : ''}`}
            onClick={() => { setActiveSection('content'); setSidebarOpen(false); }}
          >
            <svg viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            Program Content
          </button>
          <button
            className={`nav-item ${activeSection === 'training' ? 'active' : ''}`}
            onClick={() => { setActiveSection('training'); setSidebarOpen(false); }}
          >
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            AI Training
          </button>
        </nav>

        <div className="sb-bottom">
          <button
            className="sb-view-store"
            onClick={() => window.open(`/coach/${coach.id}`, '_blank')}
          >
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
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="topbar-title">
            {activeSection === 'overview' && 'Overview'}
            {activeSection === 'clients' && 'Clients'}
            {activeSection === 'messages' && 'Messages'}
            {activeSection === 'ai' && 'AI Conversations'}
            {activeSection === 'store' && 'Store Editor'}
            {activeSection === 'content' && 'Program Content'}
            {activeSection === 'training' && 'AI Training'}
          </h1>
          <div className="topbar-right">
            <div className="tb-date">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>

        {/* Page content */}
        <div className="page-content">
          {activeSection === 'overview' && <SectionOverview coach={coach} />}
          {activeSection === 'clients' && <SectionClients coach={coach} />}
          {activeSection === 'messages' && <SectionMessages coach={coach} />}
          {activeSection === 'ai' && <SectionAI coach={coach} />}
          {activeSection === 'store' && <SectionStore coach={coach} setCoach={setCoach} />}
          {activeSection === 'content' && <SectionContent coach={coach} />}
          {activeSection === 'training' && <SectionTraining coach={coach} setCoach={setCoach} />}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════
function SectionOverview({ coach }) {
  const [stats, setStats] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, c] = await Promise.all([getCoachStats(), getCoachCheckins()]);
        setStats(s);
        setCheckins(c.slice(0, 5)); // last 5
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label-sm">Active Subscribers</div>
          <div className="stat-num-lg">{stats?.activeSubscribers || 0}</div>
          <div className="stat-change">+0 this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label-sm">Revenue This Month</div>
          <div className="stat-num-lg">
            <em>${stats?.revenueThisMonth?.toFixed(0) || 0}</em>
          </div>
          <div className="stat-sub">90% of total (10% platform fee)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label-sm">AI Conversations</div>
          <div className="stat-num-lg">{stats?.aiConversationsThisWeek || 0}</div>
          <div className="stat-sub">This week</div>
        </div>
        <div className="stat-card dark">
          <div className="stat-label-sm">Goals Reached</div>
          <div className="stat-num-lg">{stats?.goalsReached || 0}</div>
          <div className="stat-sub">Client milestones</div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="dash-grid">
        {/* Recent activity */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Recent Activity</div>
          </div>
          <div className="activity-list">
            {checkins.length === 0 && (
              <div style={{ padding: '32px 22px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                No recent check-ins
              </div>
            )}
            {checkins.map((c) => (
              <div key={c.id} className="act-item">
                <div className="act-av" style={{ background: `hsl(${Math.random()*360}, 65%, 55%)` }}>
                  {c.user_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="act-body">
                  <div className="act-name">{c.user_name}</div>
                  <div className="act-text">Submitted check-in</div>
                  <div className="act-time">{new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
                <span className="act-tag tag-goal">Check-in</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Quick Actions</div>
          </div>
          <div className="quick-actions">
            <button className="qa-btn">
              <div className="qa-icon">
                <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="qa-label">Reply to clients</div>
                <div className="qa-desc">View and respond to messages</div>
              </div>
            </button>
            <button className="qa-btn">
              <div className="qa-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="qa-label">Review AI conversations</div>
                <div className="qa-desc">Monitor AI coach interactions</div>
              </div>
            </button>
            <button className="qa-btn">
              <div className="qa-icon">
                <svg viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="qa-label">Upload content</div>
                <div className="qa-desc">Add videos, guides, or resources</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION: CLIENTS
// ═══════════════════════════════════════════════════════════════════════
function SectionClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const data = await getCoachClients();
        setClients(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading...</div>;

  const filtered = clients.filter(c => {
    if (filter === 'active' && c.subscription_status !== 'active') return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="clients-toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active only
        </button>
      </div>

      <div className="clients-table">
        <div className="ct-head">
          <div>Client</div>
          <div>Plan</div>
          <div>Progress</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: '48px 22px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
            No clients yet. Share your store link to get your first subscribers.
          </div>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="ct-row">
            <div className="ct-user">
              <div className="ct-av" style={{ background: `hsl(${Math.random()*360}, 65%, 55%)` }}>
                {c.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="ct-name">{c.name}</div>
                <div className="ct-email">{c.email}</div>
              </div>
            </div>
            <div className="ct-cell">{c.plan_months} months</div>
            <div className="ct-cell">
              Month {c.current_month || 1} of {c.plan_months}
              <div className="progress-bar-sm">
                <div className="progress-bar-fill" style={{ width: `${((c.current_month || 1) / c.plan_months) * 100}%` }} />
              </div>
            </div>
            <div className="ct-cell">
              <span className={`ct-badge ${c.subscription_status === 'active' ? 'badge-active' : ''}`}>
                {c.subscription_status || 'active'}
              </span>
            </div>
            <div className="ct-actions">
              <button className="ct-act-btn" title="View profile">
                <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button className="ct-act-btn" title="Message">
                <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION: MESSAGES (Direct)
// ═══════════════════════════════════════════════════════════════════════
function SectionMessages({ coach }) {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCoachDirectMessages();
        setThreads(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function openThread(thread) {
    setActiveThread(thread);
    setMessages(thread.messages || []);
  }

  async function send() {
    if (!input.trim() || !activeThread) return;
    try {
      await sendCoachDirectMessage(activeThread.user_id, input);
      const newMsg = {
        id: Date.now(),
        sender_type: 'coach',
        content: input,
        created_at: new Date().toISOString(),
      };
      setMessages([...messages, newMsg]);
      setInput('');
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="messages-wrap">
      {/* Thread list */}
      <div className="msg-list">
        <div className="msg-list-head">Direct Messages</div>
        {threads.length === 0 && (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
            No messages yet
          </div>
        )}
        {threads.map((t) => (
          <div
            key={t.user_id}
            className={`msg-thread ${activeThread?.user_id === t.user_id ? 'active' : ''}`}
            onClick={() => openThread(t)}
          >
            <div className="mt-av" style={{ background: `hsl(${Math.random()*360}, 65%, 55%)` }}>
              {t.user_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mt-name">{t.user_name}</div>
              <div className="mt-preview">{t.last_message || 'No messages yet'}</div>
            </div>
            <div className="mt-time">{t.last_message_time ? new Date(t.last_message_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}</div>
            {t.unread_count > 0 && <div className="mt-unread" />}
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div className="chat-area">
        {!activeThread ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontSize: '14px' }}>
            Select a conversation
          </div>
        ) : (
          <>
            <div className="chat-head">
              <div className="chat-user">
                <div className="chat-av" style={{ background: `hsl(${Math.random()*360}, 65%, 55%)` }}>
                  {activeThread.user_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="chat-name">{activeThread.user_name}</div>
                  <div className="chat-status">Active subscriber</div>
                </div>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`msg-bubble-wrap ${m.sender_type === 'coach' ? 'coach-msg' : ''}`}>
                  <div className="bubble-av" style={{ background: m.sender_type === 'coach' ? '#1A1610' : `hsl(${Math.random()*360}, 65%, 55%)` }}>
                    {m.sender_type === 'coach' ? coach.name?.charAt(0).toUpperCase() : activeThread.user_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className={`bubble ${m.sender_type === 'coach' ? 'coach-bubble' : 'user-bubble'}`}>
                      {m.content}
                    </div>
                    <div className="bubble-meta">
                      {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-input-wrap">
              <input
                type="text"
                className="chat-input"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
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

// ═══════════════════════════════════════════════════════════════════════
// SECTION: AI CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════
function SectionAI({ coach }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const data = await getCoachAiConversations();
        setConversations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading...</div>;

  const filtered = conversations.filter(c => {
    if (filter === 'flagged' && !c.has_flagged) return false;
    return true;
  });

  if (activeConv) {
    return (
      <div className="ai-thread-wrap">
        <div className="ai-thread-head">
          <button className="ai-thread-back" onClick={() => setActiveConv(null)}>
            <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div className="ai-thread-user">
            <div className="ai-thread-name">{activeConv.user_name}</div>
            <div className="ai-thread-sub">AI conversation history</div>
          </div>
          <button className="ai-thread-btn">Reply personally</button>
        </div>
        <div className="ai-thread-messages">
          {activeConv.messages?.map((m) => (
            <div key={m.id} className={`ai-msg ${m.role === 'assistant' ? 'ai-side' : 'user-side'}`}>
              <div className="ai-msg-av" style={{ background: m.role === 'assistant' ? 'linear-gradient(135deg,#1e3a2a,#2d6b47)' : `hsl(${Math.random()*360}, 65%, 55%)` }}>
                {m.role === 'assistant' ? 'AI' : activeConv.user_name?.charAt(0).toUpperCase()}
              </div>
              <div className="ai-msg-bubble">
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="ai-convs-toolbar">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === 'flagged' ? 'active' : ''}`}
          onClick={() => setFilter('flagged')}
        >
          Flagged
        </button>
      </div>

      <div className="ai-clients-grid">
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
            Conversations appear once clients start chatting with their AI coach
          </div>
        )}
        {filtered.map((c) => (
          <div key={c.user_id} className="ai-client-card" onClick={() => setActiveConv(c)}>
            <div className="ai-client-card-top">
              <div className="ai-cc-av" style={{ background: `hsl(${Math.random()*360}, 65%, 55%)` }}>
                {c.user_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <div className="ai-cc-name">{c.user_name}</div>
                <div className="ai-cc-sub">Active subscriber</div>
              </div>
            </div>
            <div className="ai-cc-last">{c.last_message || 'No messages yet'}</div>
            <div className="ai-cc-footer">
              <div className="ai-cc-meta">{c.last_message_time ? new Date(c.last_message_time).toLocaleString('en-US', { month: 'short', day: 'numeric' }) : ''}</div>
              {c.message_count > 0 && (
                <div className={`ai-cc-count ${c.has_flagged ? 'ai-cc-unread' : ''}`}>
                  {c.message_count}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION: STORE EDITOR
// ═══════════════════════════════════════════════════════════════════════
function SectionStore({ coach, setCoach }) {
  const [form, setForm] = useState({
    name: coach.name || '',
    tagline: coach.tagline || '',
    bio: coach.bio || '',
    sport: coach.sport || '',
    location: coach.location || '',
    years_experience: coach.years_experience || '',
    plan_price: coach.plan_price || '',
  });
  const [saving, setSaving] = useState(false);

  function update(key, val) {
    setForm({ ...form, [key]: val });
  }

  async function save() {
    setSaving(true);
    try {
      await updateCoachProfile(form);
      setCoach({ ...coach, ...form });
      alert('Saved');
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="store-editor-wrap">
      <div className="editor-fields">
        <div className="field-group">
          <div className="field-group-title">Basic Info</div>
          <div className="field">
            <label>Display Name</label>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="field">
            <label>Tagline</label>
            <input type="text" value={form.tagline} onChange={(e) => update('tagline', e.target.value)} placeholder="e.g. Strength coach for busy professionals" />
          </div>
          <div className="field">
            <label>Bio</label>
            <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} rows={5} placeholder="Tell your story..." />
          </div>
          <div className="field">
            <label>Sport / Niche</label>
            <input type="text" value={form.sport} onChange={(e) => update('sport', e.target.value)} />
          </div>
          <div className="field">
            <label>Location</label>
            <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)} />
          </div>
          <div className="field">
            <label>Years Experience</label>
            <input type="number" value={form.years_experience} onChange={(e) => update('years_experience', e.target.value)} />
          </div>
        </div>

        <div className="field-group">
          <div className="field-group-title">Pricing</div>
          <div className="field">
            <label>Monthly Price (USD)</label>
            <input type="number" value={form.plan_price} onChange={(e) => update('plan_price', e.target.value)} placeholder="199" />
          </div>
        </div>
      </div>

      <div className="store-preview-wrap">
        <div className="store-preview">
          <div className="sp-banner">
            <div className="sp-banner-label">Banner image</div>
          </div>
          <div className="sp-body">
            <div className="sp-name">{form.name || 'Your Name'}</div>
            <div className="sp-tag">{form.sport || 'Fitness'} · {form.location || 'Location'}</div>
            <div className="sp-stats">
              <div>
                <div className="sp-stat-num">0</div>
                <div className="sp-stat-label">Subscribers</div>
              </div>
              <div>
                <div className="sp-stat-num">{form.years_experience || 0}<em>y</em></div>
                <div className="sp-stat-label">Experience</div>
              </div>
            </div>
            <div className="sp-price">
              <strong>${form.plan_price || 0}</strong> <small>/month</small>
            </div>
            <button className="sp-btn">Subscribe now</button>
          </div>
          <div className="preview-label">Live preview</div>
        </div>
      </div>

      <div className="save-bar">
        <div className="save-bar-left">
          Last saved: <strong>just now</strong>
        </div>
        <div className="save-bar-right">
          <button className="btn-save-live" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION: CONTENT
// ═══════════════════════════════════════════════════════════════════════
function SectionContent() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCoachContent();
        setContent(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <div className="content-grid">
        {content.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
            Upload your first content piece. Your subscribers will see it immediately.
          </div>
        )}
        {content.map((c) => (
          <div key={c.id} className="content-card">
            <div className="content-thumb">
              <div className="content-thumb-bg" />
              <div className="play-circle">
                <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <div className={`content-type-tag ct-${c.type}`}>
                {c.type}
              </div>
            </div>
            <div className="content-body">
              <div className="content-name">{c.title}</div>
              <div className="content-meta">{c.duration || 'No duration'}</div>
              <div className="content-actions">
                <button className="content-btn">Edit</button>
                <button className="content-btn">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION: AI TRAINING
// ═══════════════════════════════════════════════════════════════════════
function SectionTraining({ coach, setCoach }) {
  const [form, setForm] = useState({
    ai_who: coach.ai_who || '',
    ai_method: coach.ai_method || '',
    ai_tone: coach.ai_tone || '',
  });
  const [saving, setSaving] = useState(false);

  function update(key, val) {
    setForm({ ...form, [key]: val });
  }

  async function save() {
    setSaving(true);
    try {
      await updateCoachAiTraining(form);
      setCoach({ ...coach, ...form });
      alert('AI training updated');
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="ai-status-bar">
        <div className="ai-pulse" />
        <div className="ai-status-text">
          Your AI is <strong>active</strong>
        </div>
        <div>
          <div className="ai-conversations">0</div>
          <div className="ai-conv-label-sm">conversations this week</div>
        </div>
      </div>

      <div className="ai-train-block">
        <div className="ai-train-block-head">
          <div style={{ flex: 1 }}>
            <div className="ai-train-block-title">Who you are</div>
            <div className="ai-train-block-desc">Background, values, what makes you different</div>
          </div>
        </div>
        <textarea
          className="textarea-field"
          value={form.ai_who}
          onChange={(e) => update('ai_who', e.target.value)}
          placeholder="Example: I'm a former NCAA athlete who transitioned to coaching after a career-ending injury. I focus on sustainable training that prevents burnout..."
        />
      </div>

      <div className="ai-train-block">
        <div className="ai-train-block-head">
          <div style={{ flex: 1 }}>
            <div className="ai-train-block-title">Your coaching method</div>
            <div className="ai-train-block-desc">Training philosophy, periodization, nutrition principles</div>
          </div>
        </div>
        <textarea
          className="textarea-field"
          value={form.ai_method}
          onChange={(e) => update('ai_method', e.target.value)}
          placeholder="Example: I use linear periodization with progressive overload. Nutrition-wise, I don't believe in restrictive diets..."
        />
      </div>

      <div className="ai-train-block">
        <div className="ai-train-block-head">
          <div style={{ flex: 1 }}>
            <div className="ai-train-block-title">How you talk</div>
            <div className="ai-train-block-desc">Tone, personality, expressions, communication style</div>
          </div>
        </div>
        <textarea
          className="textarea-field"
          value={form.ai_tone}
          onChange={(e) => update('ai_tone', e.target.value)}
          placeholder="Example: I'm direct but supportive. I don't sugarcoat things, but I always explain the why behind my advice..."
        />
      </div>

      <button
        className="btn-save-live"
        onClick={save}
        disabled={saving}
        style={{ marginTop: '20px' }}
      >
        {saving ? 'Saving...' : 'Push update to AI'}
      </button>
    </>
  );
}
