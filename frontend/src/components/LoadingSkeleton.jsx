const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.06) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: '8px',
};

function SkeletonBox({ width = '100%', height = '16px', style = {} }) {
  return (
    <div style={{ width, height, ...shimmerStyle, ...style }} />
  );
}

function CardSkeleton() {
  return (
    <div style={{
      background: 'var(--card)',
      borderRadius: '14px',
      border: '1px solid var(--border)',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <SkeletonBox height="14px" width="40%" />
      <SkeletonBox height="32px" width="60%" style={{ borderRadius: '6px' }} />
      <SkeletonBox height="12px" width="55%" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div style={{
      background: 'var(--card)',
      borderRadius: '14px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '13px',
            padding: '13px 20px',
            borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            flexShrink: 0,
            ...shimmerStyle,
          }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <SkeletonBox height="13px" width="45%" />
            <SkeletonBox height="11px" width="65%" />
          </div>
          <SkeletonBox height="12px" width="48px" style={{ flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

function ChatSkeleton() {
  const rows = [
    { align: 'flex-start', width: '58%' },
    { align: 'flex-end',   width: '42%' },
    { align: 'flex-start', width: '70%' },
    { align: 'flex-end',   width: '35%' },
    { align: 'flex-start', width: '52%' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '22px' }}>
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: row.align,
            gap: '10px',
            alignItems: 'flex-end',
          }}
        >
          {row.align === 'flex-start' && (
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              flexShrink: 0,
              ...shimmerStyle,
            }} />
          )}
          <div style={{
            width: row.width,
            height: '48px',
            borderRadius: row.align === 'flex-start'
              ? '16px 16px 16px 4px'
              : '16px 16px 4px 16px',
            ...shimmerStyle,
          }} />
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ type = 'card', count = 1 }) {
  if (type === 'list') return <ListSkeleton />;
  if (type === 'chat') return <ChatSkeleton />;

  // card (default) — render `count` cards in a column
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
