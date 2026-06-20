// server.js — Coachly backend (Express + Supabase + Groq)
// Deploy to Railway. All routes documented in the spec.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { enqueue, getQueueLength } = require('./queue');
const {
  detectAskCoach,
  workoutModal,
  nutritionModal,
  motivationModal,
  scheduleModal,
  generateMealPlan,
  generateRecipe,
  classifyTopic,
  generalModal,
} = require('./groq-modals');
const { createCheckout, handleWebhook, calculatePlatformFee } = require('./payment');

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '100mb' })); // base64 images can be large

// In-memory error log (last 100 errors) — also persisted to DB
const recentErrors = [];
function logError(type, message, stack) {
  const entry = { type, message, stack, time: new Date().toISOString() };
  recentErrors.unshift(entry);
  if (recentErrors.length > 100) recentErrors.pop();
  // Persist to DB (non-blocking)
  db('error_logs', 'POST', { type, message, stack }).catch(() => {});
}

process.on('uncaughtException', (err) => logError('uncaughtException', err.message, err.stack));
process.on('unhandledRejection', (err) => logError('unhandledRejection', err?.message, err?.stack));

// ─────────────────────────────────────────────
// SUPABASE HELPER
// ─────────────────────────────────────────────
async function db(table, method = 'GET', body = null, query = '') {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': process.env.SUPABASE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : (method === 'PATCH' ? 'return=representation' : ''),
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DB error on ${method} ${table}: ${errText}`);
  }

  // DELETE returns 204 no content
  if (res.status === 204) return {};
  return res.json().catch(() => ({}));
}
function generateSlug(name, id) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base}-${id.slice(0, 6)}`;
}
// ─────────────────────────────────────────────
// NOTIFICATION HELPER
// ─────────────────────────────────────────────
async function createNotification(recipientId, recipientType, type, title, body = null, senderName = null, senderPhoto = null) {
  try {
    await db('notifications', 'POST', {
      recipient_id: recipientId,
      recipient_type: recipientType,
      type,
      title,
      body,
      sender_name: senderName,
      sender_photo: senderPhoto,
    });
  } catch (e) {
    // non-blocking — never crash the main request
    console.error('Notification error:', e.message);
  }
}

// ─────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const sessions = await db('sessions', 'GET', null, `?token=eq.${token}&select=*`);
    if (!sessions || sessions.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    const session = sessions[0];
    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }
    req.session = session;
    next();
  } catch (e) {
    logError('auth', e.message, e.stack);
    res.status(500).json({ error: 'Auth error' });
  }
}

function requireCoach(req, res, next) {
  if (req.session.type !== 'coach') return res.status(403).json({ error: 'Coach access required' });
  next();
}

function requireUser(req, res, next) {
  if (req.session.type !== 'user') return res.status(403).json({ error: 'User access required' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.type !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
const startTime = Date.now();
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000) });
});

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

