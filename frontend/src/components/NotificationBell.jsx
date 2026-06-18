import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export default function NotificationBell({ token, mutedTypes = [], onMuteToggle }) {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  async function fetchNotifs() {
    try {
      const res = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifs(Array.isArray(data) ? data : []);
    } catch {}
  }

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifs.filter(n => !n.is_read && !mutedTypes.includes(n.type));

  async function markAllRead() {
    try {
      await fetch(`${API}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  }

  const typeLabels = {
    new_dm: 'Message',
    coach_dm: 'Message',
    new_subscriber: 'Subscriber',
    community_post: 'Community',
    ai_meals: 'Nutrition',
    ai_strategy: 'Training',
  };

  function timeAgo(ts) {
    const m = Math.floor((Date.now() - new Date(ts)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread.length > 0) markAllRead(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          position: 'relative', padding: '6px', display: 'flex', alignItems: 'center',
        }}
        title="Notifications"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread.length > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#ff4d1c', color: '#fff',
            fontSize: '9px', fontWeight: '800',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '36px', right: 0,
          width: '320px', background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          zIndex: 1000, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.01em' }}>Notifications</div>
            {unread.length > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifs.filter(n => !mutedTypes.includes(n.type)).length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                No notifications yet
              </div>
            ) : notifs.filter(n => !mutedTypes.includes(n.type)).map(n => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '12px 16px',
                background: n.is_read ? 'transparent' : 'rgba(200,255,0,0.04)',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'var(--border)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {typeLabels[n.type] || 'Note'}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: n.is_read ? '500' : '700', marginBottom: '2px' }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--lime)', flexShrink: 0, marginTop: '6px' }} />}
              </div>
            ))}
          </div>

          {onMuteToggle && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Community posts</span>
              <button
                onClick={() => onMuteToggle('community_post')}
                style={{
                  fontSize: '11px', fontWeight: '600', border: '1px solid var(--border)',
                  borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
                  background: mutedTypes.includes('community_post') ? 'var(--border)' : 'none',
                  color: 'var(--muted)', fontFamily: 'inherit',
                }}
              >
                {mutedTypes.includes('community_post') ? 'Muted' : 'Mute'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}