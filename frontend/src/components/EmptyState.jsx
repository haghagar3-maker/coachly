export default function EmptyState({ message, cta, onCta }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      gap: '12px',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '14px',
        background: 'rgba(232,99,58,0.08)',
        border: '1.5px solid rgba(232,99,58,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '4px',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p style={{
        fontSize: '13px',
        color: 'var(--muted)',
        lineHeight: '1.6',
        maxWidth: '280px',
        margin: 0,
      }}>
        {message}
      </p>
      {cta && onCta && (
        <button
          onClick={onCta}
          style={{
            marginTop: '8px',
            padding: '9px 20px',
            borderRadius: '100px',
            border: 'none',
            background: 'var(--orange)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}
