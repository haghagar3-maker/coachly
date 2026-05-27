export default function Sidebar({
  user,
  coach,
  subscription,
  activeSection,
  onNavigate,
  isOpen,
  onClose,
  badges = {},
}) {
  // Calculate plan progress
  let progressPct = 0;
  let progressLabel = '';
  if (subscription) {
    const start = new Date(subscription.plan_start);
    const end = subscription.plan_end ? new Date(subscription.plan_end) : null;
    if (end) {
      const total = end - start;
      const elapsed = Date.now() - start;
      progressPct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
      const monthsTotal = subscription.plan_months || 1;
      const monthsElapsed = Math.min(monthsTotal, Math.round((elapsed / total) * monthsTotal));
      progressLabel = `Month ${monthsElapsed} of ${monthsTotal}`;
    }
  }

  const initials = (name) =>
    name
      ? name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
      : '?';

  const navSection = (label, items) => (
    <>
      <div className="sb-section-label">{label}</div>
      {items.map(({ id, icon, label: itemLabel, badge }) => (
        <button
          key={id}
          className={`nav-item${activeSection === id ? ' active' : ''}`}
          onClick={() => { onNavigate(id); if (onClose) onClose(); }}
        >
          {icon}
          {itemLabel}
          {badge ? <span className="nav-badge">{badge}</span> : null}
        </button>
      ))}
    </>
  );

  return (
    <>
      {/* Overlay — mobile only */}
      {isOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div className="sb-logo">COACH<span>LY</span></div>

        {/* Coach strip */}
        {coach && (
          <div className="sb-coach-strip">
            <div className="sb-coach-label">Your Coach</div>
            <div className="sb-coach-card">
              <div className="sb-coach-av">
                {coach.photo
                  ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9px' }} />
                  : initials(coach.name)}
              </div>
              <div>
                <div className="sb-coach-name">{coach.name}</div>
                <div className="sb-coach-cat">{coach.sport || coach.category || ''}</div>
              </div>
              <span className="sb-coach-badge">Active</span>
            </div>
          </div>
        )}

        {/* Plan progress */}
        {subscription && (
          <div className="sb-progress">
            <div className="sb-prog-label">
              Plan progress
              <span>{progressPct}%</span>
            </div>
            <div className="sb-prog-bar">
              <div className="sb-prog-fill" style={{ width: `${progressPct}%` }} />
            </div>
            {progressLabel && (
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
                {progressLabel}
              </div>
            )}
          </div>
        )}

        {/* User info */}
        {user && (
          <div className="sb-user">
            <div className="sb-user-av" style={{ padding: 0, overflow: 'hidden' }}>
              {user.photo
                ? <img src={user.photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : initials(user.name)}
            </div>
            <div>
              <div className="sb-user-name">{user.name}</div>
              <div className="sb-user-plan">
                {subscription ? `${subscription.plan_months}mo plan` : 'No active plan'}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sb-nav">
          {navSection('Today', [
            {
              id: 'home',
              label: 'Dashboard',
              badge: null,
              icon: (
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              ),
            },
            {
              id: 'chat',
              label: 'AI Coach',
              badge: badges.chat || null,
              icon: (
                <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              ),
            },
            {
              id: 'dm',
              label: 'Message Coach',
              badge: badges.dm || null,
              icon: (
                <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              ),
            },
          ])}

          {navSection('My Plan', [
            {
              id: 'strategy',
              label: 'Strategy',
              badge: null,
              icon: (
                <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              ),
            },
            {
              id: 'nutrition',
              label: 'Nutrition',
              badge: null,
              icon: (
                <svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>
              ),
            },
            {
              id: 'foodscan',
              label: 'Food Scan',
              badge: null,
              icon: (
                <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              ),
            },
            {
              id: 'content',
              label: 'Content library',
              badge: null,
              icon: (
                <svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
              ),
            },
          ])}

          {navSection('My Journey', [
            {
              id: 'progress',
              label: 'My progress',
              badge: null,
              icon: (
                <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              ),
            },
            {
              id: 'community',
              label: 'Community',
              badge: null,
              icon: (
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              ),
            },
          ])}
        </nav>

        {/* Bottom actions */}
        <div className="sb-bottom">
          <button
            className={`sb-profile-btn${activeSection === 'profile' ? ' active' : ''}`}
            onClick={() => { if (onNavigate) onNavigate('profile'); if (onClose) onClose(); }}
          >
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            My Profile
          </button>
          <button
            className="sb-change-coach"
            onClick={() => { if (onNavigate) onNavigate('switch-coach'); if (onClose) onClose(); }}
          >
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
            All my coaches
          </button>
        </div>
      </aside>
    </>
  );
}
