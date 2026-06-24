import { useNavigate } from 'react-router-dom';

const GREEN = '#C8FF00';
const GREEN_DARK = '#8FB800';
const NAVY = '#0B1528';
const CARD_BG = '#15203A';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT = '#F1F5F9';
const TEXT_DIM = '#94A3B8';

const sections = [
  { heading: 'Acceptance', body: 'By using Coachly you agree to these Terms. If you do not agree, please do not use the platform.' },
  { heading: 'Use of Service', body: 'Coachly connects clients with fitness and wellness coaches. You may only use the platform for lawful purposes and in accordance with these Terms.' },
  { heading: 'Subscriptions', body: 'Subscriptions are billed monthly. You may cancel at any time. All payments are final — we do not offer refunds once a subscription has been activated.' },
  { heading: 'Coach Content', body: 'Coaches are independent professionals and not employees of Coachly. Always consult a qualified healthcare professional before starting any fitness or nutrition program.' },
  { heading: 'User Responsibilities', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.' },
  { heading: 'Intellectual Property', body: 'All content on the Coachly platform, including text, graphics, and software, is the property of Coachly or its coaches and is protected by applicable intellectual property laws.' },
  { heading: 'Limitation of Liability', body: 'Coachly is not liable for any indirect, incidental, or consequential damages arising from your use of the platform or reliance on coach advice.' },
  { heading: 'Changes to Terms', body: 'We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated Terms.' },
  { heading: 'Contact', body: 'Questions? legal@coachly.app' },
];

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: TEXT, fontFamily: "'Inter',system-ui,sans-serif", position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.07, pointerEvents: 'none' }} />
      {/* Navbar */}
      <header style={{ position: 'sticky', zIndex: 100, top: 0, zIndex: 100, height: '66px', background: 'rgba(8,14,28,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', padding: '0 40px', justifyContent: 'space-between' }}>
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
      <main style={{ maxWidth: '720px', position: 'relative', zIndex: 1, margin: '0 auto', padding: '60px 24px 100px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: GREEN, marginBottom: '12px' }}>Legal</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(28px,4vw,42px)', fontWeight: '800', margin: '0 0 12px', color: TEXT }}>Terms of Service</h1>
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
        <span style={{ fontSize: '12px', color: 'rgba(241,245,249,0.3)' }}>© {new Date().getFullYear()} Coachly · <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: TEXT_DIM, cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', textDecoration: 'underline' }}>Privacy Policy</button></span>
      </footer>
    </div>
  );
}
