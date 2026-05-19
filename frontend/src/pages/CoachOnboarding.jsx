import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coachSignup, saveToken } from '../api';
import Toast, { showToast } from '../components/Toast';

// ─── Step indicators ────────────────────────────────────────────
const STEPS = [
  { label: 'Account' },
  { label: 'Profile' },
  { label: 'Pricing' },
  { label: 'AI Setup' },
];

function StepBar({ current }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '0', marginBottom: '36px',
    }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: i < current ? 'var(--orange)' : i === current ? 'var(--orange)' : 'var(--border)',
              color: i <= current ? '#fff' : 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '700',
              transition: 'background 0.2s',
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <div style={{
              fontSize: '10px', fontWeight: '600',
              color: i <= current ? 'var(--text)' : 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
            }}>
              {s.label}
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              width: '48px', height: '2px', marginBottom: '16px',
              background: i < current ? 'var(--orange)' : 'var(--border)',
              transition: 'background 0.2s',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      {hint && <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>{hint}</div>}
      {children}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      className="input"
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ resize: 'vertical', minHeight: `${rows * 24}px` }}
    />
  );
}

// ─── Step 1: Account ────────────────────────────────────────────
function StepAccount({ data, onChange }) {
  return (
    <>
      <Field label="Full name *">
        <input className="input" placeholder="Your coaching name" value={data.name} onChange={(e) => onChange('name', e.target.value)} />
      </Field>
      <Field label="Email address *">
        <input className="input" type="email" placeholder="you@example.com" value={data.email} onChange={(e) => onChange('email', e.target.value)} />
      </Field>
      <Field label="Password *" hint="Minimum 8 characters">
        <input className="input" type="password" placeholder="••••••••" value={data.password} onChange={(e) => onChange('password', e.target.value)} />
      </Field>
      <Field label="Confirm password *">
        <input className="input" type="password" placeholder="••••••••" value={data.confirmPassword} onChange={(e) => onChange('confirmPassword', e.target.value)} />
      </Field>
    </>
  );
}

// ─── Step 2: Public profile ──────────────────────────────────────
function StepProfile({ data, onChange }) {
  return (
    <>
      <Field label="Sport / Niche *" hint="e.g. Strength & Conditioning, Marathon Running, Weight Loss">
        <input className="input" placeholder="What do you coach?" value={data.sport} onChange={(e) => onChange('sport', e.target.value)} />
      </Field>
      <Field label="Years of experience">
        <input className="input" type="number" min="0" placeholder="e.g. 5" value={data.experience} onChange={(e) => onChange('experience', e.target.value)} />
      </Field>
      <Field label="Location">
        <input className="input" placeholder="e.g. London, UK" value={data.location} onChange={(e) => onChange('location', e.target.value)} />
      </Field>
      <Field label="Bio" hint="Shown on your public store page. Introduce yourself to potential clients.">
        <Textarea rows={4} placeholder="Tell potential clients who you are and why they should work with you…" value={data.bio} onChange={(e) => onChange('bio', e.target.value)} />
      </Field>
      <Field label="Credentials / Qualifications">
        <Textarea rows={2} placeholder="e.g. NSCA-CPT, BSc Sports Science, 5x marathon finisher…" value={data.credentials} onChange={(e) => onChange('credentials', e.target.value)} />
      </Field>
      <Field label="Coaching philosophy">
        <Textarea rows={3} placeholder="How do you approach training and client results?…" value={data.philosophy} onChange={(e) => onChange('philosophy', e.target.value)} />
      </Field>
      <Field label="Profile photo URL" hint="Optional. Paste a direct image link.">
        <input className="input" type="url" placeholder="https://…" value={data.photo} onChange={(e) => onChange('photo', e.target.value)} />
      </Field>
      <Field label="Banner image URL" hint="Optional. Wide image for your store header.">
        <input className="input" type="url" placeholder="https://…" value={data.banner} onChange={(e) => onChange('banner', e.target.value)} />
      </Field>
    </>
  );
}

// ─── Step 3: Pricing ────────────────────────────────────────────
function StepPricing({ data, onChange }) {
  return (
    <>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px', lineHeight: '1.6' }}>
        Set prices for your subscription plans. Leave a field blank to hide that plan. Coachly takes a 10% platform fee — you keep 90%.
      </p>
      {[
        { key: 'price_3m', label: '3-month plan', placeholder: 'e.g. 297' },
        { key: 'price_6m', label: '6-month plan', placeholder: 'e.g. 497' },
        { key: 'price_12m', label: '12-month plan', placeholder: 'e.g. 797' },
      ].map(({ key, label, placeholder }) => (
        <Field key={key} label={label} hint="USD · total for the plan period">
          <div style={{ position: 'relative', maxWidth: '220px' }}>
            <span style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--muted)', fontWeight: '600', pointerEvents: 'none',
            }}>$</span>
            <input
              className="input"
              type="number"
              min="0"
              placeholder={placeholder}
              value={data[key]}
              onChange={(e) => onChange(key, e.target.value)}
              style={{ paddingLeft: '28px' }}
            />
          </div>
        </Field>
      ))}
      <Field label="Meal plan philosophy" hint="How do you approach nutrition? Your AI will use this when answering client nutrition questions.">
        <Textarea rows={3} placeholder="e.g. Whole foods, high protein, flexible dieting approach…" value={data.meal_philosophy} onChange={(e) => onChange('meal_philosophy', e.target.value)} />
      </Field>
    </>
  );
}

