import { useNavigate } from 'react-router-dom';

const GREEN = '#C8FF00';
const GREEN_DARK = '#8FB800';
const NAVY = '#0B1528';
const CARD_BG = '#15203A';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT = '#F1F5F9';
const TEXT_DIM = '#94A3B8';

const sections = [
  { heading: 'Information We Collect', body: 'We collect information you provide when creating an account, subscribing to a coach, or communicating with us — name, email, payment info, fitness goals, and content you upload.' },
  { heading: 'How We Use It', body: 'To provide, maintain and improve our services, process transactions, send support messages, and (with your consent) marketing communications.' },
  { heading: 'Information Sharing', body: 'We do not sell or trade your personally identifiable information to outside parties.' },
  { heading: 'Data Retention', body: 'We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion at any time by contacting us.' },
  { heading: 'Cookies', body: 'We use cookies and similar technologies to keep you logged in and understand how our platform is used. You can disable cookies in your browser settings.' },
  { heading: 'Your Rights', body: 'You have the right to access, correct, or delete your personal data at any time. Contact us at privacy@coachly.app to exercise these rights.' },
  { heading: 'Contact', body: 'Questions? privacy@coachly.app' },
];

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: TEXT, fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Navbar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '66px', background: 'rgba(8,14,28,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', padding: '0 40px', justifyContent: 'space-between' }}>
        <span onClick={() => navigate('/')} style={{ fontFamily: "'Playfair Display',serif", fontWeight: '900', fontSize: '20px', color: '#F1EDE6', letterSpacing: '0.12em', cursor: 'pointer' }}>
          COACHLY<span style={{ color: GREEN }}>.</span>
        </span>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: `1px solid ${BORDER}`, color: TEXT_DIM, cursor: 'pointer', padding: '8px 18px', borderRadius: '100px', fontFamily: 'inherit', fontSize: '13px', transition: 'all 0.18s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.color = GREEN; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM; }}>
          ← Back
        </button>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px 100px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GREEN, marginBottom: '12px' }}>Legal</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(28px,4vw,42px)', fontWeight: '800', margin: '0 0 12px', color: TEXT }}>Privacy Policy</h1>
          <p style={{ fontSize: '13px', color: TEXT_DIM, margin: 0 }}>Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {sections.map((s, i) => (
            <div key={i}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '700', color: GREEN, marginBottom: '10px', marginTop: 0 }}>{s.heading}</h2>
              <p style={{ fontSize: '14px', color: TEXT_DIM, lineHeight: '1.8', margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ padding: '24px 40px', borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: 'rgba(241,245,249,0.3)' }}>© {new Date().getFullYear()} Coachly · <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: TEXT_DIM, cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', textDecoration: 'underline' }}>Terms of Service</button></span>
      </footer>
    </div>
  );
}
