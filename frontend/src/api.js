const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('coachly_token');
}

function getAdminToken() {
  return localStorage.getItem('coachly_admin_token');
}

async function request(path, { method = 'GET', body, admin = false } = {}) {
  const token = admin ? getAdminToken() : getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      msg = data.error || data.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json().catch(() => ({}));
}

// ─── AUTH TOKENS ────────────────────────────────────────────────
export function saveToken(token, type) {
  localStorage.setItem('coachly_token', token);
  localStorage.setItem('coachly_token_type', type);
}

export function saveAdminToken(token) {
  localStorage.setItem('coachly_admin_token', token);
}

export function clearToken() {
  localStorage.removeItem('coachly_token');
  localStorage.removeItem('coachly_token_type');
}

export function clearAdminToken() {
  localStorage.removeItem('coachly_admin_token');
}

// ─── PUBLIC ─────────────────────────────────────────────────────
export function getCoaches(category) {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/api/coaches${q}`);
}

export function getCoach(id) {
  return request(`/api/coach/${id}`);
}

export function getCategories() {
  return request('/api/categories');
}

export function getPublicPosts(coachId) {
  return request(`/api/posts/${coachId}`);
}

// ─── COACH AUTH ──────────────────────────────────────────────────
export function coachSignup(data) {
  return request('/api/coach/signup', { method: 'POST', body: data });
}

export function coachLogin(email, password) {
  return request('/api/coach/login', { method: 'POST', body: { email, password } });
}

// ─── COACH (authenticated) ───────────────────────────────────────
export function getCoachMe() {
  return request('/api/coach/me');
}

export function updateCoachProfile(data) {
  return request('/api/coach/profile', { method: 'PATCH', body: data });
}

export function getCoachClients() {
  return request('/api/coach/clients');
}

export function getCoachClient(userId) {
  return request(`/api/coach/client/${userId}`);
}

export function getCoachCheckins() {
  return request('/api/coach/checkins');
}

export function replyCheckin(id, coachReply) {
  return request(`/api/coach/checkin/${id}`, { method: 'PATCH', body: { coachReply } });
}

export function getCoachDirectMessages() {
  return request('/api/coach/direct-messages');
}

export function sendCoachDirectMessage(userId, content) {
  return request('/api/coach/direct-message', { method: 'POST', body: { userId, content } });
}

export function getCoachAiConversations() {
  return request('/api/coach/ai-conversations');
}

export function flagAiMessage(messageId) {
  return request(`/api/coach/ai-conversation/${messageId}/flag`, { method: 'PATCH' });
}

export function getCoachContent() {
  return request('/api/coach/content');
}

export function createCoachContent(data) {
  return request('/api/coach/content', { method: 'POST', body: data });
}

export function updateCoachContent(id, data) {
  return request(`/api/coach/content/${id}`, { method: 'PATCH', body: data });
}

export function deleteCoachContent(id) {
  return request(`/api/coach/content/${id}`, { method: 'DELETE' });
}

export function getCoachPrograms() {
  return request('/api/coach/programs');
}

export function createCoachProgram(data) {
  return request('/api/coach/program', { method: 'POST', body: data });
}

export function updateCoachAiTraining(data) {
  return request('/api/coach/ai-training', { method: 'PATCH', body: data });
}

export function getCoachStats() {
  return request('/api/coach/stats');
}

// ─── USER AUTH ───────────────────────────────────────────────────
export function userSignup(data) {
  return request('/api/user/signup', { method: 'POST', body: data });
}

export function userLogin(email, password) {
  return request('/api/user/login', { method: 'POST', body: { email, password } });
}

// ─── USER (authenticated) ────────────────────────────────────────
export function getUserMe() {
  return request('/api/user/me');
}

export function updateUserProfile(data) {
  return request('/api/user/profile', { method: 'PATCH', body: data });
}

export function getUserSubscriptions() {
  return request('/api/user/subscriptions');
}

export function createSubscription(coachId, planMonths, planPrice, intake) {
  return request('/api/user/subscribe', {
    method: 'POST',
    body: { coachId, planMonths, planPrice, intake },
  });
}

export function cancelSubscription(id) {
  return request(`/api/user/subscription/${id}`, { method: 'DELETE' });
}

// ─── AI CHAT ────────────────────────────────────────────────────
export function sendChatMessage(message, coachId) {
  return request('/api/chat', { method: 'POST', body: { message, coachId } });
}

export function getChatHistory(coachId) {
  return request(`/api/chat/history?coachId=${coachId}`);
}

// ─── DIRECT MESSAGES ────────────────────────────────────────────
export function getDMs(coachId) {
  return request(`/api/dm?coachId=${coachId}`);
}

export function sendDM(coachId, content) {
  return request('/api/dm', { method: 'POST', body: { coachId, content } });
}

export function markDMsRead(coachId) {
  return request(`/api/dm/read?coachId=${coachId}`, { method: 'PATCH' });
}

// ─── MEALS ──────────────────────────────────────────────────────
export function getTodayMeals(coachId) {
  return request(`/api/meals/today?coachId=${coachId}`);
}

// ─── CHECK-INS ──────────────────────────────────────────────────
export function submitCheckin(data) {
  return request('/api/checkin', { method: 'POST', body: data });
}

export function getCheckins(coachId) {
  return request(`/api/checkins?coachId=${coachId}`);
}

// ─── COMMUNITY ──────────────────────────────────────────────────
export function getPosts(coachId) {
  return request(`/api/posts/${coachId}`);
}

export function createPost(coachId, content, photo) {
  return request('/api/posts', { method: 'POST', body: { coachId, content, photo } });
}

export function likePost(id) {
  return request(`/api/posts/${id}/like`, { method: 'PATCH' });
}

export function getComments(postId) {
  return request(`/api/comments/${postId}`);
}

export function createComment(postId, content) {
  return request('/api/comments', { method: 'POST', body: { postId, content } });
}

// ─── CONTENT ────────────────────────────────────────────────────
export function getContent(coachId) {
  return request(`/api/content/${coachId}`);
}

// ─── PROGRAMS ───────────────────────────────────────────────────
export function getProgram(coachId) {
  return request(`/api/program?coachId=${coachId}`);
}

// ─── WORKOUT LOGS ───────────────────────────────────────────────
export function logWorkout(programId, exerciseIndex) {
  return request('/api/workout-log', { method: 'POST', body: { programId, exerciseIndex } });
}

export function getWorkoutLogs(coachId) {
  return request(`/api/workout-logs?coachId=${coachId}`);
}

// ─── ADMIN AUTH ──────────────────────────────────────────────────
export function adminLogin(email, password) {
  return request('/api/admin/login', { method: 'POST', body: { email, password } });
}

// ─── ADMIN (authenticated) ───────────────────────────────────────
export function getAdminStats() {
  return request('/api/admin/stats', { admin: true });
}

export function getAdminCoaches() {
  return request('/api/admin/coaches', { admin: true });
}

export function approveCoach(id) {
  return request(`/api/admin/coach/${id}/approve`, { method: 'PATCH', admin: true });
}

export function suspendCoach(id) {
  return request(`/api/admin/coach/${id}/suspend`, { method: 'PATCH', admin: true });
}

export function deleteCoach(id) {
  return request(`/api/admin/coach/${id}`, { method: 'DELETE', admin: true });
}

export function getAdminUsers() {
  return request('/api/admin/users', { admin: true });
}

export function getAdminSubscriptions() {
  return request('/api/admin/subscriptions', { admin: true });
}

export function getAdminCategories() {
  return request('/api/admin/categories', { admin: true });
}

export function createAdminCategory(data) {
  return request('/api/admin/category', { method: 'POST', body: data, admin: true });
}

export function updateAdminCategory(id, data) {
  return request(`/api/admin/category/${id}`, { method: 'PATCH', body: data, admin: true });
}

export function deleteAdminCategory(id) {
  return request(`/api/admin/category/${id}`, { method: 'DELETE', admin: true });
}

export function getAdminRevenue() {
  return request('/api/admin/revenue', { admin: true });
}

export function getAdminActivity() {
  return request('/api/admin/activity', { admin: true });
}

export function getAdminSystem() {
  return request('/api/admin/system', { admin: true });
}

// ─── LOGOUT ──────────────────────────────────────────────────────
export async function logout() {
  try {
    await request('/api/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}

export async function adminLogout() {
  try {
    await request('/api/logout', { method: 'POST', admin: true });
  } finally {
    clearAdminToken();
  }
}