// GET /api/coaches — all active approved coaches, optional ?category=slug filter
app.get('/api/coaches', async (req, res) => {
  try {
    let query = '?is_active=eq.true&is_approved=eq.true&select=id,name,slug,photo,banner,sport,tagline,plan_price,category_id,years_experience,location,specialties,subscriber_count';
    if (req.query.category) {
      // Join with categories to filter by slug
      const cats = await db('categories', 'GET', null, `?slug=eq.${req.query.category}&select=id`);
      if (cats && cats.length > 0) {
        query += `&category_id=eq.${cats[0].id}`;
      }
    }
    const coaches = await db('coaches', 'GET', null, query);

    res.json(coaches);
  } catch (e) {
    logError('GET /api/coaches', e.message, e.stack);
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});

// GET /api/coach/:id — public coach profile
app.get('/api/coach/:identifier', async (req, res, next) => {
  const reserved = ['me', 'signup', 'login', 'clients', 'client', 'checkins', 'checkin', 'direct-messages', 'direct-message', 'ai-conversations', 'ai-conversation', 'content', 'programs', 'program', 'ai-training', 'stats', 'profile', 'client-nutrition', 'client-program', 'client-meal-plans', 'account', 'meeting', 'meetings', 'post', 'posts', 'comments', 'analytics', 'payment-method', 'pending-payments', 'approve-payment', 'reject-payment'];
  if (reserved.includes(req.params.identifier)) return next();
  try {
    const { identifier } = req.params;
    // Support both UUID and slug
    const isUUID = /^[0-9a-f-]{36}$/.test(identifier);
    const query = isUUID ? `?id=eq.${identifier}&select=*` : `?slug=eq.${identifier}&select=*`;
    const coaches = await db('coaches', 'GET', null, query);
    if (!coaches || coaches.length === 0) return res.status(404).json({ error: 'Coach not found' });
    const coach = coaches[0];
    if (!coach.is_approved || !coach.is_active) return res.status(404).json({ error: 'Coach not found' });

    // Subscriber count
    const subs = await db('subscriptions', 'GET', null, `?coach_id=eq.${coach.id}&status=eq.active&select=id`);
    coach.subscriber_count = subs.length;

    res.json(coach);
  } catch (e) {
    logError('GET /api/coach/:id', e.message, e.stack);
    res.status(500).json({ error: 'Failed to fetch coach' });
  }
});

// GET /api/categories — all active categories
app.get('/api/categories', async (req, res) => {
  try {
    const cats = await db('categories', 'GET', null, '?is_active=eq.true&order=sort_order.asc&select=*');
    res.json(cats || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/posts/:coachId — community posts preview (max 3, public)
app.get('/api/posts/:coachId', async (req, res) => {
  try {
    const posts = await db('posts', 'GET', null,
      `?coach_id=eq.${req.params.coachId}&order=created_at.desc&limit=50&select=*`
    );
    if (!posts) return res.json([]);

    // Attach user info and comment count
    const enriched = await Promise.all(posts.map(async (post) => {
      const users = await db('users', 'GET', null, `?id=eq.${post.user_id}&select=name,photo`);
      const comments = await db('comments', 'GET', null, `?post_id=eq.${post.id}&select=id`);
      return {
        ...post,
        user: users?.[0] || null,
        comment_count: comments?.length || 0,
      };
    }));

    res.json(enriched);
  } catch (e) {
    logError('GET /api/posts/:coachId', e.message, e.stack);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ─────────────────────────────────────────────
// COACH AUTH
// ─────────────────────────────────────────────

app.post('/api/coach/signup', async (req, res) => {
  try {
    const { name, email, password, sport, niche, experience, ...rest } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });

    const existing = await db('coaches', 'GET', null, `?email=eq.${encodeURIComponent(email)}&select=id`);
    if (existing && existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const coaches = await db('coaches', 'POST', {
      name, email, password_hash,
      sport: sport || niche || null,
      is_active: false,
      is_approved: false,
      ...rest,
    });

    const coach = Array.isArray(coaches) ? coaches[0] : coaches;
    // Generate SEO slug
    await db('coaches', 'PATCH', { slug: generateSlug(name, coach.id) }, `?id=eq.${coach.id}`);
    const token = crypto.randomBytes(32).toString('hex');
    await db('sessions', 'POST', {
      coach_id: coach.id,
      token,
      type: 'coach',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const { password_hash: _, ...safeCoach } = coach;
    res.json({ token, coach: safeCoach });
  } catch (e) {
    logError('POST /api/coach/signup', e.message, e.stack);
    res.status(500).json({ error: 'Signup failed: ' + e.message });
  }
});

app.post('/api/coach/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const coaches = await db('coaches', 'GET', null, `?email=eq.${encodeURIComponent(email)}&select=*`);
    if (!coaches || coaches.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const coach = coaches[0];
    const valid = await bcrypt.compare(password, coach.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = crypto.randomBytes(32).toString('hex');
    await db('sessions', 'POST', {
      coach_id: coach.id,
      token,
      type: 'coach',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const { password_hash: _, ...safeCoach } = coach;
    res.json({ token, coach: safeCoach });
  } catch (e) {
    logError('POST /api/coach/login', e.message, e.stack);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─────────────────────────────────────────────
// COACH — AUTHENTICATED ROUTES
// ─────────────────────────────────────────────

app.post('/api/upload-media', requireAuth, async (req, res) => {
  try {
    const { fileBase64, fileName, fileType } = req.body;
    const buffer = Buffer.from(fileBase64.split(',')[1], 'base64');
    const uniqueName = `${Date.now()}_${fileName}`;
    const uploadRes = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/coach-media/${uniqueName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY}`, 'apikey': process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY, 'Content-Type': fileType, 'x-upsert': 'true' },
      body: buffer,
    });
    if (!uploadRes.ok) return res.status(500).json({ error: await uploadRes.text() });
    res.json({ url: `${process.env.SUPABASE_URL}/storage/v1/object/public/coach-media/${uniqueName}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/upload-content', requireAuth, requireCoach, async (req, res) => {
  try {
    const { fileBase64, fileName, fileType } = req.body;
    const buffer = Buffer.from(fileBase64.split(',')[1], 'base64');
    const uniqueName = `${Date.now()}_${fileName}`;
    const uploadRes = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/coach-media/${uniqueName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY}`, 'apikey': process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY, 'Content-Type': fileType, 'x-upsert': 'true' },
      body: buffer,
    });
    if (!uploadRes.ok) return res.status(500).json({ error: await uploadRes.text() });
    res.json({ url: `${process.env.SUPABASE_URL}/storage/v1/object/public/coach-media/${uniqueName}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/coach/me', requireAuth, requireCoach, async (req, res) => {
  try {
    console.log('SESSION:', JSON.stringify(req.session));
    const coaches = await db('coaches', 'GET', null, `?id=eq.${req.session.coach_id}&select=*`);
    if (!coaches || coaches.length === 0) return res.status(404).json({ error: 'Coach not found' });
    const { password_hash: _, ...safeCoach } = coaches[0];
    res.json(safeCoach);
  } catch (e) {
    console.error('COACH ME ERROR:', e.message, e.stack);
    res.status(500).json({ error: 'Failed to fetch profile: ' + e.message });
  }
});

app.patch('/api/coach/profile', requireAuth, requireCoach, async (req, res) => {
  try {
    const { password_hash: _, email: __, ...updates } = req.body;
    // Fetch existing coach to merge before scoring
    const existing = await db('coaches', 'GET', null, `?id=eq.${req.session.coach_id}&select=*`);
    const merged = { ...(existing?.[0] || {}), ...updates };
    // Calculate SEO score
    let seoScore = 0;
    if (merged.name) seoScore += 10;
    if (merged.photo) seoScore += 15;
    if (merged.banner) seoScore += 10;
    if (merged.bio && merged.bio.length > 100) seoScore += 20;
    if (merged.tagline) seoScore += 10;
    if (merged.sport) seoScore += 10;
    if (merged.location) seoScore += 5;
    if (merged.years_experience) seoScore += 5;
    if (merged.credentials) seoScore += 5;
    if (merged.coaching_philosophy) seoScore += 5;
    if (merged.testimonials && merged.testimonials.length > 0) seoScore += 5;
    updates.seo_score = seoScore;
    const result = await db('coaches', 'PATCH', updates, `?id=eq.${req.session.coach_id}`);
    const coach = Array.isArray(result) ? result[0] : result;
    const { password_hash: _h, ...safeCoach } = (coach || {});
    res.json(safeCoach);
  } catch (e) {
    logError('PATCH /api/coach/profile', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/coach/clients', requireAuth, requireCoach, async (req, res) => {
  try {
    const subs = await db('subscriptions', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&status=eq.active&select=*`
    );
    if (!subs || subs.length === 0) return res.json([]);

    const enriched = await Promise.all(subs.map(async (sub) => {
      const users = await db('users', 'GET', null, `?id=eq.${sub.user_id}&select=id,name,email,photo,created_at`);
      return { ...sub, user: users?.[0] || null };
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.get('/api/coach/client/:userId', requireAuth, requireCoach, async (req, res) => {
  try {
    const users = await db('users', 'GET', null, `?id=eq.${req.params.userId}&select=*`);
    if (!users || users.length === 0) return res.status(404).json({ error: 'User not found' });
    const { password_hash: _, ...user } = users[0];

    const checkins = await db('checkins', 'GET', null,
      `?user_id=eq.${req.params.userId}&coach_id=eq.${req.session.coach_id}&order=created_at.desc&limit=20&select=*`
    );
    const sub = await db('subscriptions', 'GET', null,
      `?user_id=eq.${req.params.userId}&coach_id=eq.${req.session.coach_id}&select=*`
    );

    res.json({ user, checkins: checkins || [], subscription: sub?.[0] || null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

app.get('/api/coach/checkins', requireAuth, requireCoach, async (req, res) => {
  try {
    const checkins = await db('checkins', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&order=created_at.desc&select=*`
    );
    if (!checkins) return res.json([]);

    const enriched = await Promise.all(checkins.map(async (c) => {
      const users = await db('users', 'GET', null, `?id=eq.${c.user_id}&select=name,photo`);
      return { ...c, user: users?.[0] || null };
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch checkins' });
  }
});

app.patch('/api/coach/checkin/:id', requireAuth, requireCoach, async (req, res) => {
  try {
    const result = await db('checkins', 'PATCH',
      { coach_reply: req.body.coach_reply, replied_at: new Date().toISOString() },
      `?id=eq.${req.params.coachPublicId}&coach_id=eq.${req.session.coach_id}`
    );
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update checkin' });
  }
});

app.get('/api/coach/direct-messages', requireAuth, requireCoach, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const dms = await db('direct_messages', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&order=created_at.desc&select=*`
    );
    if (!dms) return res.json([]);

    // Group by user_id
    const grouped = {};
    for (const dm of dms) {
      if (!grouped[dm.user_id]) {
        const users = await db('users', 'GET', null, `?id=eq.${dm.user_id}&select=name,photo`);
        grouped[dm.user_id] = {
          user_id: dm.user_id,
          user: users?.[0] || null,
          messages: [],
          last_message: dm,
          unread_count: 0,
        };
      }
      grouped[dm.user_id].messages.push(dm);
      if (!dm.is_read && dm.sender_type === 'user') grouped[dm.user_id].unread_count++;
    }
    res.json(Object.values(grouped));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/coach/direct-message', requireAuth, requireCoach, async (req, res) => {
  try {
    const { userId, content, imageUrl, audioUrl } = req.body;
    if (!userId || (!content && !imageUrl && !audioUrl)) return res.status(400).json({ error: 'userId and content/imageUrl/audioUrl required' });

    const result = await db('direct_messages', 'POST', {
      user_id: userId,
      coach_id: req.session.coach_id,
      sender_type: 'coach',
      content: content || null,
      image_url: imageUrl || null,
      audio_url: audioUrl || null,
      is_read: false,
    });
    const dmCoach = await db('coaches', 'GET', null, `?id=eq.${req.session.coach_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);
    await createNotification(
      userId,
      'user',
      'coach_dm',
      dmCoach?.name || 'Your coach',
      content.slice(0, 80),
      dmCoach?.name || null,
      dmCoach?.photo || null
    );
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/coach/ai-conversations', requireAuth, requireCoach, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const messages = await db('messages', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&order=created_at.desc&select=*`
    );
    if (!messages) return res.json([]);

    // Group by user_id
    const grouped = {};
    for (const msg of messages) {
      if (!grouped[msg.user_id]) {
        const users = await db('users', 'GET', null, `?id=eq.${msg.user_id}&select=name,photo`);
        grouped[msg.user_id] = {
          user_id: msg.user_id,
          user: users?.[0] || null,
          messages: [],
          flagged_count: 0,
          last_message: msg,
        };
      }
      grouped[msg.user_id].messages.push(msg);
      if (msg.flagged) grouped[msg.user_id].flagged_count++;
    }
    res.json(Object.values(grouped));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch AI conversations' });
  }
});

app.patch('/api/coach/ai-conversation/:messageId/flag', requireAuth, requireCoach, async (req, res) => {
  try {
    const result = await db('messages', 'PATCH',
      { flagged: true },
      `?id=eq.${req.params.messageId}&coach_id=eq.${req.session.coach_id}`
    );
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to flag message' });
  }
});

app.get('/api/coach/content', requireAuth, requireCoach, async (req, res) => {
  try {
    const content = await db('content', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&order=week_number.asc,created_at.asc&select=*`
    );
    res.json(content || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

app.post('/api/coach/content', requireAuth, requireCoach, async (req, res) => {
  try {
    const result = await db('content', 'POST', {
      ...req.body,
      coach_id: req.session.coach_id,
    });
    const content = Array.isArray(result) ? result[0] : result;

    // Notify all active subscribers
    const subs = await db('subscriptions', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&status=eq.active&select=user_id`
    ).catch(() => []);
    const coach = await db('coaches', 'GET', null, `?id=eq.${req.session.coach_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);
    for (const sub of subs) {
      await createNotification(
        sub.user_id,
        'user',
        'new_content',
        coach?.name || 'Your coach',
        `New content: ${req.body.title || 'Untitled'}`,
        coach?.name || null,
        coach?.photo || null
      );
    }

    res.json(content);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create content' });
  }
});

app.patch('/api/coach/content/:id', requireAuth, requireCoach, async (req, res) => {
  try {
    const { _uploading, ...cleanBody } = req.body;
    const result = await db('content', 'PATCH', cleanBody,
      `?id=eq.${req.params.id}&coach_id=eq.${req.session.coach_id}`
    );
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update content' });
  }
});

app.delete('/api/coach/content/:id', requireAuth, requireCoach, async (req, res) => {
  try {
    await db('content', 'DELETE', null,
      `?id=eq.${req.params.coachPublicId}&coach_id=eq.${req.session.coach_id}`
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

app.get('/api/coach/programs', requireAuth, requireCoach, async (req, res) => {
  try {
    const programs = await db('programs', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&order=week_number.asc&select=*`
    );
    res.json(programs || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

app.post('/api/coach/program', requireAuth, requireCoach, async (req, res) => {
  try {
    const { userId, weekNumber, dayName, sessionTitle, exercises } = req.body;

    // Check if exists → update, else create
    const existing = await db('programs', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&user_id=eq.${userId}&week_number=eq.${weekNumber}&day_name=eq.${encodeURIComponent(dayName)}&select=id`
    );

    let result;
    if (existing && existing.length > 0) {
      result = await db('programs', 'PATCH',
        { session_title: sessionTitle, exercises: exercises || [] },
        `?id=eq.${existing[0].id}`
      );
    } else {
      result = await db('programs', 'POST', {
        coach_id: req.session.coach_id,
        user_id: userId,
        week_number: weekNumber,
        day_name: dayName,
        session_title: sessionTitle,
        exercises: exercises || [],
      });
    }
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    logError('POST /api/coach/program', e.message, e.stack);
    res.status(500).json({ error: 'Failed to save program' });
  }
});

app.patch('/api/coach/ai-training', requireAuth, requireCoach, async (req, res) => {
  try {
    const { ai_who, ai_method, ai_tone, ai_examples, ai_limits, ai_quick_updates, ai_docs, ai_workout_strategy, ai_nutrition_strategy } = req.body;
    const result = await db('coaches', 'PATCH',
      { ai_who, ai_method, ai_tone, ai_examples, ai_limits, ai_quick_updates, ai_docs, ai_workout_strategy, ai_nutrition_strategy },
      `?id=eq.${req.session.coach_id}`
    );
    const coach = Array.isArray(result) ? result[0] : result;
    const { password_hash: _, ...safe } = (coach || {});
    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: 'Failed to save AI training' });
  }
});

app.get('/api/coach/stats', requireAuth, requireCoach, async (req, res) => {
  try {
    const subs = await db('subscriptions', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&status=eq.active&select=plan_price`
    );
    const msgs = await db('messages', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&created_at=gte.${new Date(Date.now() - 7 * 86400000).toISOString()}&select=id`
    );
    const checkins = await db('checkins', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&created_at=gte.${new Date(Date.now() - 7 * 86400000).toISOString()}&select=id`
    );

    const revenue = (subs || []).reduce((sum, s) => sum + (parseFloat(s.plan_price) || 0), 0);

    res.json({
      subscriber_count: (subs || []).length,
      revenue_this_month: parseFloat((revenue * 0.9).toFixed(2)), // coach's 90%
      ai_conversations_this_week: (msgs || []).length,
      checkins_this_week: (checkins || []).length,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────
// USER AUTH
// ─────────────────────────────────────────────

app.post('/api/user/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });

    const existing = await db('users', 'GET', null, `?email=eq.${encodeURIComponent(email)}&select=id`);
    if (existing && existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const users = await db('users', 'POST', { name, email, password_hash });
    const user = Array.isArray(users) ? users[0] : users;

    const token = crypto.randomBytes(32).toString('hex');
    await db('sessions', 'POST', {
      user_id: user.id,
      token,
      type: 'user',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (e) {
    logError('POST /api/user/signup', e.message, e.stack);
    res.status(500).json({ error: 'Signup failed: ' + e.message });
  }
});

app.post('/api/user/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await db('users', 'GET', null, `?email=eq.${encodeURIComponent(email)}&select=*`);
    if (!users || users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = crypto.randomBytes(32).toString('hex');
    await db('sessions', 'POST', {
      user_id: user.id,
      token,
      type: 'user',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─────────────────────────────────────────────
// USER — AUTHENTICATED ROUTES
// ─────────────────────────────────────────────

app.get('/api/user/me', requireAuth, requireUser, async (req, res) => {
  try {
    const users = await db('users', 'GET', null, `?id=eq.${req.session.user_id}&select=*`);
    if (!users || users.length === 0) return res.status(404).json({ error: 'User not found' });
    const { password_hash: _, ...safeUser } = users[0];
    res.json(safeUser);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.patch('/api/user/profile', requireAuth, requireUser, async (req, res) => {
  try {
    const { password_hash: _, email: __, ...updates } = req.body;
    const result = await db('users', 'PATCH', updates, `?id=eq.${req.session.user_id}`);
    const user = Array.isArray(result) ? result[0] : result;
    const { password_hash: _h, ...safe } = (user || {});
    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user/subscriptions', requireAuth, requireUser, async (req, res) => {
  try {
    const subs = await db('subscriptions', 'GET', null,
      `?user_id=eq.${req.session.user_id}&status=eq.active&select=*`
    );
    if (!subs) return res.json([]);

    const enriched = await Promise.all(subs.map(async (sub) => {
      const coaches = await db('coaches', 'GET', null,
        `?id=eq.${sub.coach_id}&select=id,name,photo,sport,category_id`
      );
      return { ...sub, coach: coaches?.[0] || null };
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.post('/api/user/subscribe', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId, planMonths, planPrice, intake } = req.body;
    if (!coachId || !planMonths || !planPrice) {
      return res.status(400).json({ error: 'coachId, planMonths, planPrice required' });
    }

    // Check for existing active subscription
    const existing = await db('subscriptions', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&status=eq.active&select=id`
    );
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Already subscribed to this coach' });
    }

    const planStart = new Date();
    const planEnd = new Date(planStart);
    planEnd.setMonth(planEnd.getMonth() + parseInt(planMonths));

    // Create subscription with pending_payment status
    const subs = await db('subscriptions', 'POST', {
      user_id: req.session.user_id,
      coach_id: coachId,
      plan_months: parseInt(planMonths),
      plan_price: parseFloat(planPrice),
      plan_start: planStart.toISOString(),
      plan_end: planEnd.toISOString(),
      status: 'pending_payment',
      intake: intake || {},
    });
    const sub = Array.isArray(subs) ? subs[0] : subs;

    // Run payment logic
    const { checkoutUrl, skipPayment } = await createCheckout({
      userId: req.session.user_id,
      coachId,
      planMonths,
      planPrice,
      subscriptionId: sub.id,
    });

    if (skipPayment) {
      await db('subscriptions', 'PATCH', { status: 'active' }, `?id=eq.${sub.id}`);
      sub.status = 'active';
      // Keep subscriber_count in sync
      const activeSubs = await db('subscriptions', 'GET', null, `?coach_id=eq.${coachId}&status=eq.active&select=id`);
      await db('coaches', 'PATCH', { subscriber_count: activeSubs.length }, `?id=eq.${coachId}`);
      await createNotification(
        coachId,
        'coach',
        'new_subscriber',
        'New subscriber!',
        'A new client just joined your program.'
      );
    }

    res.json({ subscription: sub, checkoutUrl, skipPayment });
  } catch (e) {
    logError('POST /api/user/subscribe', e.message, e.stack);
    res.status(500).json({ error: 'Subscribe failed: ' + e.message });
  }
});

app.delete('/api/user/subscription/:id', requireAuth, requireUser, async (req, res) => {
  try {
    await db('subscriptions', 'PATCH',
      { status: 'cancelled' },
      `?id=eq.${req.params.coachPublicId}&user_id=eq.${req.session.user_id}`
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ─────────────────────────────────────────────
// AI CHAT
// ─────────────────────────────────────────────

app.post('/api/chat', requireAuth, requireUser, async (req, res) => {
  try {
    const { message, coachId } = req.body;
    if (!message || !coachId) return res.status(400).json({ error: 'message and coachId required' });

    // Verify active subscription
    const subs = await db('subscriptions', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&status=eq.active&select=id,intake`
    );
    if (!subs || subs.length === 0) return res.status(403).json({ error: 'No active subscription for this coach' });

    // Save user message
    await db('messages', 'POST', {
      user_id: req.session.user_id,
      coach_id: coachId,
      role: 'user',
      content: message,
    });

    // Fetch coach and user for context
    const coaches = await db('coaches', 'GET', null, `?id=eq.${coachId}&select=*`);
    const users = await db('users', 'GET', null, `?id=eq.${req.session.user_id}&select=*`);
    if (!coaches || coaches.length === 0) return res.status(404).json({ error: 'Coach not found' });

    const coach = coaches[0];
    const user = { ...users[0], ...(subs[0].intake || {}) };

    // Go through the queue
    const reply = await enqueue(async () => {
      // Step 1: Modal 5 — should the real coach answer this?
      const needsCoach = await detectAskCoach(message);
      if (needsCoach === 'YES') {
        const flagReply = `${coach.name} should answer this personally — it needs their direct attention. Tap "Message Coach" to send it directly to them.`;
        // Save flagged AI response
        await db('messages', 'POST', {
          user_id: req.session.user_id,
          coach_id: coachId,
          role: 'assistant',
          content: flagReply,
          modal_type: 'flag',
          flagged: true,
        });
        return { reply: flagReply, flagged: true };
      }

      // Step 2: Classify topic
      const topic = await classifyTopic(message);

      // Step 3: Get context for modals
      const today = new Date().toISOString().slice(0, 10);
      const todayMeals = await db('meal_plans', 'GET', null,
        `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&date=eq.${today}&select=*`
      ).then(r => r?.[0] || null).catch(() => null);

      const programs = await db('programs', 'GET', null,
        `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&select=*`
      ).then(r => r || []).catch(() => []);

      const checkins = await db('checkins', 'GET', null,
        `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&order=created_at.desc&limit=7&select=created_at`
      ).then(r => r || []).catch(() => []);

      const foodLogs = await db('food_logs', 'GET', null,
        `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&order=created_at.desc&limit=5&select=meal_name,calories,protein,carbs,fat,health_score,created_at`
      ).then(r => r || []).catch(() => []);

      const todayMealPlan = todayMeals;

      const workoutLogs = await db('workout_logs', 'GET', null,
        `?user_id=eq.${req.session.user_id}&select=program_id,exercise_index`
      ).then(r => r || []).catch(() => []);

      const userTimezone = req.body.timezone || 'UTC';
      const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: userTimezone });
      const todayProgram = programs.find(p => p.day_name === todayDayName) || null;

      // Step 4: Route to the right modal
      let aiReply;
      if (topic === 'workout') {
        aiReply = await workoutModal({ user, coach, message, currentProgram: programs, workoutLogs, todayProgram, todayDayName });
      } else if (topic === 'nutrition') {
        aiReply = await nutritionModal({ user, coach, message, todayMeals: todayMealPlan, foodLogs });
      } else if (topic === 'motivation') {
        const weekStreak = checkins.filter(c => {
          const d = new Date(c.created_at);
          return (Date.now() - d.getTime()) < 7 * 86400000;
        }).length;
        aiReply = await motivationModal({ user, coach, message, weekStreak });
      } else if (topic === 'schedule') {
        aiReply = await scheduleModal({ user, coach, message, weekProgram: programs });
      } else {
        aiReply = await generalModal({ user, coach, message, foodLogs, todayMealPlan });
      }

      // Step 5: Save AI response
      await db('messages', 'POST', {
        user_id: req.session.user_id,
        coach_id: coachId,
        role: 'assistant',
        content: aiReply,
        modal_type: topic,
        flagged: false,
      });

      return { reply: aiReply, flagged: false };
    });

    res.json(reply);
  } catch (e) {
    logError('POST /api/chat', e.message, e.stack);
    if (e.message.includes('Queue timeout')) {
      return res.status(503).json({ error: 'AI is busy — please try again in a moment', retry: true });
    }
    res.status(500).json({ error: 'Chat failed: ' + e.message });
  }
});

app.get('/api/chat/history', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.query;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    const msgs = await db('messages', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&order=created_at.asc&limit=50&select=*`
    );
    res.json(msgs || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// ─────────────────────────────────────────────
// DIRECT MESSAGES (human coach ↔ user)
// ─────────────────────────────────────────────

app.get('/api/dm', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.query;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    const dms = await db('direct_messages', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&order=created_at.asc&select=*`
    );
    res.json(dms || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/dm', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId, content, imageUrl, audioUrl } = req.body;
    if (!coachId || (!content && !imageUrl && !audioUrl)) return res.status(400).json({ error: 'coachId and content/imageUrl/audioUrl required' });

    const result = await db('direct_messages', 'POST', {
      user_id: req.session.user_id,
      coach_id: coachId,
      sender_type: 'user',
      content: content || null,
      image_url: imageUrl || null,
      audio_url: audioUrl || null,
      is_read: false,
    });
    const dmUser = await db('users', 'GET', null, `?id=eq.${req.session.user_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);
    await createNotification(
      coachId,
      'coach',
      'new_dm',
      dmUser?.name || 'A client',
      content.slice(0, 80),
      dmUser?.name || null,
      dmUser?.photo || null
    );
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.patch('/api/dm/read', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.query;
    await db('direct_messages', 'PATCH',
      { is_read: true },
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&sender_type=eq.coach`
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ─────────────────────────────────────────────
// MEALS
// ─────────────────────────────────────────────

app.get('/api/meals/today', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.query;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    const today = new Date().toISOString().slice(0, 10);
    const existing = await db('meal_plans', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&date=eq.${today}&select=*`
    );

    if (existing && existing.length > 0) return res.json(existing[0]);

    // Generate via AI Modal 6
    const coaches = await db('coaches', 'GET', null, `?id=eq.${coachId}&select=*`);
    const users = await db('users', 'GET', null, `?id=eq.${req.session.user_id}&select=*`);
    const subs = await db('subscriptions', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&status=eq.active&select=intake`
    );

    if (!coaches || coaches.length === 0) return res.status(404).json({ error: 'Coach not found' });

    const coach = coaches[0];
    const user = { ...users[0], ...(subs?.[0]?.intake || {}) };

    const mealData = await enqueue(() => generateMealPlan({ user, coach }));

    const saved = await db('meal_plans', 'POST', {
      user_id: req.session.user_id,
      coach_id: coachId,
      date: today,
      ...mealData,
    });

    res.json(Array.isArray(saved) ? saved[0] : saved);
  } catch (e) {
    logError('GET /api/meals/today', e.message, e.stack);
    res.status(500).json({ error: 'Failed to get meal plan' });
  }
});
app.patch('/api/meals/status', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId, meal, status } = req.body; // meal: 'breakfast'|'lunch'|'snack'|'dinner', status: 'followed'|'skipped'
    const today = new Date().toISOString().slice(0, 10);
    await db('meal_plans', 'PATCH', { [`${meal}_status`]: status },
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&date=eq.${today}`
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Recipe detail
app.post('/api/meals/recipe', requireAuth, requireUser, async (req, res) => {
  try {
    const { mealName, coachId } = req.body;
    if (!mealName || !coachId) return res.status(400).json({ error: 'mealName and coachId required' });

    const coaches = await db('coaches', 'GET', null, `?id=eq.${coachId}&select=*`);
    const users = await db('users', 'GET', null, `?id=eq.${req.session.user_id}&select=*`);
    const subs = await db('subscriptions', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&status=eq.active&select=intake`
    );

    const coach = coaches[0];
    const user = { ...users[0], ...(subs?.[0]?.intake || {}) };

    const recipe = await enqueue(() => generateRecipe({ mealName, user, coach }));
    res.json(recipe);
  } catch (e) {
    logError('POST /api/meals/recipe', e.message, e.stack);
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

// ─────────────────────────────────────────────
// CHECK-INS
// ─────────────────────────────────────────────

app.post('/api/checkin', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId, weight, energy, sleep, motivation, nutritionFollowed, notes, photo } = req.body;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    const result = await db('checkins', 'POST', {
      user_id: req.session.user_id,
      coach_id: coachId,
      weight, energy, sleep, motivation,
      nutrition_followed: nutritionFollowed,
      notes, photo,
    });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    logError('POST /api/checkin', e.message, e.stack);
    res.status(500).json({ error: 'Failed to submit checkin' });
  }
});

app.get('/api/checkins', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.query;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    const checkins = await db('checkins', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&order=created_at.desc&limit=10&select=*`
    );
    res.json(checkins || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch checkins' });
  }
});

// ─────────────────────────────────────────────
// COMMUNITY POSTS
// ─────────────────────────────────────────────

app.post('/api/posts', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId, content, photo, audioUrl } = req.body;
    if (!coachId || (!content && !photo && !audioUrl)) return res.status(400).json({ error: 'coachId and content/photo/audioUrl required' });

    const result = await db('posts', 'POST', {
      user_id: req.session.user_id,
      coach_id: coachId,
      content: content || null,
      photo: photo || null,
      audio_url: audioUrl || null,
      likes: 0,
    });
    const subs = await db('subscriptions', 'GET', null,
      `?coach_id=eq.${coachId}&status=eq.active&select=user_id`
    ).catch(() => []);
    for (const sub of subs) {
      if (sub.user_id !== req.session.user_id) {
        const postUser = await db('users', 'GET', null, `?id=eq.${req.session.user_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);
        await createNotification(sub.user_id, 'user', 'community_post', postUser?.name || 'Community', content.slice(0, 80), postUser?.name || null, postUser?.photo || null);
      }
    }
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.patch('/api/posts/:id/like', requireAuth, async (req, res) => {
  try {
    // Optimistic increment
    const posts = await db('posts', 'GET', null, `?id=eq.${req.params.coachPublicId}&select=likes`);
    if (!posts || posts.length === 0) return res.status(404).json({ error: 'Post not found' });
    const newLikes = (posts[0].likes || 0) + 1;
    const result = await db('posts', 'PATCH', { likes: newLikes }, `?id=eq.${req.params.coachPublicId}`);
    res.json({ likes: newLikes });
  } catch (e) {
    res.status(500).json({ error: 'Failed to like post' });
  }
});

app.get('/api/comments/:postId', requireAuth, async (req, res) => {
  try {
    const comments = await db('comments', 'GET', null,
      `?post_id=eq.${req.params.postId}&order=created_at.asc&select=*`
    );
    if (!comments) return res.json([]);

    const enriched = await Promise.all(comments.map(async (c) => {
      if (c.sender_type === 'coach') {
        const coaches = await db('coaches', 'GET', null, `?id=eq.${c.coach_id}&select=name,photo`);
        return { ...c, user: { ...(coaches?.[0] || {}), is_coach: true } };
      }
      const users = await db('users', 'GET', null, `?id=eq.${c.user_id}&select=name,photo`);
      return { ...c, user: users?.[0] || null };
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/comments', requireAuth, requireUser, async (req, res) => {
  try {
    const { postId, content } = req.body;
    if (!postId || !content) return res.status(400).json({ error: 'postId and content required' });

    const result = await db('comments', 'POST', {
      post_id: postId,
      user_id: req.session.user_id,
      content,
    });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// POST /api/coach/post — coach posts to their own community
app.post('/api/coach/post', requireAuth, requireCoach, async (req, res) => {
  try {
    const { content, photo, audioUrl } = req.body;
    if (!content && !photo && !audioUrl) return res.status(400).json({ error: 'content or media required' });

    const result = await db('posts', 'POST', {
      coach_id: req.session.coach_id,
      sender_type: 'coach',
      content: content || null,
      photo: photo || null,
      audio_url: audioUrl || null,
      likes: 0,
    });
    const post = Array.isArray(result) ? result[0] : result;

    const subs = await db('subscriptions', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&status=eq.active&select=user_id`
    ).catch(() => []);
    const coach = await db('coaches', 'GET', null, `?id=eq.${req.session.coach_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);
    for (const sub of subs) {
      await createNotification(sub.user_id, 'user', 'community_post', coach?.name || 'Your coach', (content || 'New post').slice(0, 80), coach?.name || null, coach?.photo || null);
    }

    res.json(post);
  } catch (e) {
    logError('POST /api/coach/post', e.message, e.stack);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/coach/posts — coach's own community feed
app.get('/api/coach/posts', requireAuth, requireCoach, async (req, res) => {
  try {
    const posts = await db('posts', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&order=created_at.desc&limit=50&select=*`
    );
    if (!posts) return res.json([]);

    const enriched = await Promise.all(posts.map(async (post) => {
      const comments = await db('comments', 'GET', null, `?post_id=eq.${post.id}&select=id`);
      let sender;
      if (post.sender_type === 'coach') {
        const c = await db('coaches', 'GET', null, `?id=eq.${post.coach_id}&select=name,photo`);
        sender = { ...(c?.[0] || {}), is_coach: true };
      } else {
        const u = await db('users', 'GET', null, `?id=eq.${post.user_id}&select=name,photo`);
        sender = u?.[0] || null;
      }
      return { ...post, user: sender, comment_count: comments?.length || 0 };
    }));

    res.json(enriched);
  } catch (e) {
    logError('GET /api/coach/posts', e.message, e.stack);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// PATCH /api/coach/posts/:id/like
app.patch('/api/coach/posts/:id/like', requireAuth, requireCoach, async (req, res) => {
  try {
    const posts = await db('posts', 'GET', null, `?id=eq.${req.params.id}&select=likes`);
    if (!posts || posts.length === 0) return res.status(404).json({ error: 'Post not found' });
    const newLikes = (posts[0].likes || 0) + 1;
    await db('posts', 'PATCH', { likes: newLikes }, `?id=eq.${req.params.id}`);
    res.json({ likes: newLikes });
  } catch (e) {
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// POST /api/coach/comments — coach comments on a post
app.post('/api/coach/comments', requireAuth, requireCoach, async (req, res) => {
  try {
    const { postId, content } = req.body;
    if (!postId || !content) return res.status(400).json({ error: 'postId and content required' });

    const result = await db('comments', 'POST', {
      post_id: postId,
      coach_id: req.session.coach_id,
      sender_type: 'coach',
      content,
    });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// DELETE /api/coach/post/:id — coach moderates (deletes) a post
app.delete('/api/coach/post/:id', requireAuth, requireCoach, async (req, res) => {
  try {
    await db('posts', 'DELETE', null, `?id=eq.${req.params.id}&coach_id=eq.${req.session.coach_id}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ─────────────────────────────────────────────
// CONTENT LIBRARY
// ─────────────────────────────────────────────

app.get('/api/content/:coachId', requireAuth, requireUser, async (req, res) => {
  try {
    const subs = await db('subscriptions', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${req.params.coachId}&status=eq.active&select=plan_start`
    );
    const planStart = subs?.[0]?.plan_start ? new Date(subs[0].plan_start) : new Date();
    const currentWeek = Math.floor((Date.now() - planStart.getTime()) / (7 * 86400000)) + 1;

    const content = await db('content', 'GET', null,
      `?coach_id=eq.${req.params.coachId}&order=week_number.asc&select=*`
    );

    // Mark locked/unlocked based on week
    const enriched = (content || []).map(item => ({
      ...item,
      is_locked: item.week_number > currentWeek,
    }));

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// ─────────────────────────────────────────────
// PROGRAMS
// ─────────────────────────────────────────────

app.get('/api/program', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.query;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });

    const programs = await db('programs', 'GET', null,
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&order=week_number.asc,day_name.asc&select=*`
    );
    res.json(programs || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch program' });
  }
});

// ─────────────────────────────────────────────
// WORKOUT LOGS
// ─────────────────────────────────────────────

app.post('/api/workout-log', requireAuth, requireUser, async (req, res) => {
  try {
    const { programId, exerciseIndex } = req.body;
    if (!programId) return res.status(400).json({ error: 'programId required' });

    // Get coach_id from program
    const prog = await db('programs', 'GET', null, `?id=eq.${programId}&select=coach_id`).catch(() => []);
    const coachId = prog?.[0]?.coach_id || null;
    const result = await db('workout_logs', 'POST', {
      user_id: req.session.user_id,
      coach_id: coachId,
      program_id: programId,
      exercise_index: exerciseIndex,
    });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

app.get('/api/workout-logs', requireAuth, requireUser, async (req, res) => {
  try {
    const logs = await db('workout_logs', 'GET', null,
      `?user_id=eq.${req.session.user_id}&select=*`
    );
    res.json(logs || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────

app.post('/api/logout', requireAuth, async (req, res) => {
  try {
    await db('sessions', 'DELETE', null, `?token=eq.${req.headers.authorization.slice(7)}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ─────────────────────────────────────────────
// PAYMENT WEBHOOK
// ─────────────────────────────────────────────

app.post('/api/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const result = await handleWebhook(req);
    if (result && result.subscriptionId) {
      await db('subscriptions', 'PATCH',
        { status: result.status },
        `?id=eq.${result.subscriptionId}`
      );
      if (result.status === 'active') {
        const sub = await db('subscriptions', 'GET', null, `?id=eq.${result.subscriptionId}&select=coach_id`).catch(() => []);
        if (sub?.[0]?.coach_id) {
          await createNotification(sub[0].coach_id, 'coach', 'new_subscriber', 'New subscriber!', 'A new client joined your program.');
        }
      }
    }
    res.json({ received: true });
  } catch (e) {
    logError('POST /api/webhook', e.message, e.stack);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// ─────────────────────────────────────────────
// ADMIN AUTH
// ─────────────────────────────────────────────

app.post('/api/admin/create', async (req, res) => {
  try {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid admin secret' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });

    const existing = await db('admins', 'GET', null, `?select=id`);
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Admin already exists. Use login.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const admins = await db('admins', 'POST', { name, email, password_hash });
    const admin = Array.isArray(admins) ? admins[0] : admins;

    res.json({ success: true, id: admin.id });
  } catch (e) {
    logError('POST /api/admin/create', e.message, e.stack);
    res.status(500).json({ error: 'Create admin failed: ' + e.message });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admins = await db('admins', 'GET', null, `?email=eq.${encodeURIComponent(email)}&select=*`);
    if (!admins || admins.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const admin = admins[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = crypto.randomBytes(32).toString('hex');
    await db('sessions', 'POST', {
      admin_id: admin.id,
      token,
      type: 'admin',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const { password_hash: _, ...safeAdmin } = admin;
    res.json({ token, admin: safeAdmin });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─────────────────────────────────────────────
// ADMIN — AUTHENTICATED ROUTES
// ─────────────────────────────────────────────

app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const coaches = await db('coaches', 'GET', null, '?is_active=eq.true&is_approved=eq.true&select=id');
    const users = await db('users', 'GET', null, '?select=id');
    const subs = await db('subscriptions', 'GET', null, '?status=eq.active&select=plan_price');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const subsThisMonth = await db('subscriptions', 'GET', null,
      `?status=eq.active&created_at=gte.${monthStart}&select=plan_price`
    );

    const platformRevenue = (subsThisMonth || []).reduce((sum, s) => sum + (parseFloat(s.plan_price) || 0) * 0.1, 0);

    res.json({
      total_coaches: (coaches || []).length,
      total_users: (users || []).length,
      total_active_subscriptions: (subs || []).length,
      platform_revenue_this_month: parseFloat(platformRevenue.toFixed(2)),
    });
  } catch (e) {
    logError('GET /api/admin/stats', e.message, e.stack);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/coaches', requireAuth, requireAdmin, async (req, res) => {
  try {
    const coaches = await db('coaches', 'GET', null, '?select=id,name,email,sport,is_active,is_approved,created_at,photo');

    const enriched = await Promise.all(coaches.map(async (coach) => {
      const subs = await db('subscriptions', 'GET', null,
        `?coach_id=eq.${coach.id}&status=eq.active&select=plan_price`
      );
      const revenue = (subs || []).reduce((sum, s) => sum + (parseFloat(s.plan_price) || 0), 0);
      return {
        ...coach,
        subscriber_count: (subs || []).length,
        revenue: parseFloat((revenue * 0.9).toFixed(2)),
      };
    }));

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});

app.patch('/api/admin/coach/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db('coaches', 'PATCH', { is_approved: true, is_active: true }, `?id=eq.${req.params.coachPublicId}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to approve coach' });
  }
});

app.patch('/api/admin/coach/:id/suspend', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db('coaches', 'PATCH', { is_active: false }, `?id=eq.${req.params.coachPublicId}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to suspend coach' });
  }
});

app.delete('/api/admin/coach/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db('coaches', 'DELETE', null, `?id=eq.${req.params.coachPublicId}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete coach' });
  }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db('users', 'GET', null, '?select=id,name,email,photo,created_at');

    const enriched = await Promise.all(users.map(async (user) => {
      const subs = await db('subscriptions', 'GET', null,
        `?user_id=eq.${user.id}&status=eq.active&select=id`
      );
      return { ...user, subscription_count: (subs || []).length };
    }));

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/subscriptions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const subs = await db('subscriptions', 'GET', null,
      '?order=created_at.desc&select=*'
    );
    if (!subs) return res.json([]);

    const enriched = await Promise.all(subs.map(async (sub) => {
      const users = await db('users', 'GET', null, `?id=eq.${sub.user_id}&select=name,email`);
      const coaches = await db('coaches', 'GET', null, `?id=eq.${sub.coach_id}&select=name`);
      return {
        ...sub,
        user: users?.[0] || null,
        coach: coaches?.[0] || null,
        platform_fee: parseFloat(((sub.plan_price || 0) * 0.1).toFixed(2)),
      };
    }));

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.get('/api/admin/categories', requireAuth, requireAdmin, async (req, res) => {
  try {
    const cats = await db('categories', 'GET', null, '?order=sort_order.asc&select=*');
    res.json(cats || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/admin/category', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db('categories', 'POST', req.body);
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    logError('POST /api/admin/category', e.message, e.stack);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.patch('/api/admin/category/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db('categories', 'PATCH', req.body, `?id=eq.${req.params.coachPublicId}`);
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/admin/category/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db('categories', 'DELETE', null, `?id=eq.${req.params.coachPublicId}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

app.get('/api/admin/revenue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const subs = await db('subscriptions', 'GET', null, '?order=created_at.asc&select=plan_price,created_at,status');
    if (!subs) return res.json([]);

    // Group by month
    const byMonth = {};
    for (const sub of subs) {
      const month = sub.created_at.slice(0, 7); // YYYY-MM
      if (!byMonth[month]) {
        byMonth[month] = { month, subscriptions: 0, gross: 0, platform_fee: 0, net_to_coaches: 0 };
      }
      byMonth[month].subscriptions++;
      byMonth[month].gross += parseFloat(sub.plan_price) || 0;
      byMonth[month].platform_fee += ((parseFloat(sub.plan_price) || 0) * 0.1);
      byMonth[month].net_to_coaches += ((parseFloat(sub.plan_price) || 0) * 0.9);
    }

    res.json(Object.values(byMonth).map(m => ({
      ...m,
      gross: parseFloat(m.gross.toFixed(2)),
      platform_fee: parseFloat(m.platform_fee.toFixed(2)),
      net_to_coaches: parseFloat(m.net_to_coaches.toFixed(2)),
    })));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch revenue' });
  }
});

app.get('/api/admin/activity', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Aggregate recent events from multiple tables
    const recent = new Date(Date.now() - 30 * 86400000).toISOString();

    const [coaches, subs, flags] = await Promise.all([
      db('coaches', 'GET', null, `?created_at=gte.${recent}&order=created_at.desc&limit=20&select=id,name,created_at`),
      db('subscriptions', 'GET', null, `?created_at=gte.${recent}&order=created_at.desc&limit=20&select=id,status,created_at,user_id,coach_id`),
      db('messages', 'GET', null, `?flagged=eq.true&created_at=gte.${recent}&order=created_at.desc&limit=10&select=id,created_at,user_id,coach_id`),
    ]);

    const activity = [
      ...(coaches || []).map(c => ({ type: 'coach_signup', label: `${c.name} signed up as a coach`, time: c.created_at, id: c.id })),
      ...(subs || []).filter(s => s.status === 'active').map(s => ({ type: 'new_subscription', label: `New subscription`, time: s.created_at, id: s.id })),
      ...(subs || []).filter(s => s.status === 'cancelled').map(s => ({ type: 'cancellation', label: `Subscription cancelled`, time: s.created_at, id: s.id })),
      ...(flags || []).map(f => ({ type: 'ai_flag', label: `AI conversation flagged`, time: f.created_at, id: f.id })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 50);

    res.json(activity);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

app.get('/api/admin/system', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Test DB connection
    let dbStatus = 'ok';
    try { await db('settings', 'GET', null, '?limit=1'); } catch { dbStatus = 'error'; }

    // Test Groq connection (just check if key exists)
    const groqStatus = process.env.GROQ_KEY ? 'configured' : 'not_configured';

    const errors = await db('error_logs', 'GET', null, '?order=created_at.desc&limit=20&select=*').catch(() => []);

    res.json({
      server_status: 'ok',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      db_status: dbStatus,
      groq_status: groqStatus,
      queue_length: getQueueLength(),
      recent_errors: errors || [],
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

app.patch('/api/admin/errors/:id/resolve', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db('error_logs', 'PATCH', { resolved: true }, `?id=eq.${req.params.coachPublicId}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

// Admin settings
app.get('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await db('settings', 'GET', null, '?select=*');
    const obj = {};
    (settings || []).forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.patch('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });

    // Upsert
    const existing = await db('settings', 'GET', null, `?key=eq.${encodeURIComponent(key)}&select=key`);
    if (existing && existing.length > 0) {
      await db('settings', 'PATCH', { value, updated_at: new Date().toISOString() }, `?key=eq.${encodeURIComponent(key)}`);
    } else {
      await db('settings', 'POST', { key, value });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────

app.post('/api/program/generate', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.body;
    const coaches = await db('coaches', 'GET', null, `?id=eq.${coachId}&select=*`);
    const users = await db('users', 'GET', null, `?id=eq.${req.session.user_id}&select=*`);
    const subs = await db('subscriptions', 'GET', null, `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&status=eq.active&select=intake`);
    const coach = coaches[0];
    const user = { ...users[0], ...(subs?.[0]?.intake || {}) };
    const quickUpdates = (coach.ai_quick_updates || []).map(u => u.content).join('. ');
    const docs = (coach.ai_docs || []).map(d => d.content).join(' ');
    const prompt = `You are ${coach.name}. Who you are: ${coach.ai_who || ''}. Coaching method: ${coach.ai_method || ''}. Workout strategy: ${coach.ai_workout_strategy || ''}. Limits: ${coach.ai_limits || ''}. Extra instructions: ${quickUpdates}. Reference material: ${docs}. Client goal: ${user.goal || 'lose weight'}.\nReturn ONLY a JSON array, no explanation. Create a 5-day workout plan:\n[{"day_name":"Monday","session_title":"Upper Body","exercises":[{"name":"Push-ups","sets":3,"reps":"12","rest":"45s"},{"name":"Dumbbell Rows","sets":3,"reps":"12","rest":"60s"},{"name":"Shoulder Press","sets":3,"reps":"10","rest":"60s"},{"name":"Plank","sets":3,"reps":"45s","rest":"30s"}]},{"day_name":"Tuesday","session_title":"Cardio","exercises":[{"name":"Jump Rope","sets":3,"reps":"3 min","rest":"60s"},{"name":"High Knees","sets":3,"reps":"30","rest":"45s"},{"name":"Box Jumps","sets":3,"reps":"10","rest":"60s"}]},{"day_name":"Wednesday","session_title":"Rest","exercises":[]},{"day_name":"Thursday","session_title":"Lower Body","exercises":[{"name":"Squats","sets":4,"reps":"12","rest":"60s"},{"name":"Lunges","sets":3,"reps":"10","rest":"45s"},{"name":"Glute Bridges","sets":3,"reps":"15","rest":"45s"}]},{"day_name":"Friday","session_title":"Full Body","exercises":[{"name":"Burpees","sets":3,"reps":"10","rest":"60s"},{"name":"Push-ups","sets":3,"reps":"15","rest":"45s"},{"name":"Squats","sets":3,"reps":"12","rest":"60s"},{"name":"Plank","sets":3,"reps":"45s","rest":"30s"}]}]\nNow make a similar plan for goal: ${user.goal || 'lose weight'}, sport: ${coach.sport || 'fitness'}. ONLY return the JSON array.`;
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 }),
    });
    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content || '[]';
    const days = JSON.parse(text.replace(/```json|```/g, '').trim());
    const saved = await Promise.all(days.map((day) =>
      db('programs', 'POST', {
        coach_id: coachId,
        user_id: req.session.user_id,
        week_number: 1,
        day_name: day.day_name,
        session_title: day.session_title,
        exercises: day.exercises || [],
      }).then(r => Array.isArray(r) ? r[0] : r)
    ));
    res.json(saved);
  } catch (e) {
    logError('POST /api/program/generate', e.message, e.stack);
    res.status(500).json({ error: 'Failed to generate: ' + e.message });
  }
});

app.post('/api/food/analyze', requireAuth, requireUser, async (req, res) => {
  try {
    const { imageBase64, coachId } = req.body;
    const coaches = await db('coaches', 'GET', null, `?id=eq.${coachId}&select=*`);
    const coach = coaches[0];
    const recentLogs = await db('food_logs', 'GET', null, `?user_id=eq.${req.session.user_id}&order=created_at.desc&limit=5`);
    const recentMeals = (recentLogs || []).map(l => `${l.meal_name} (${l.calories}kcal, score ${l.health_score}/10)`).join(', ') || 'none yet';
    const prompt = `You are a precise nutrition analyst with deep food science knowledge. Look carefully at this image and identify exactly what food is shown. Estimate calories and macros based on the actual visible portion size — a small snack should be 150-300 kcal, a full meal 400-800 kcal, a large meal 800-1200 kcal. Do NOT cluster estimates around 420-430. Coach: ${coach?.name || 'Coach'}. Recent meals for context only: ${recentMeals}. Respond ONLY with this exact JSON, no explanation: {"meal_name":"specific food name","calories":0,"protein":0,"carbs":0,"fat":0,"coach_comment":"short comment","health_score":0}`;
    const _unused = `You are a nutrition expert. Analyze this meal photo and estimate its nutritional content. Coach style: ${coach?.ai_tone || 'supportive and direct'}.
Respond ONLY with a JSON object, no markdown:
{"meal_name":"Grilled chicken with rice","calories":520,"protein":42,"carbs":48,"fat":12,"coach_comment":"Good protein choice! Watch the rice portion if you're cutting.","health_score":8}`;
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_KEY}` },
      body: JSON.stringify({ model: 'meta-llama/llama-4-scout-17b-16e-instruct', messages: [{ role: 'user', content: imageBase64 ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }] : [{ type: 'text', text: prompt }] }], max_tokens: 400 }),
    });
    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content || '{}';
    const cleanText = text.replace(/```json|```/g, '').replace(/[\n\r]/g, ' ').trim();
    const jsonMatch = cleanText.match(/\{.*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const analysis = JSON.parse(jsonMatch[0]);
    await db('food_logs', 'POST', {
      user_id: req.session.user_id,
      coach_id: coachId,
      meal_name: analysis.meal_name,
      calories: analysis.calories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fat: analysis.fat,
      image_base64: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null,
      coach_comment: analysis.coach_comment,
      health_score: analysis.health_score,
    });
    res.json(analysis);
  } catch (e) {
    logError('POST /api/food/analyze', e.message, e.stack);
    res.status(500).json({ error: 'Analysis failed: ' + e.message });
  }
});

app.get('/api/food/history', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.query;
    const logs = await db('food_logs', 'GET', null, `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&order=created_at.desc&limit=20`);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/coach/client-nutrition', requireAuth, requireCoach, async (req, res) => {
  try {
    const { userId } = req.query;
    const logs = await db('food_logs', 'GET', null, `?user_id=eq.${userId}&coach_id=eq.${req.session.coach_id}&order=created_at.desc&limit=30`);
    res.json(logs || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/coach/client-meal-plans — AI-generated meal plan history for audit
app.get('/api/coach/client-meal-plans', requireAuth, requireCoach, async (req, res) => {
  try {
    const { userId } = req.query;
    const plans = await db('meal_plans', 'GET', null, `?user_id=eq.${userId}&coach_id=eq.${req.session.coach_id}&order=date.desc&limit=30`);
    res.json(plans || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/coach/client-program', requireAuth, requireCoach, async (req, res) => {
  try {
    const { userId } = req.query;
    const programs = await db('programs', 'GET', null, `?user_id=eq.${userId}&coach_id=eq.${req.session.coach_id}&order=week_number.asc,day_name.asc`);
    res.json(programs || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/review', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId, rating } = req.body;
    if (!coachId || !rating) return res.status(400).json({ error: 'coachId and rating required' });
    const existing = await db('reviews', 'GET', null, `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&select=id`);
    if (existing && existing.length > 0) {
      await db('reviews', 'PATCH', { rating }, `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}`);
    } else {
      await db('reviews', 'POST', { user_id: req.session.user_id, coach_id: coachId, rating });
    }
    const all = await db('reviews', 'GET', null, `?coach_id=eq.${coachId}&select=rating`);
    const avg = (all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1);
    await db('coaches', 'PATCH', { rating: avg }, `?id=eq.${coachId}`);
    res.json({ success: true, avg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/review', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.query;
    const existing = await db('reviews', 'GET', null, `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&select=rating`);
    res.json({ rating: existing?.[0]?.rating || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Weekly cleanup — null out food scan images older than 7 days
const CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000;
async function cleanOldFoodImages() {
  try {
    const cutoff = new Date(Date.now() - CLEANUP_INTERVAL).toISOString();
    await db('food_logs', 'PATCH', { image_base64: null }, `?created_at=lt.${cutoff}&image_base64=not.is.null`);
    console.log('Food scan images cleanup done');
  } catch (e) {
    console.error('Cleanup error:', e.message);
  }
}
setInterval(cleanOldFoodImages, CLEANUP_INTERVAL);
cleanOldFoodImages(); // run once on startup too
// Delete user account — wipe personal data, keep email + behavioral data
app.delete('/api/user/account', requireAuth, requireUser, async (req, res) => {
  try {
    const userId = req.session.user_id;
    await db('messages', 'DELETE', null, `?user_id=eq.${userId}`);
    await db('direct_messages', 'DELETE', null, `?user_id=eq.${userId}`);
    await db('checkins', 'DELETE', null, `?user_id=eq.${userId}`);
    await db('food_logs', 'DELETE', null, `?user_id=eq.${userId}`);
    await db('workout_logs', 'DELETE', null, `?user_id=eq.${userId}`);
    await db('posts', 'DELETE', null, `?user_id=eq.${userId}`);
    await db('comments', 'DELETE', null, `?user_id=eq.${userId}`);
    await db('reviews', 'DELETE', null, `?user_id=eq.${userId}`);
    await db('sessions', 'DELETE', null, `?user_id=eq.${userId}`);
    await db('users', 'PATCH', {
      name: null,
      email: `deleted_${userId}@anon.com`,
      password_hash: null,
      photo: null,
      deleted_at: new Date().toISOString(),
    }, `?id=eq.${userId}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete coach account — wipe personal data, keep sport/niche/pricing data
app.delete('/api/coach/account', requireAuth, requireCoach, async (req, res) => {
  try {
    const coachId = req.session.coach_id;
    await db('messages', 'DELETE', null, `?coach_id=eq.${coachId}`);
    await db('direct_messages', 'DELETE', null, `?coach_id=eq.${coachId}`);
    await db('content', 'DELETE', null, `?coach_id=eq.${coachId}`);
    await db('programs', 'DELETE', null, `?coach_id=eq.${coachId}`);
    await db('sessions', 'DELETE', null, `?coach_id=eq.${coachId}`);
    await db('coaches', 'PATCH', {
      name: null,
      email: `deleted_${coachId}@anon.com`,
      password_hash: null,
      photo: null,
      banner: null,
      deleted_at: new Date().toISOString(),
      is_active: false,
    }, `?id=eq.${coachId}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// GET /api/notifications
app.get('/api/notifications', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const recipientId = req.session.coach_id || req.session.user_id;
    const recipientType = req.session.type === 'coach' ? 'coach' : 'user';
    const notifs = await db('notifications', 'GET', null,
      `?recipient_id=eq.${recipientId}&recipient_type=eq.${recipientType}&order=created_at.desc&limit=20&select=*`
    );
    res.json(notifs || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/read-all
app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const recipientId = req.session.coach_id || req.session.user_id;
    const recipientType = req.session.type === 'coach' ? 'coach' : 'user';
    await db('notifications', 'PATCH', { is_read: true },
      `?recipient_id=eq.${recipientId}&recipient_type=eq.${recipientType}&is_read=eq.false`
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// PATCH /api/notifications/:id/read
app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await db('notifications', 'PATCH', { is_read: true }, `?id=eq.${req.params.id}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});
// PATCH /api/dm/read-coach — mark coach-side DMs as read
app.patch('/api/dm/read-coach', requireAuth, requireCoach, async (req, res) => {
  try {
    const { userId } = req.query;
    await db('direct_messages', 'PATCH',
      { is_read: true },
      `?coach_id=eq.${req.session.coach_id}&user_id=eq.${userId}&sender_type=eq.user`
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});
// GET /api/coaches/ranked — sorted by score for homepage
app.get('/api/coaches/ranked', async (req, res) => {
  try {
    console.log('Ranked endpoint hit');
    let query = '?is_active=eq.true&is_approved=eq.true&select=id,name,slug,photo,banner,sport,tagline,plan_price,years_experience,location,rating,seo_score,subscriber_count';
    const coaches = await db('coaches', 'GET', null, query);
    const enriched = (coaches || []).map(coach => {
      const subCount = coach.subscriber_count || 0;
      const rating = parseFloat(coach.rating) || 0;
      const seoScore = coach.seo_score || 0;
      const score = subCount * 3 + rating * 20 + seoScore;
      return { ...coach, _score: score };
    });
    enriched.sort((a, b) => b._score - a._score);
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch ranked coaches' });
  }
});

// GET /sitemap.xml — for Google indexing
app.get('/sitemap.xml', async (req, res) => {
  try {
    const coaches = await db('coaches', 'GET', null, '?is_active=eq.true&is_approved=eq.true&select=slug,id,updated_at');
    const base = process.env.FRONTEND_URL || 'https://coachly-two.vercel.app';
    const urls = (coaches || []).map(c => `
  <url>
    <loc>${base}/coach/${c.slug || c.id}</loc>
    <lastmod>${(c.updated_at || new Date().toISOString()).slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>${urls}
</urlset>`);
  } catch (e) {
    res.status(500).send('Sitemap error');
  }
});
// GET /robots.txt
app.get('/robots.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${process.env.FRONTEND_URL || 'https://coachly-two.vercel.app'}/sitemap.xml`);
});
// ─────────────────────────────────────────────
// COACH MEETINGS (calendar/sessions)
// ─────────────────────────────────────────────

// GET /api/coach/meetings — all upcoming + past meetings for the coach
app.get('/api/coach/meetings', requireAuth, requireCoach, async (req, res) => {
  try {
    const meetings = await db('coach_meetings', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&order=scheduled_at.asc&select=*`
    );
    if (!meetings) return res.json([]);
    const enriched = await Promise.all(meetings.map(async (m) => {
      const users = await db('users', 'GET', null, `?id=eq.${m.user_id}&select=name,photo`);
      return { ...m, user: users?.[0] || null };
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// POST /api/coach/meeting — create a new meeting (1-on-1 or group)
app.post('/api/coach/meeting', requireAuth, requireCoach, async (req, res) => {
  try {
    const { userId, isGroup, title, notes, link, scheduledAt } = req.body;
    if (!title || !scheduledAt) {
      return res.status(400).json({ error: 'title and scheduledAt required' });
    }
    if (!isGroup && !userId) {
      return res.status(400).json({ error: 'userId required for 1-on-1 sessions' });
    }

    const coach = await db('coaches', 'GET', null, `?id=eq.${req.session.coach_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);
    const dateLabel = new Date(scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    if (isGroup) {
      // Fetch all active clients for this coach
      const subs = await db('subscriptions', 'GET', null,
        `?coach_id=eq.${req.session.coach_id}&status=eq.active&select=user_id`
      );
      if (!subs || subs.length === 0) {
        return res.status(400).json({ error: 'No active clients to invite' });
      }

      const groupId = crypto.randomUUID();
      const created = [];
      for (const sub of subs) {
        const result = await db('coach_meetings', 'POST', {
          coach_id: req.session.coach_id,
          user_id: sub.user_id,
          group_id: groupId,
          title,
          notes: notes || null,
          link: link || null,
          scheduled_at: scheduledAt,
        });
        const meeting = Array.isArray(result) ? result[0] : result;
        created.push(meeting);

        await createNotification(
          sub.user_id,
          'user',
          'new_session',
          coach?.name || 'Your coach',
          `Group session: ${title} — ${dateLabel}`,
          coach?.name || null,
          coach?.photo || null
        );
      }
      return res.json({ group_id: groupId, count: created.length, meetings: created });
    }

    // 1-on-1 session (existing behavior)
    const result = await db('coach_meetings', 'POST', {
      coach_id: req.session.coach_id,
      user_id: userId,
      title,
      notes: notes || null,
      link: link || null,
      scheduled_at: scheduledAt,
    });
    const meeting = Array.isArray(result) ? result[0] : result;

    await createNotification(
      userId,
      'user',
      'new_session',
      coach?.name || 'Your coach',
      `${title} — ${dateLabel}`,
      coach?.name || null,
      coach?.photo || null
    );

    res.json(meeting);
  } catch (e) {
    logError('POST /api/coach/meeting', e.message, e.stack);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// PATCH /api/coach/meeting/:id — edit a meeting
app.patch('/api/coach/meeting/:id', requireAuth, requireCoach, async (req, res) => {
  try {
    const { title, notes, link, scheduledAt } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (notes !== undefined) updates.notes = notes;
    if (link !== undefined) updates.link = link;
    if (scheduledAt !== undefined) updates.scheduled_at = scheduledAt;

    const result = await db('coach_meetings', 'PATCH', updates,
      `?id=eq.${req.params.id}&coach_id=eq.${req.session.coach_id}`
    );
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// PATCH /api/coach/meeting/:id/cancel — cancel a meeting (and its whole group, if any)
app.patch('/api/coach/meeting/:id/cancel', requireAuth, requireCoach, async (req, res) => {
  try {
    const meetings = await db('coach_meetings', 'GET', null, `?id=eq.${req.params.id}&coach_id=eq.${req.session.coach_id}&select=*`);
    const meeting = meetings?.[0];
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const coach = await db('coaches', 'GET', null, `?id=eq.${req.session.coach_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);

    if (meeting.group_id) {
      // Cancel the whole group
      const groupMeetings = await db('coach_meetings', 'GET', null,
        `?group_id=eq.${meeting.group_id}&coach_id=eq.${req.session.coach_id}&select=*`
      );
      await db('coach_meetings', 'PATCH', { status: 'cancelled' }, `?group_id=eq.${meeting.group_id}`);
      for (const m of groupMeetings) {
        await createNotification(
          m.user_id,
          'user',
          'session_cancelled',
          coach?.name || 'Your coach',
          `Group session cancelled: ${m.title}`,
          coach?.name || null,
          coach?.photo || null
        );
      }
    } else {
      await db('coach_meetings', 'PATCH', { status: 'cancelled' }, `?id=eq.${req.params.id}`);
      await createNotification(
        meeting.user_id,
        'user',
        'session_cancelled',
        coach?.name || 'Your coach',
        `Session cancelled: ${meeting.title}`,
        coach?.name || null,
        coach?.photo || null
      );
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to cancel meeting' });
  }
});

// GET /api/meetings — client's own meetings
app.get('/api/meetings', requireAuth, requireUser, async (req, res) => {
  try {
    const meetings = await db('coach_meetings', 'GET', null,
      `?user_id=eq.${req.session.user_id}&order=scheduled_at.asc&select=*`
    );
    if (!meetings) return res.json([]);
    const enriched = await Promise.all(meetings.map(async (m) => {
      const coaches = await db('coaches', 'GET', null, `?id=eq.${m.coach_id}&select=name,photo`);
      return { ...m, coach: coaches?.[0] || null };
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});
// PATCH /api/chat/seen — mark all flagged messages as seen for this client+coach
app.patch('/api/chat/seen', requireAuth, requireUser, async (req, res) => {
  try {
    const { coachId } = req.body;
    if (!coachId) return res.status(400).json({ error: 'coachId required' });
    await db('messages', 'PATCH', { seen_by_user: true },
      `?user_id=eq.${req.session.user_id}&coach_id=eq.${coachId}&flagged=eq.true&seen_by_user=eq.false`
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark seen' });
  }
});
// GET /api/coach/analytics — revenue + subscriber analytics
app.get('/api/coach/analytics', requireAuth, requireCoach, async (req, res) => {
  try {
    const subs = await db('subscriptions', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&select=*`
    ).catch(() => []);
    const all = Array.isArray(subs) ? subs : [];
    for (const sub of all) {
      try {
        const users = await db('users', 'GET', null, `?id=eq.${sub.user_id}&select=name,photo,email`);
        sub.users = users?.[0] || null;
      } catch { sub.users = null; }
    }

    const active = all.filter(s => s.status === 'active');
    const cancelled = all.filter(s => s.status === 'cancelled');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Revenue per month (last 6 months)
    const revenueByMonth = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      revenueByMonth[key] = 0;
    }
    active.forEach(s => {
      const d = new Date(s.created_at);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (revenueByMonth[key] !== undefined) {
        revenueByMonth[key] += parseFloat(s.plan_price || 0) * 0.9;
      }
    });

    // New subscribers per month (last 6 months)
    const subsByMonth = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      subsByMonth[key] = 0;
    }
    all.forEach(s => {
      const d = new Date(s.created_at);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (subsByMonth[key] !== undefined) subsByMonth[key]++;
    });

    // Ending soon (within 48 hours)
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const endingSoon = active.filter(s => s.plan_end && s.plan_end <= in48h);

    // Total revenue (coach's 90%)
    const totalRevenue = active.reduce((sum, s) => sum + parseFloat(s.plan_price || 0) * 0.9, 0);
    const thisMonthRevenue = active
      .filter(s => new Date(s.created_at) >= monthStart)
      .reduce((sum, s) => sum + parseFloat(s.plan_price || 0) * 0.9, 0);

    res.json({
      active_count: active.length,
      cancelled_count: cancelled.length,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      this_month_revenue: parseFloat(thisMonthRevenue.toFixed(2)),
      avg_plan_price: active.length ? parseFloat((active.reduce((s, x) => s + parseFloat(x.plan_price || 0), 0) / active.length).toFixed(2)) : 0,
      revenue_by_month: Object.entries(revenueByMonth).map(([month, revenue]) => ({ month, revenue: parseFloat(revenue.toFixed(2)) })),
      subs_by_month: Object.entries(subsByMonth).map(([month, count]) => ({ month, count })),
      ending_soon: endingSoon,
      cancelled_list: cancelled.slice(0, 20),
      active_list: active,
    });
  } catch (e) {
    logError('GET /api/coach/analytics', e.message, e.stack);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});
// ─────────────────────────────────────────────
// PAYMENT METHOD (coach sets how they get paid)
// ─────────────────────────────────────────────

// PATCH /api/coach/payment-method — coach saves their payment info
app.patch('/api/coach/payment-method', requireAuth, requireCoach, async (req, res) => {
  try {
    const { payment_method, payment_details, payment_instructions } = req.body;
    if (!payment_method || !payment_details) {
      return res.status(400).json({ error: 'payment_method and payment_details required' });
    }
    const result = await db('coaches', 'PATCH',
      { payment_method, payment_details, payment_instructions: payment_instructions || null },
      `?id=eq.${req.session.coach_id}`
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save payment method' });
  }
});

// GET /api/coach/pending-payments — coach sees all pending approvals
app.get('/api/coach/pending-payments', requireAuth, requireCoach, async (req, res) => {
  try {
    const subs = await db('subscriptions', 'GET', null,
      `?coach_id=eq.${req.session.coach_id}&payment_status=eq.proof_submitted&select=*`
    );
    if (!subs || subs.length === 0) return res.json([]);
    const enriched = await Promise.all(subs.map(async (s) => {
      const users = await db('users', 'GET', null, `?id=eq.${s.user_id}&select=name,photo,email`);
      return { ...s, user: users?.[0] || null };
    }));
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

// PATCH /api/coach/approve-payment/:subId — coach approves, client gets access
app.patch('/api/coach/approve-payment/:subId', requireAuth, requireCoach, async (req, res) => {
  try {
    const result = await db('subscriptions', 'PATCH',
      { status: 'active', payment_status: 'approved', approved_at: new Date().toISOString() },
      `?id=eq.${req.params.subId}&coach_id=eq.${req.session.coach_id}`
    );
    const sub = Array.isArray(result) ? result[0] : result;
    // Notify client
    const coach = await db('coaches', 'GET', null, `?id=eq.${req.session.coach_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);
    if (sub?.user_id) {
      await createNotification(
        sub.user_id, 'user', 'payment_approved',
        coach?.name || 'Your coach',
        'Your payment has been confirmed. Welcome!',
        coach?.name || null, coach?.photo || null
      );
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

// PATCH /api/coach/reject-payment/:subId — coach rejects proof
app.patch('/api/coach/reject-payment/:subId', requireAuth, requireCoach, async (req, res) => {
  try {
    await db('subscriptions', 'PATCH',
      { payment_status: 'rejected' },
      `?id=eq.${req.params.subId}&coach_id=eq.${req.session.coach_id}`
    );
    const sub = await db('subscriptions', 'GET', null, `?id=eq.${req.params.subId}&select=user_id`).then(r => r?.[0]).catch(() => null);
    const coach = await db('coaches', 'GET', null, `?id=eq.${req.session.coach_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);
    if (sub?.user_id) {
      await createNotification(
        sub.user_id, 'user', 'payment_rejected',
        coach?.name || 'Your coach',
        'Your payment proof was not accepted. Please resubmit.',
        coach?.name || null, coach?.photo || null
      );
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

// POST /api/user/submit-proof — client uploads payment proof
app.post('/api/user/submit-proof', requireAuth, requireUser, async (req, res) => {
  try {
    const { subscriptionId, proofBase64 } = req.body;
    if (!subscriptionId || !proofBase64) {
      return res.status(400).json({ error: 'subscriptionId and proofBase64 required' });
    }
    // Upload proof image
    const buffer = Buffer.from(proofBase64.split(',')[1], 'base64');
    const fileName = `proof_${Date.now()}.jpg`;
    const uploadRes = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/coach-media/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY}`,
        'apikey': process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
      },
      body: buffer,
    });
    if (!uploadRes.ok) return res.status(500).json({ error: 'Failed to upload proof' });
    const proofUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/coach-media/${fileName}`;

    // Update subscription
    await db('subscriptions', 'PATCH',
      { payment_proof_url: proofUrl, payment_status: 'proof_submitted' },
      `?id=eq.${subscriptionId}&user_id=eq.${req.session.user_id}`
    );

    // Notify coach
    const sub = await db('subscriptions', 'GET', null, `?id=eq.${subscriptionId}&select=coach_id`).then(r => r?.[0]).catch(() => null);
    const user = await db('users', 'GET', null, `?id=eq.${req.session.user_id}&select=name,photo`).then(r => r?.[0]).catch(() => null);
    if (sub?.coach_id) {
      await createNotification(
        sub.coach_id, 'coach', 'proof_submitted',
        user?.name || 'A client',
        'A client submitted payment proof. Review and approve.',
        user?.name || null, user?.photo || null
      );
    }
    res.json({ success: true, proofUrl });
  } catch (e) {
    logError('POST /api/user/submit-proof', e.message, e.stack);
    res.status(500).json({ error: 'Failed to submit proof: ' + e.message });
  }
});

// GET /api/user/payment-status/:subId — client checks their payment status
app.get('/api/user/payment-status/:subId', requireAuth, requireUser, async (req, res) => {
  try {
    const subs = await db('subscriptions', 'GET', null,
      `?id=eq.${req.params.subId}&user_id=eq.${req.session.user_id}&select=payment_status,payment_proof_url,status,approved_at`
    );
    res.json(subs?.[0] || null);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

// POST /api/user/report-coach — client reports non-approving coach
app.post('/api/user/report-coach', requireAuth, requireUser, async (req, res) => {
  try {
    const { subscriptionId, reason } = req.body;
    await db('subscriptions', 'PATCH',
      { reported_at: new Date().toISOString() },
      `?id=eq.${subscriptionId}&user_id=eq.${req.session.user_id}`
    );
    // Log for admin
    await db('error_logs', 'POST', {
      type: 'coach_report',
      message: `User reported coach. Sub: ${subscriptionId}. Reason: ${reason || 'No reason given'}`,
      stack: null,
    }).catch(() => {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});
app.listen(PORT, () => {
  console.log(`Coachly backend running on port ${PORT}`);
});