// ─── Step 4: AI setup ───────────────────────────────────────────
function StepAI({ data, onChange }) {
  return (
    <>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px', lineHeight: '1.6' }}>
        Your AI coaching assistant answers client questions in your voice, 24/7. Train it to sound like you.
      </p>
      <Field label="AI voice & tone" hint="How should your AI communicate with clients? Be specific.">
        <Textarea rows={3} placeholder="e.g. Direct, no-nonsense, uses data. Never motivational fluff. Calls out excuses but stays respectful…" value={data.ai_tone} onChange={(e) => onChange('ai_tone', e.target.value)} />
      </Field>
      <Field label="Training method & methodology" hint="What training approach does your AI represent?">
        <Textarea rows={3} placeholder="e.g. Progressive overload with periodisation. Always emphasises form before load. Favours compound lifts…" value={data.ai_method} onChange={(e) => onChange('ai_method', e.target.value)} />
      </Field>
      <Field label="Who are you? (AI identity)" hint="Help the AI understand your coaching identity and story.">
        <Textarea rows={3} placeholder="e.g. Former competitive powerlifter, now coaching busy professionals to get strong without living in the gym…" value={data.ai_who} onChange={(e) => onChange('ai_who', e.target.value)} />
      </Field>
    </>
  );
}

// ─── Main onboarding component ──────────────────────────────────
export default function CoachOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    // Step 1
    name: '', email: '', password: '', confirmPassword: '',
    // Step 2
    sport: '', experience: '', location: '', bio: '', credentials: '',
    philosophy: '', photo: '', banner: '',
    // Step 3
    price_3m: '', price_6m: '', price_12m: '', meal_philosophy: '',
    // Step 4
    ai_tone: '', ai_method: '', ai_who: '',
  });

  function onChange(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function validateStep() {
    if (step === 0) {
      if (!form.name.trim()) { showToast('Name is required', 'error'); return false; }
      if (!form.email.trim()) { showToast('Email is required', 'error'); return false; }
      if (!form.password || form.password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return false; }
      if (form.password !== form.confirmPassword) { showToast('Passwords do not match', 'error'); return false; }
    }
    if (step === 1) {
      if (!form.sport.trim()) { showToast('Sport / niche is required', 'error'); return false; }
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        sport: form.sport.trim() || undefined,
        experience: form.experience ? parseInt(form.experience, 10) : undefined,
        location: form.location.trim() || undefined,
        bio: form.bio.trim() || undefined,
        credentials: form.credentials.trim() || undefined,
        philosophy: form.philosophy.trim() || undefined,
        photo: form.photo.trim() || undefined,
        banner: form.banner.trim() || undefined,
        price_3m: form.price_3m ? parseFloat(form.price_3m) : undefined,
        price_6m: form.price_6m ? parseFloat(form.price_6m) : undefined,
        price_12m: form.price_12m ? parseFloat(form.price_12m) : undefined,
        meal_philosophy: form.meal_philosophy.trim() || undefined,
        ai_tone: form.ai_tone.trim() || undefined,
        ai_method: form.ai_method.trim() || undefined,
        ai_who: form.ai_who.trim() || undefined,
      };

      const res = await coachSignup(payload);
      saveToken(res.token, 'coach');
      showToast('Account created! Redirecting to your dashboard…', 'success');
      setTimeout(() => navigate('/coach/dashboard'), 1200);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px 80px' }}>
      <Toast />

      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '28px', fontWeight: '700', marginBottom: '6px',
          }}>
            Become a coach
          </div>
          <div style={{ fontSize: '15px', color: 'var(--muted)' }}>
            Set up your coaching business on Coachly
          </div>
        </div>

        <StepBar current={step} />

        {/* Card */}
        <div style={{
          background: 'var(--card)', borderRadius: '20px',
          border: '1px solid var(--border)', padding: '32px',
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '20px', fontWeight: '700', marginBottom: '22px',
          }}>
            {STEPS[step].label}
          </div>

          {step === 0 && <StepAccount data={form} onChange={onChange} />}
          {step === 1 && <StepProfile data={form} onChange={onChange} />}
          {step === 2 && <StepPricing data={form} onChange={onChange} />}
          {step === 3 && <StepAI data={form} onChange={onChange} />}

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '8px' }}>
            {step > 0 ? (
              <button
                onClick={back}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '12px 22px',
                  fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  color: 'var(--text)',
                }}
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {isLast ? (
              <button
                className="btn-primary"
                onClick={submit}
                disabled={submitting}
                style={{ opacity: submitting ? 0.7 : 1, minWidth: '160px' }}
              >
                {submitting ? 'Creating account…' : 'Create account →'}
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={next}
                style={{ minWidth: '140px' }}
              >
                Continue →
              </button>
            )}
          </div>
        </div>

        {/* Already have account */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
          Already have a coach account?{' '}
          <span
            style={{ color: 'var(--orange)', cursor: 'pointer', fontWeight: '600' }}
            onClick={() => navigate('/coach/login')}
          >
            Log in
          </span>
        </div>
      </div>
    </div>
  );
}
