import { useNavigate, useSearchParams } from 'react-router-dom';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  '#E8633A', '#2a7a4f', '#5a5ac8', '#c94e2a', '#2d6b47',
  '#8b5cf6', '#0891b2', '#b45309', '#be185d', '#065f46',
];

function avatarColor(id) {
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function SubscriptionSwitcher({ subscriptions = [], onClose }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeCoachId = searchParams.get('coach');

  function switchTo(coachId) {
    navigate(`/dashboard?coach=${coachId}`, { replace: true });
    if (onClose) onClose();
  }

  if (!subscriptions.length) {
    return (
      <div style={{
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'var(--muted)',
      }}>
        No active subscriptions.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {subscriptions.map((sub) => {
        const coach = sub.coach || {};
        const isActive = coach.id === activeCoachId;
        return (
          <button
            key={sub.id}
            onClick={() => switchTo(coach.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '13px 20px',
              background: isActive ? 'rgba(232,99,58,0.06)' : 'none',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              borderLeft: isActive ? '3px solid var(--orange)' : '3px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              transition: 'background 0.12s',
              width: '100%',
            }}
          >
            {/* Coach avatar */}
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: coach.photo ? 'transparent' : avatarColor(coach.id),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              color: '#fff',
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              {coach.photo
                ? <img src={coach.photo} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials(coach.name)}
            </div>

            {/* Coach info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark)', marginBottom: '2px' }}>
                {coach.name || 'Unknown coach'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {sub.plan_months ? `${sub.plan_months}mo plan` : ''}{sub.status ? ` · ${sub.status}` : ''}
              </div>
            </div>

            {/* Active indicator */}
            {isActive && (
              <span style={{
                fontSize: '9px',
                fontWeight: '600',
                background: 'rgba(232,99,58,0.12)',
                color: 'var(--orange)',
                padding: '3px 8px',
                borderRadius: '100px',
                flexShrink: 0,
              }}>
                Active
              </span>
            )}
          </button>
        );
      })}

      {/* Browse more */}
      <button
        onClick={() => { navigate('/'); if (onClose) onClose(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '13px 20px',
          background: 'none',
          border: 'none',
          borderTop: '1px solid var(--border)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '12px',
          color: 'var(--muted)',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Browse more coaches
      </button>
    </div>
  );
}
