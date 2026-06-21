import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminStats,
  getAdminCoaches,
  getAdminUsers,
  getAdminSubscriptions,
  getAdminRevenue,
  getAdminCoachGrowth,
  getAdminCategories,
  getAdminActivity,
  getAdminSystem,
  approveAdminCoach,
  suspendAdminCoach,
  deleteAdminCoach,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  clearAdminToken,
  adminLogout,
} from '../api';
import NotificationBell from '../components/NotificationBell';

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, visible }) {
  return (
    <div className={`toast${visible ? ' show' : ''}${type === 'success' ? ' success' : ''}`}>
      {message}
    </div>
  );
}

// ── Simple SVG Line Chart ─────────────────────────────────────────────────────
function MiniLineChart({ data, color = '#E8633A', label = '' }) {
  if (!data || data.length === 0) return (
    <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>
      No data yet
    </div>
  );
  const vals = data.map(d => Number(d.value || d.count || d.revenue || 0));
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const w = 400;
  const h = 80;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * (h - 12) - 6;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `${pts[0].split(',')[0]},${h} ${polyline} ${pts[pts.length - 1].split(',')[0]},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 80, overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${label})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Section: Overview ─────────────────────────────────────────────────────────
function SectionOverview({ showToast }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, a, r] = await Promise.allSettled([
          getAdminStats(),
          getAdminActivity(),
          getAdminRevenue(),
        ]);
        setStats(s);
        setActivity(Array.isArray(a) ? a.slice(0, 8) : []);
        setRevenue(Array.isArray(r) ? r : []);
        // build subs-over-time from revenue data
        const subData = Array.isArray(r) ? r.map(row => ({ value: row.subscriptions || 0, label: row.month })) : [];
        setSubs(subData);
      } catch (err) {
        showToast('Failed to load overview', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="page-header"><p style={{ color: 'var(--muted)' }}>Loading...</p></div>;

  const revenueData = revenue.map(r => ({ value: r.platform_revenue || r.platform_fee || 0, label: r.month }));

  return (
    <>
      <div className="page-header">
        <h1>Overview</h1>
        <p>Platform-wide stats and recent activity</p>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card">
          <div className="stat-label-sm">Total Coaches</div>
          <div className="stat-num-lg">{stats?.total_coaches ?? 0}</div>
          <div className="stat-change">Active on platform</div>
        </div>
        <div className="stat-card">
          <div className="stat-label-sm">Total Users</div>
          <div className="stat-num-lg">{stats?.total_users ?? 0}</div>
          <div className="stat-change">Registered clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-label-sm">Active Subscriptions</div>
          <div className="stat-num-lg"><em>{stats?.total_subscriptions ?? 0}</em></div>
          <div className="stat-change">Currently active</div>
        </div>
        <div className="stat-card dark">
          <div className="stat-label-sm">Platform Revenue</div>
          <div className="stat-num-lg"><em>${stats?.platform_revenue_month ? Number(stats.platform_revenue_month).toFixed(0) : '0'}</em></div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.3)' }}>This month (10% fee)</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head">
            <span className="card-title">New Subscriptions — Last 30 Days</span>
          </div>
          <div style={{ padding: '16px 22px 8px' }}>
            <MiniLineChart data={subs} color="#E8633A" label="subs" />
          </div>
          <div style={{ padding: '0 22px 16px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <div style={{ padding: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {revenue.slice(-3).reverse().map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                  <span>{row.month}</span>
                  <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{row.subscriptions || 0} subs</span>
                </div>
              ))}
              {revenue.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No subscription data yet</div>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Recent Activity</span>
          </div>
          <div className="activity-list">
            {activity.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No activity yet</div>
            ) : activity.map((item, i) => (
              <div className="act-item" key={i}>
                <div className="act-av" style={{ background: item.type === 'coach' ? 'linear-gradient(135deg,#E8633A,#c94e2a)' : item.type === 'subscription' ? '#2a7a4f' : '#5a5ac8' }}>
                  {(item.name || item.description || 'E').charAt(0).toUpperCase()}
                </div>
                <div className="act-body">
                  <div className="act-name">{item.name || 'Platform event'}</div>
                  <div className="act-text">{item.description || item.event}</div>
                  <div className="act-time">{item.time || item.created_at ? new Date(item.time || item.created_at).toLocaleString() : ''}</div>
                </div>
                <div className={`act-tag ${item.type === 'coach' ? 'tag-new' : item.type === 'subscription' ? 'tag-goal' : 'tag-msg'}`}>
                  {item.type || 'event'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {revenue.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-head">
            <span className="card-title">Platform Revenue — Last 30 Days</span>
          </div>
          <div style={{ padding: '16px 22px 16px' }}>
            <MiniLineChart data={revenueData} color="#2a7a4f" label="rev" />
          </div>
        </div>
      )}
    </>
  );
}

// ── Section: Coaches ──────────────────────────────────────────────────────────
function SectionCoaches({ showToast }) {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getAdminCoaches();
      setCoaches(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load coaches', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id) {
    setActionLoading(id + '-approve');
    try {
      await approveAdminCoach(id);
      showToast('Coach approved', 'success');
      load();
    } catch { showToast('Failed to approve coach', 'error'); }
    setActionLoading(null);
  }

  async function handleSuspend(id) {
    setActionLoading(id + '-suspend');
    try {
      await suspendAdminCoach(id);
      showToast('Coach suspended', 'success');
      load();
    } catch { showToast('Failed to suspend coach', 'error'); }
    setActionLoading(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this coach and all their data? This cannot be undone.')) return;
    setActionLoading(id + '-delete');
    try {
      await deleteAdminCoach(id);
      showToast('Coach deleted', 'success');
      load();
    } catch { showToast('Failed to delete coach', 'error'); }
    setActionLoading(null);
  }

  const pending = coaches.filter(c => !c.is_approved && c.is_active !== false);
  const filtered = coaches.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'pending') return !c.is_approved;
    if (filter === 'active') return c.is_approved && c.is_active !== false;
    if (filter === 'suspended') return c.is_active === false;
    return true;
  });

  return (
    <>
      <div className="page-header">
        <h1>Coaches</h1>
        <p>Manage coach accounts, approvals, and store visibility</p>
      </div>

      {pending.length > 0 && (
        <div style={{ background: 'rgba(232,99,58,0.06)', border: '1px solid rgba(232,99,58,0.2)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--orange)', marginBottom: 12 }}>
            {pending.length} coach{pending.length > 1 ? 'es' : ''} awaiting approval
          </div>
          {pending.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(232,99,58,0.1)' }}>
              <div className="ct-av" style={{ background: 'linear-gradient(135deg,#E8633A,#c94e2a)' }}>
                {c.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.email} · {c.sport || 'No category'}</div>
              </div>
              <button className="content-btn" style={{ background: 'var(--green)', color: '#fff', border: 'none' }}
                onClick={() => handleApprove(c.id)} disabled={actionLoading === c.id + '-approve'}>
                {actionLoading === c.id + '-approve' ? '...' : 'Approve'}
              </button>
              <button className="content-btn" style={{ color: '#e05252', borderColor: 'rgba(224,82,82,0.2)' }}
                onClick={() => handleDelete(c.id)} disabled={actionLoading === c.id + '-delete'}>
                Reject
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="clients-toolbar" style={{ marginBottom: 20 }}>
        <div className="search-box">
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input placeholder="Search coaches..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="free-filters">
          {['all', 'pending', 'active', 'suspended'].map(f => (
            <button key={f} className={`free-filter${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="clients-table">
        <div className="ct-head">
          <div>Coach</div>
          <div>Category</div>
          <div>Subscribers</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {search ? 'No coaches match your search.' : 'No coaches signed up yet.'}
          </div>
        ) : filtered.map(c => (
          <div className="ct-row" key={c.id}>
            <div className="ct-user">
              <div className="ct-av" style={{ background: 'linear-gradient(135deg,#E8633A,#c94e2a)' }}>
                {c.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="ct-name">{c.name}</div>
                <div className="ct-email">{c.email}</div>
              </div>
            </div>
            <div className="ct-cell">{c.sport || c.category || '—'}</div>
            <div className="ct-cell">{c.subscriber_count ?? 0}</div>
            <div>
              <span className={`ct-badge ${c.is_active === false ? '' : c.is_approved ? 'badge-active' : ''}`}
                style={c.is_active === false ? { background: 'rgba(224,82,82,0.1)', color: '#e05252' } :
                  !c.is_approved ? { background: 'rgba(232,99,58,0.1)', color: 'var(--orange)' } : {}}>
                {c.is_active === false ? 'Suspended' : c.is_approved ? 'Active' : 'Pending'}
              </span>
            </div>
            <div className="ct-actions">
              {!c.is_approved && c.is_active !== false && (
                <button className="ct-act-btn" title="Approve" onClick={() => handleApprove(c.id)}
                  disabled={actionLoading === c.id + '-approve'}>
                  <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
                </button>
              )}
              {c.is_active !== false && (
                <button className="ct-act-btn" title="Suspend" onClick={() => handleSuspend(c.id)}
                  disabled={actionLoading === c.id + '-suspend'}>
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </button>
              )}
              <button className="ct-act-btn" title="View store" onClick={() => window.open(`/coach/${c.id}`, '_blank')}>
                <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
              <button className="ct-act-btn" title="Delete" style={{ borderColor: 'rgba(224,82,82,0.2)' }}
                onClick={() => handleDelete(c.id)} disabled={actionLoading === c.id + '-delete'}>
                <svg viewBox="0 0 24 24" stroke="#e05252"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Section: Users ────────────────────────────────────────────────────────────
function SectionUsers({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch { showToast('Failed to load users', 'error'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const colors = ['#E8633A', '#2a7a4f', '#5a5ac8', '#c94e2a', '#3a7a2a'];

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
        <p>All registered clients on the platform</p>
      </div>

      <div className="clients-toolbar" style={{ marginBottom: 20 }}>
        <div className="search-box">
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="clients-table">
        <div className="ct-head">
          <div>User</div>
          <div>Joined</div>
          <div>Subscriptions</div>
          <div>Status</div>
          <div></div>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {search ? 'No users match your search.' : 'No users yet.'}
          </div>
        ) : filtered.map((u, i) => (
          <div className="ct-row" key={u.id}>
            <div className="ct-user">
              <div className="ct-av" style={{ background: colors[i % colors.length] }}>
                {u.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="ct-name">{u.name}</div>
                <div className="ct-email">{u.email}</div>
              </div>
            </div>
            <div className="ct-cell">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</div>
            <div className="ct-cell">{u.subscription_count ?? 0} active</div>
            <div>
              <span className="ct-badge badge-active">Active</span>
            </div>
            <div className="ct-actions">
              <button className="ct-act-btn" title="View profile">
                <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Section: Subscriptions ────────────────────────────────────────────────────
function SectionSubscriptions({ showToast }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminSubscriptions();
        setSubs(Array.isArray(data) ? data : []);
      } catch { showToast('Failed to load subscriptions', 'error'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = subs.filter(s => filter === 'all' || s.status === filter);
  const totalRevenue = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + (Number(s.plan_price) || 0), 0);

  return (
    <>
      <div className="page-header">
        <h1>Subscriptions</h1>
        <p>All client–coach subscription records</p>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label-sm">Total Active</div>
          <div className="stat-num-lg">{subs.filter(s => s.status === 'active').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label-sm">Gross Revenue</div>
          <div className="stat-num-lg">${totalRevenue.toFixed(0)}</div>
        </div>
        <div className="stat-card dark">
          <div className="stat-label-sm">Platform Fee (10%)</div>
          <div className="stat-num-lg"><em>${(totalRevenue * 0.1).toFixed(0)}</em></div>
        </div>
      </div>

      <div className="free-filters" style={{ marginBottom: 16 }}>
        {['all', 'active', 'cancelled', 'expired', 'pending_payment'].map(f => (
          <button key={f} className={`free-filter${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'pending_payment' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="clients-table">
        <div className="ct-head" style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr' }}>
          <div>User</div>
          <div>Coach</div>
          <div>Plan</div>
          <div>Start</div>
          <div>Status</div>
          <div>Price / Fee</div>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No subscriptions yet.</div>
        ) : filtered.map(s => (
          <div className="ct-row" key={s.id} style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr', cursor: 'default' }}>
            <div className="ct-cell">
              <div style={{ fontWeight: 500 }}>{s.user?.name || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.user?.email || ''}</div>
            </div>
            <div className="ct-cell">
              <div style={{ fontWeight: 500 }}>{s.coach?.name || '—'}</div>
            </div>
            <div className="ct-cell">{s.plan_months}mo</div>
            <div className="ct-cell">{s.plan_start ? new Date(s.plan_start).toLocaleDateString() : '—'}</div>
            <div>
              <span className="ct-badge"
                style={{
                  background: s.status === 'active' ? 'var(--green-bg)' : s.status === 'cancelled' ? 'rgba(224,82,82,0.1)' : 'rgba(0,0,0,0.05)',
                  color: s.status === 'active' ? 'var(--green)' : s.status === 'cancelled' ? '#e05252' : 'var(--muted)'
                }}>
                {s.status}
              </span>
            </div>
            <div className="ct-cell">
              <div style={{ fontWeight: 600 }}>${Number(s.plan_price || 0).toFixed(0)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Fee: ${(Number(s.plan_price || 0) * 0.1).toFixed(0)}</div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div style={{ padding: '12px 22px', background: 'var(--dark)', borderRadius: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{filtered.length} records shown</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
            Total: ${filtered.reduce((sum, s) => sum + (Number(s.plan_price) || 0), 0).toFixed(0)}
          </span>
        </div>
      )}
    </>
  );
}

// ── Section: Coach Growth ─────────────────────────────────────────────────────
function SectionGrowth({ showToast }) {
  const [period, setPeriod] = useState('month');
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getAdminCoachGrowth(period);
        setGrowth(Array.isArray(data) ? data : []);
      } catch { showToast('Failed to load growth data', 'error'); }
      finally { setLoading(false); }
    }
    load();
  }, [period]);

  const chartData = growth.map(g => ({ value: g.count, label: g.label }));

  function formatLabel(label) {
    if (period === 'year') return label;
    if (period === 'month') {
      const [y, m] = label.split('-');
      return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    // day or week — label is YYYY-MM-DD
    return new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  }

  return (
    <>
      <div className="page-header">
        <h1>Coach Growth</h1>
        <p>New coach signups over time</p>
      </div>

      <div className="free-filters" style={{ marginBottom: 20 }}>
        {['day', 'week', 'month', 'year'].map(p => (
          <button key={p} className={`free-filter${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <span className="card-title">New Coaches per {period.charAt(0).toUpperCase() + period.slice(1)}</span>
        </div>
        <div style={{ padding: '16px 22px' }}>
          {loading ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : (
            <MiniLineChart data={chartData} color="#E8633A" label="growth" />
          )}
        </div>
      </div>

      <div className="clients-table">
        <div className="ct-head" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
          <div>Period</div>
          <div>New Coaches</div>
          <div>Total Coaches (cumulative)</div>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
        ) : growth.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No coach signups yet.</div>
        ) : [...growth].reverse().map((g, i) => (
          <div className="ct-row" key={i} style={{ gridTemplateColumns: '2fr 1fr 1fr', cursor: 'default' }}>
            <div className="ct-cell" style={{ fontWeight: 600 }}>{formatLabel(g.label)}</div>
            <div className="ct-cell">{g.count}</div>
            <div className="ct-cell">{g.cumulative}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Section: Revenue ──────────────────────────────────────────────────────────
function SectionRevenue({ showToast }) {
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminRevenue();
        setRevenue(Array.isArray(data) ? data : []);
      } catch { showToast('Failed to load revenue', 'error'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const totalGross = revenue.reduce((sum, r) => sum + (Number(r.gross) || 0), 0);
  const totalFee = revenue.reduce((sum, r) => sum + (Number(r.platform_fee || r.platform_revenue) || 0), 0);
  const thisMonth = revenue[revenue.length - 1];
  const lastMonth = revenue[revenue.length - 2];
  const avgPerSub = revenue.reduce((sum, r) => sum + (Number(r.avg_per_sub) || 0), 0) / (revenue.length || 1);

  const chartData = revenue.map(r => ({ value: Number(r.platform_fee || r.platform_revenue || 0), label: r.month }));

  return (
    <>
      <div className="page-header">
        <h1>Revenue</h1>
        <p>Platform earnings breakdown over time</p>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card dark">
          <div className="stat-label-sm">All-Time Platform</div>
          <div className="stat-num-lg"><em>${totalFee.toFixed(0)}</em></div>
          <div className="stat-change" style={{ color: 'rgba(255,255,255,0.3)' }}>10% of gross</div>
        </div>
        <div className="stat-card">
          <div className="stat-label-sm">This Month</div>
          <div className="stat-num-lg">${Number(thisMonth?.platform_fee || thisMonth?.platform_revenue || 0).toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label-sm">Last Month</div>
          <div className="stat-num-lg">${Number(lastMonth?.platform_fee || lastMonth?.platform_revenue || 0).toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label-sm">Avg / Subscription</div>
          <div className="stat-num-lg">${isFinite(avgPerSub) ? avgPerSub.toFixed(0) : '0'}</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head">
            <span className="card-title">Monthly Platform Revenue</span>
          </div>
          <div style={{ padding: '16px 22px' }}>
            <MiniLineChart data={chartData} color="#2a7a4f" label="revenue" />
          </div>
        </div>
      )}

      <div className="clients-table">
        <div className="ct-head" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
          <div>Month</div>
          <div>Subscriptions</div>
          <div>Gross</div>
          <div>Platform 10%</div>
          <div>Net to Coaches</div>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
        ) : revenue.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No revenue data yet.</div>
        ) : [...revenue].reverse().map((r, i) => (
          <div className="ct-row" key={i} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', cursor: 'default' }}>
            <div className="ct-cell" style={{ fontWeight: 600 }}>{r.month}</div>
            <div className="ct-cell">{r.subscriptions || 0}</div>
            <div className="ct-cell">${Number(r.gross || 0).toFixed(0)}</div>
            <div className="ct-cell" style={{ color: 'var(--orange)', fontWeight: 600 }}>
              ${Number(r.platform_fee || r.platform_revenue || 0).toFixed(0)}
            </div>
            <div className="ct-cell">${Number(r.net_to_coaches || (r.gross - (r.platform_fee || r.platform_revenue || 0)) || 0).toFixed(0)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Section: Categories ───────────────────────────────────────────────────────
function SectionCategories({ showToast }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ name: '', slug: '', icon: '', description: '', sort_order: 0 });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getAdminCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch { showToast('Failed to load categories', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async function handleAdd() {
    if (!newCat.name.trim()) return;
    setActionLoading('add');
    try {
      await createAdminCategory({ ...newCat, slug: newCat.slug || slugify(newCat.name) });
      showToast('Category created', 'success');
      setNewCat({ name: '', slug: '', icon: '', description: '', sort_order: 0 });
      load();
    } catch { showToast('Failed to create category', 'error'); }
    setActionLoading(null);
  }

  async function handleEdit(id) {
    setActionLoading(id + '-edit');
    try {
      await updateAdminCategory(id, editData);
      showToast('Category updated', 'success');
      setEditId(null);
      load();
    } catch { showToast('Failed to update category', 'error'); }
    setActionLoading(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this category?')) return;
    setActionLoading(id + '-delete');
    try {
      await deleteAdminCategory(id);
      showToast('Category deleted', 'success');
      load();
    } catch { showToast('Failed to delete category', 'error'); }
    setActionLoading(null);
  }

  return (
    <>
      <div className="page-header">
        <h1>Categories</h1>
        <p>Manage coaching niches and categories</p>
      </div>

      {/* Add category form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <span className="card-title">Add Category</span>
        </div>
        <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr 80px 1fr', gap: 12, alignItems: 'end' }}>
          <div className="field">
            <label>Name</label>
            <input value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))} placeholder="e.g. Bodybuilding" />
          </div>
          <div className="field">
            <label>Slug</label>
            <input value={newCat.slug} onChange={e => setNewCat(p => ({ ...p, slug: e.target.value }))} placeholder="auto-generated" />
          </div>
          <div className="field">
            <label>Icon</label>
            <input value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} placeholder="💪" />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={newCat.description} onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
          </div>
        </div>
        <div style={{ padding: '0 22px 18px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-save-content" onClick={handleAdd} disabled={actionLoading === 'add' || !newCat.name.trim()}>
            {actionLoading === 'add' ? 'Adding...' : '+ Add Category'}
          </button>
        </div>
      </div>

      {/* Category list */}
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
      ) : categories.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Add your first category to let coaches choose their niche.
        </div>
      ) : (
        <div className="clients-table">
          <div className="ct-head" style={{ gridTemplateColumns: '60px 2fr 1fr 1fr 1fr 100px' }}>
            <div>Icon</div>
            <div>Name</div>
            <div>Slug</div>
            <div>Coaches</div>
            <div>Active</div>
            <div>Actions</div>
          </div>
          {categories.map(cat => (
            <div className="ct-row" key={cat.id} style={{ gridTemplateColumns: '60px 2fr 1fr 1fr 1fr 100px', cursor: 'default' }}>
              {editId === cat.id ? (
                <>
                  <div className="ct-cell">
                    <input value={editData.icon ?? cat.icon ?? ''} onChange={e => setEditData(p => ({ ...p, icon: e.target.value }))}
                      style={{ width: 40, padding: '4px 8px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 16 }} />
                  </div>
                  <div className="ct-cell">
                    <input value={editData.name ?? cat.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
                      style={{ width: '100%', padding: '6px 10px', border: '1.5px solid var(--orange)', borderRadius: 8, fontSize: 13 }} />
                  </div>
                  <div className="ct-cell">
                    <input value={editData.slug ?? cat.slug} onChange={e => setEditData(p => ({ ...p, slug: e.target.value }))}
                      style={{ width: '100%', padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  </div>
                  <div className="ct-cell">{cat.coach_count ?? 0}</div>
                  <div className="ct-cell">
                    <input type="checkbox" checked={editData.is_active ?? cat.is_active}
                      onChange={e => setEditData(p => ({ ...p, is_active: e.target.checked }))} />
                  </div>
                  <div className="ct-actions">
                    <button className="ct-act-btn" title="Save" onClick={() => handleEdit(cat.id)} disabled={actionLoading === cat.id + '-edit'}>
                      <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
                    </button>
                    <button className="ct-act-btn" title="Cancel" onClick={() => setEditId(null)}>
                      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ct-cell" style={{ fontSize: 22 }}>{cat.icon || '📁'}</div>
                  <div className="ct-cell">
                    <div style={{ fontWeight: 500 }}>{cat.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{cat.description || ''}</div>
                  </div>
                  <div className="ct-cell" style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)' }}>{cat.slug}</div>
                  <div className="ct-cell">{cat.coach_count ?? 0} coaches</div>
                  <div>
                    <span className="ct-badge" style={cat.is_active ? { background: 'var(--green-bg)', color: 'var(--green)' } : { background: 'rgba(0,0,0,0.05)', color: 'var(--muted)' }}>
                      {cat.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <div className="ct-actions">
                    <button className="ct-act-btn" title="Edit" onClick={() => { setEditId(cat.id); setEditData({}); }}>
                      <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="ct-act-btn" title="Delete" style={{ borderColor: 'rgba(224,82,82,0.2)' }}
                      onClick={() => handleDelete(cat.id)} disabled={actionLoading === cat.id + '-delete'}>
                      <svg viewBox="0 0 24 24" stroke="#e05252"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Section: Activity Log ─────────────────────────────────────────────────────
function SectionActivity({ showToast }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminActivity();
        setActivity(Array.isArray(data) ? data : []);
      } catch { showToast('Failed to load activity', 'error'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const typeFilters = ['all', 'coach', 'user', 'subscription', 'ai'];
  const filtered = activity.filter(a => filter === 'all' || a.type === filter);

  const typeColors = {
    coach: 'linear-gradient(135deg,#E8633A,#c94e2a)',
    user: '#5a5ac8',
    subscription: '#2a7a4f',
    ai: 'var(--dark)',
    flag: '#e05252',
  };

  const tagClasses = {
    coach: 'tag-new',
    user: 'tag-new',
    subscription: 'tag-goal',
    ai: 'tag-msg',
    flag: 'tag-msg',
  };

  return (
    <>
      <div className="page-header">
        <h1>Activity Log</h1>
        <p>Chronological feed of all platform events</p>
      </div>

      <div className="free-filters" style={{ marginBottom: 16 }}>
        {typeFilters.map(f => (
          <button key={f} className={`free-filter${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="activity-list">
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No activity yet.</div>
          ) : filtered.map((item, i) => (
            <div className="act-item" key={i}>
              <div className="act-av" style={{ background: typeColors[item.type] || 'var(--dark)' }}>
                {item.type === 'coach' ? '🏋' : item.type === 'subscription' ? '📋' : item.type === 'ai' ? '🤖' : item.type === 'flag' ? '🚩' : '👤'}
              </div>
              <div className="act-body">
                <div className="act-name">{item.name || 'Platform event'}</div>
                <div className="act-text">{item.description || item.event || ''}</div>
                <div className="act-time">{item.time || item.created_at ? new Date(item.time || item.created_at).toLocaleString() : ''}</div>
              </div>
              <div className={`act-tag ${tagClasses[item.type] || 'tag-msg'}`}>{item.type || 'event'}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Section: System Health ────────────────────────────────────────────────────
function SectionSystem({ showToast }) {
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminSystem();
        setSystem(data);
      } catch { showToast('Failed to load system health', 'error'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  function StatusDot({ ok }) {
    return <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? '#4ade80' : '#e05252', display: 'inline-block', marginRight: 6 }} />;
  }

  return (
    <>
      <div className="page-header">
        <h1>System Health</h1>
        <p>Infrastructure status, queue, and error log</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
      ) : !system ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Unable to fetch system status.</div>
      ) : (
        <>
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label-sm">Server</div>
              <div className="stat-num-lg" style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>
                <StatusDot ok={system.server_ok !== false} />
                {system.server_ok !== false ? 'Online' : 'Error'}
              </div>
              <div className="stat-change">Uptime: {system.uptime || '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label-sm">Database</div>
              <div className="stat-num-lg" style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>
                <StatusDot ok={system.db_ok !== false} />
                {system.db_ok !== false ? 'Connected' : 'Error'}
              </div>
              <div className="stat-change">Supabase</div>
            </div>
            <div className="stat-card">
              <div className="stat-label-sm">Groq API</div>
              <div className="stat-num-lg" style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>
                <StatusDot ok={system.groq_ok !== false} />
                {system.groq_ok !== false ? 'Reachable' : 'Error'}
              </div>
              <div className="stat-change">llama3-70b</div>
            </div>
            <div className="stat-card dark">
              <div className="stat-label-sm">Queue Length</div>
              <div className="stat-num-lg"><em>{system.queue_length ?? 0}</em></div>
              <div className="stat-change" style={{ color: 'rgba(255,255,255,0.3)' }}>Pending AI requests</div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-title">Recent Errors</span>
            </div>
            {!system.errors || system.errors.length === 0 ? (
              <div style={{ padding: '24px 22px', color: 'var(--muted)', fontSize: 13 }}>
                No errors logged. System running cleanly.
              </div>
            ) : (
              <div>
                {system.errors.map((err, i) => (
                  <div key={err.id || i} style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: err.resolved ? '#4ade80' : '#e05252', display: 'inline-block' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: err.resolved ? 'var(--muted)' : 'var(--dark)', marginBottom: 2 }}>
                        {err.type || 'Error'} — {err.message}
                      </div>
                      {err.stack && (
                        <pre style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 60, overflow: 'hidden' }}>
                          {err.stack.slice(0, 200)}
                        </pre>
                      )}
                      <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>
                        {err.created_at ? new Date(err.created_at).toLocaleString() : ''}
                        {err.resolved ? ' · Resolved' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ── Main AdminDashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const [loggingOut, setLoggingOut] = useState(false);

  function showToast(message, type = 'info') {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await adminLogout(); } catch {}
    navigate('/admin/login');
  }

  function nav(section) {
    setActiveSection(section);
    setSidebarOpen(false);
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { id: 'coaches', label: 'Coaches', icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'users', label: 'Users', icon: <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { id: 'revenue', label: 'Revenue', icon: <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { id: 'growth', label: 'Coach Growth', icon: <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
    { id: 'categories', label: 'Categories', icon: <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7"/></svg> },
    { id: 'activity', label: 'Activity Log', icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { id: 'system', label: 'System Health', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 1 0 0 14.14"/></svg> },
  ];

  const sectionTitles = {
    overview: 'Overview',
    coaches: 'Coaches',
    users: 'Users',
    subscriptions: 'Subscriptions',
    revenue: 'Revenue',
    growth: 'Coach Growth',
    categories: 'Categories',
    activity: 'Activity Log',
    system: 'System Health',
  };

  return (
    <div style={{ display: 'flex' }}>
      {/* Sidebar overlay on mobile */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' mobile-open' : ''}`}>
        <div className="sb-logo">
          Coachly<span>.</span>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>Admin</div>
        </div>

        <div className="sb-coach" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div className="sb-avatar" style={{ background: 'linear-gradient(135deg,#1A1610,#4a3a2a)', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: 11 }}>
            ADM
          </div>
          <div style={{ flex: 1 }}>
            <div className="sb-name">Admin</div>
            <div className="sb-role">Platform owner</div>
            <div className="sb-status">
              <span className="sb-status-dot" />
              Signed in
            </div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-section-label">Platform</div>
          {navItems.slice(0, 6).map(item => (
            <button key={item.id} className={`nav-item${activeSection === item.id ? ' active' : ''}`} onClick={() => nav(item.id)}>
              {item.icon}
              {item.label}
            </button>
          ))}

          <div className="sb-section-label">Content</div>
          {navItems.slice(6, 8).map(item => (
            <button key={item.id} className={`nav-item${activeSection === item.id ? ' active' : ''}`} onClick={() => nav(item.id)}>
              {item.icon}
              {item.label}
            </button>
          ))}

          <div className="sb-section-label">System</div>
          {navItems.slice(8).map(item => (
            <button key={item.id} className={`nav-item${activeSection === item.id ? ' active' : ''}`} onClick={() => nav(item.id)}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sb-bottom">
          <button className="sb-logout" onClick={handleLogout} disabled={loggingOut}>
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
              <svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="topbar-title">{sectionTitles[activeSection]}</div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <NotificationBell token={localStorage.getItem('coachly_admin_token')} />
            <div className="tb-date">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          </div>
        </div>

        {/* Page content */}
        <div className="page-content">
          {activeSection === 'overview' && <SectionOverview showToast={showToast} />}
          {activeSection === 'coaches' && <SectionCoaches showToast={showToast} />}
          {activeSection === 'users' && <SectionUsers showToast={showToast} />}
          {activeSection === 'subscriptions' && <SectionSubscriptions showToast={showToast} />}
          {activeSection === 'revenue' && <SectionRevenue showToast={showToast} />}
          {activeSection === 'growth' && <SectionGrowth showToast={showToast} />}
          {activeSection === 'categories' && <SectionCategories showToast={showToast} />}
          {activeSection === 'activity' && <SectionActivity showToast={showToast} />}
          {activeSection === 'system' && <SectionSystem showToast={showToast} />}
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}
