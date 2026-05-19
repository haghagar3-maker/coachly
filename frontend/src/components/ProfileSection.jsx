import { useState, useRef, useEffect } from 'react';
import { updateUserProfile, cancelSubscription, logout } from '../api';
import { showToast } from './Toast';

const AVATAR_COLORS = ['#C8FF00','#2ECC6A','#FF4D1C','#7F77DD','#2d6b47','#0891b2','#b45309','#be185d'];
function avatarColor(id) {
  if (!id) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}
function daysLeft(endDate) {
  if (!endDate) return 0;
  const diff = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}
function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── PWA Install Banner ───────────────────────────────────────────
function InstallBanner() {
  const [canInstall, setCanInstall] = useState(!!window.coachlyInstallPrompt);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = () => setCanInstall(true);
    window.addEventListener('pwa-installable', handler);
    return () => window.removeEventListener('pwa-installable', handler);
  }, []);

  async function handleInstall() {
    const prompt = window.coachlyInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') { setInstalled(true); setCanInstall(false); }
  }

  if (installed) {
    return (
      <div style={{background:'var(--green-bg)',border:'1px solid rgba(46,204,106,0.25)',borderRadius:'var(--r-lg)',padding:'16px 20px',display:'flex',alignItems:'center',gap:'14px',marginBottom:'16px'}}>
        <div style={{width:40,height:40,borderRadius:11,background:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>App installed! 🎉</div>
          <div style={{fontSize:11,color:'var(--muted)'}}>Find Coachly on your home screen</div>
        </div>
      </div>
    );
  }

  if (canInstall) {
    return (
      <div style={{background:'var(--dark)',borderRadius:'var(--r-lg)',padding:'16px 20px',display:'flex',alignItems:'center',gap:'14px',marginBottom:'16px'}}>
        <div style={{width:40,height:40,borderRadius:11,background:'rgba(200,255,0,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><polyline points="8 2 12 6 16 2"/></svg>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:2}}>Install Coachly</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Add to your home screen for instant access</div>
        </div>
        <button onClick={handleInstall} style={{padding:'9px 18px',borderRadius:9,background:'var(--lime)',color:'var(--dark)',border:'none',fontFamily:'Space Grotesk,sans-serif',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0}}>
          Install
        </button>
      </div>
    );
  }

  // Can't install via prompt (iOS/already installed) — show manual instructions
  return (
    <div style={{background:'var(--dark)',borderRadius:'var(--r-lg)',padding:'16px 20px',display:'flex',alignItems:'center',gap:'14px',marginBottom:'16px'}}>
      <div style={{width:40,height:40,borderRadius:11,background:'rgba(200,255,0,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5" strokeLinecap="round"/></svg>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:3}}>Install Coachly on your device</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.5}}>
          <strong style={{color:'rgba(255,255,255,0.7)'}}>iPhone/iPad:</strong> Tap Share → "Add to Home Screen"<br/>
          <strong style={{color:'rgba(255,255,255,0.7)'}}>Android:</strong> Tap browser menu → "Install app"<br/>
          <strong style={{color:'rgba(255,255,255,0.7)'}}>Desktop:</strong> Look for the install icon in your address bar
        </div>
      </div>
    </div>
  );
}

// ── Main ProfileSection ──────────────────────────────────────────
export default function ProfileSection({ user, subscriptions = [], onUpdate, onLogout }) {
  const fileRef = useRef();
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [goal, setGoal] = useState(user?.goal || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || user?.photo || null);
  const [avatarBase64, setAvatarBase64] = useState(null);

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setAvatarPreview(ev.target.result); setAvatarBase64(ev.target.result); };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { name: name.trim(), bio: bio.trim(), goal: goal.trim() };
      if (avatarBase64) payload.avatar_url = avatarBase64;
      await updateUserProfile(payload);
      showToast('Profile updated ✓', 'success');
      if (onUpdate) onUpdate({ ...user, ...payload });
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelSub(subId) {
    if (!confirm('Cancel this coaching subscription? You can re-subscribe later.')) return;
    setCancellingId(subId);
    try {
      await cancelSubscription(subId);
      showToast('Subscription cancelled', 'success');
      if (onUpdate) onUpdate(null, true);
    } catch (err) {
      showToast(err.message || 'Failed to cancel', 'error');
    } finally {
      setCancellingId(null);
    }
  }

  async function handleLogout() {
    await logout().catch(() => {});
    if (onLogout) onLogout();
  }

  return (
    <div style={{animation:'slideUp 0.3s ease'}}>

      {/* ── Profile Hero ─────────────────────── */}
      <div className="profile-hero">
        <div className="profile-av-wrap">
          <div
            className="profile-av"
            style={{background: avatarPreview ? 'none' : `linear-gradient(135deg, ${avatarColor(user?.id)}, #7AC200)`}}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" />
              : <span style={{fontFamily:'Unbounded,sans-serif',color:'var(--dark)'}}>{initials(name)}</span>
            }
          </div>
          <div className="profile-av-edit" onClick={() => fileRef.current?.click()} title="Change photo">
            <svg viewBox="0 0 24 24"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarChange} />
        </div>

        <div className="profile-info">
          <div className="profile-name">{name || 'Your Name'}</div>
          <div className="profile-email">{user?.email}</div>
          <div className="profile-badges">
            {subscriptions.filter(s => s.status === 'active').length > 0 && (
              <span className="profile-badge lime">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {subscriptions.filter(s => s.status === 'active').length} Active Coach{subscriptions.filter(s => s.status === 'active').length > 1 ? 'es' : ''}
              </span>
            )}
            {goal && <span className="profile-badge coral">🎯 {goal}</span>}
            <span className="profile-badge green">Member</span>
          </div>
        </div>
      </div>

      {/* ── Install Banner ──────────────────── */}
      <InstallBanner />

      {/* ── Profile Grid ───────────────────── */}
      <div className="profile-grid">

        {/* Personal Info */}
        <div className="profile-section-box">
          <div className="profile-section-title">Personal Info</div>

          <div className="profile-field">
            <label>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="profile-field">
            <label>Email</label>
            <input value={user?.email || ''} disabled style={{opacity:0.5,cursor:'not-allowed'}} />
          </div>
          <div className="profile-field">
            <label>Goal</label>
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Lose 10kg, Build muscle, Run a 5k…" />
          </div>
          <div className="profile-field">
            <label>Bio / About me</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell your coach a bit about yourself…"
              rows={3}
            />
          </div>

          <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* My Coaches / Subscriptions */}
        <div className="profile-section-box">
          <div className="profile-section-title">My Coaches</div>

          {subscriptions.length === 0 ? (
            <div style={{textAlign:'center',padding:'24px 0',color:'var(--muted)'}}>
              <div style={{fontSize:32,marginBottom:10}}>🏋️</div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>No coaches yet</div>
              <div style={{fontSize:11}}>Browse coaches and subscribe to get started</div>
            </div>
          ) : (
            <div className="subscription-list">
              {subscriptions.map(sub => {
                const dl = daysLeft(sub.end_date || sub.plan_end);
                const isActive = sub.status === 'active';
                const coachName = sub.coach?.name || 'Coach';
                const coachPhoto = sub.coach?.photo || sub.coach?.avatar_url;
                const coachCat = sub.coach?.sport || sub.coach?.category || 'Coaching';
                return (
                  <div key={sub.id} className={`sub-item${isActive ? ' active-sub' : ''}`}>
                    <div className="sub-coach-av" style={{background: coachPhoto ? 'none' : (isActive ? undefined : 'rgba(0,0,0,0.06)')}}>
                      {coachPhoto
                        ? <img src={coachPhoto} alt={coachName} />
                        : <span style={{color:isActive?'var(--dark)':'var(--muted)'}}>{initials(coachName)}</span>
                      }
                    </div>
                    <div className="sub-info">
                      <div className="sub-coach-name">{coachName}</div>
                      <div className="sub-coach-cat">{coachCat}</div>
                      <div className="sub-status-row">
                        <span className={`sub-status-badge ${isActive?'active':'expired'}`}>
                          {isActive ? 'Active' : 'Expired'}
                        </span>
                        {isActive && dl > 0 && <span className="sub-days-left">{dl}d left</span>}
                        {!isActive && (sub.end_date || sub.plan_end) && (
                          <span className="sub-days-left">Ended {fmtDate(sub.end_date || sub.plan_end)}</span>
                        )}
                      </div>
                    </div>
                    <div className="sub-actions">
                      {isActive && (
                        <button
                          className="sub-action-btn cancel"
                          onClick={() => handleCancelSub(sub.id)}
                          disabled={cancellingId === sub.id}
                        >
                          {cancellingId === sub.id ? '…' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Danger Zone ────────────────────── */}
      <div className="danger-zone">
        <div className="danger-zone-title">⚠️ Account Actions</div>
        <div className="danger-zone-desc">
          Logging out ends your current session — you can log back in anytime.
          Deleting your account is permanent and removes all your data.
        </div>
        <button className="danger-btn" onClick={handleLogout}>
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
        <button className="danger-btn" onClick={() => {
          if (confirm('Delete your account? This cannot be undone. All your data will be permanently removed.')) {
            showToast('Contact support to delete your account', 'error');
          }
        }}>
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          Delete Account
        </button>
      </div>
    </div>
  );
}
