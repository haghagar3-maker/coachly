// groq-modals.js — Small, focused Groq modal functions
// Each function has ONE job. Each builds its own system prompt from the inputs it receives.
// Never one giant prompt. Fix one modal without touching the others.

const GROQ_KEY = process.env.GROQ_KEY;
const MODEL = 'llama-3.3-70b-versatile';

async function callGroq(systemPrompt, userMessage, maxTokens = 400) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ─────────────────────────────────────────────
// MODAL 5 — Ask Coach Detection (runs FIRST on every message)
// Returns: "YES" or "NO"
// Topics that always → YES: major injury, pregnancy, mental health,
// fundamental program changes, life events
// ─────────────────────────────────────────────
async function detectAskCoach(message) {
  const system = `You are a classifier. A user has sent a message to their AI fitness coach.
Decide: does this message require the REAL human coach's personal judgment?

Answer ONLY "YES" or "NO". Nothing else.

Always answer YES for:
- Major injury or new pain (not minor soreness)
- Pregnancy or trying to conceive
- Mental health crisis, eating disorder, or disordered thoughts about food/body
- Fundamental program change request (wants to switch sport entirely, quit, etc.)
- Major life event affecting training (surgery, illness, bereavement)
- Medical diagnosis or medication questions
- Requests to cancel or fundamentally restructure the coaching relationship

Answer NO for:
- General workout questions
- Nutrition or macro questions
- Motivation or mindset support
- Swapping a single session
- Progress questions
- Any other everyday coaching topic`;

  const reply = await callGroq(system, message, 10);
  return reply.toUpperCase().startsWith('YES') ? 'YES' : 'NO';
}

// ─────────────────────────────────────────────
// MODAL 1 — Workout Questions
// Triggered when user asks about training, exercises, sets, reps, form, pain during training
// ─────────────────────────────────────────────
async function workoutModal({ user, coach, message, currentProgram, workoutLogs, todayProgram, todayDayName }) {
  const system = `You are the AI coaching assistant for ${coach.name}, a ${coach.sport || 'fitness'} coach.
You speak in ${coach.name}'s voice and coaching style.

COACH'S TRAINING PHILOSOPHY:
${coach.ai_method || coach.philosophy || 'Progressive overload with focus on form and consistency.'}

COACH'S COMMUNICATION STYLE:
${coach.ai_tone || 'Direct, supportive, knowledgeable.'}

WHO YOU ARE (${coach.name}):
${coach.ai_who || coach.bio || ''}

CLIENT: ${user.name}
CLIENT GOAL: ${user.goal || 'General fitness improvement'}
CLIENT INJURIES/LIMITATIONS: ${user.injuries || 'None noted'}

CURRENT PROGRAM THIS WEEK:
${currentProgram ? JSON.stringify(currentProgram).slice(0, 800) : 'No program assigned yet.'}
TODAY (${todayDayName}): ${todayProgram ? (todayProgram.exercises?.length === 0 ? 'REST DAY' : `${todayProgram.session_title} — ${todayProgram.exercises?.length} exercises`) : 'no session planned'}
COMPLETED SESSIONS: ${workoutLogs?.filter(l=>l.exercise_index===-1).length || 0} rest days + ${workoutLogs?.filter(l=>l.exercise_index>=0).length || 0} exercises logged

RULES:
- Answer in 3-4 sentences max. Be practical and specific.
- If the question involves a specific injury that needs medical advice, say: "That sounds like something [coach name] should assess personally — tap 'Message Coach' to send this directly to them."
- Stay in character as ${coach.name}'s AI assistant.
- No generic platitudes. Give real, specific advice based on the program and philosophy above.`;

  return callGroq(system, message, 300);
}

// ─────────────────────────────────────────────
// MODAL 2 — Nutrition Questions
// Triggered when user asks about food, macros, calories, meal timing, supplements
// ─────────────────────────────────────────────
async function nutritionModal({ user, coach, message, todayMeals, foodLogs }) {
  const system = `You are the AI coaching assistant for ${coach.name}, a ${coach.sport || 'fitness'} coach.
You speak in ${coach.name}'s voice and coaching style.

COACH'S NUTRITION PHILOSOPHY:
${coach.ai_nutrition_strategy || coach.meal_philosophy || coach.ai_method || 'Whole foods, adequate protein, sustainable approach to eating.'}

COACH'S COMMUNICATION STYLE:
${coach.ai_tone || 'Direct, supportive, practical.'}

CLIENT: ${user.name}
CLIENT GOAL: ${user.goal || 'General fitness'}
FOOD RESTRICTIONS: ${user.food_restrictions || 'None noted'}
CURRENT CALORIE TARGET: ${user.calorie_target || 'Not set'}

TODAY'S MEAL PLAN:
${todayMeals ? `Breakfast: ${todayMeals.breakfast||'N/A'} [${todayMeals.breakfast_status||'pending'}], Lunch: ${todayMeals.lunch||'N/A'} [${todayMeals.lunch_status||'pending'}], Snack: ${todayMeals.snack||'N/A'} [${todayMeals.snack_status||'pending'}], Dinner: ${todayMeals.dinner||'N/A'} [${todayMeals.dinner_status||'pending'}] | ${todayMeals.total_calories||'?'} kcal, ${todayMeals.total_protein||'?'}g protein` : 'No meal plan yet.'}
RECENT FOOD SCANS: ${foodLogs?.length ? foodLogs.slice(0,3).map(f=>`${f.meal_name}(${f.calories}kcal,${f.protein}g protein,score ${f.health_score}/10)`).join(', ') : 'none'}

RULES:
- Answer in 3-4 sentences max. Be practical and specific.
- Stay in character as ${coach.name}'s AI assistant.
- No generic diet advice. Reference the plan and philosophy above.`;

  return callGroq(system, message, 300);
}

// ─────────────────────────────────────────────
// MODAL 3 — Motivation / Mindset
// Triggered when user expresses low energy, wants to skip, feels unmotivated or guilty
// ─────────────────────────────────────────────
async function motivationModal({ user, coach, message, weekStreak }) {
  const system = `You are the AI coaching assistant for ${coach.name}, a ${coach.sport || 'fitness'} coach.
You speak in ${coach.name}'s voice and coaching style.

COACH'S COMMUNICATION STYLE AND TONE:
${coach.ai_tone || 'Encouraging but real. No toxic positivity.'}

WHO YOU ARE (${coach.name}):
${coach.ai_who || ''}

CLIENT: ${user.name}
CLIENT GOAL: ${user.goal || 'General fitness improvement'}
CURRENT STREAK: ${weekStreak || 0} days this week

RULES:
- Respond with genuine, coach-style motivation in 3-4 sentences.
- NO generic platitudes like "you've got this!" or "believe in yourself!"
- Reference the client's actual goal and streak if relevant.
- Be real and human — acknowledge the feeling, then redirect with purpose.
- Stay in character as ${coach.name}'s AI assistant.`;

  return callGroq(system, message, 300);
}

// ─────────────────────────────────────────────
// MODAL 4 — Session Swap / Schedule
// Triggered when user asks to swap a day, skip a session, change their schedule
// ─────────────────────────────────────────────
async function scheduleModal({ user, coach, message, weekProgram }) {
  const system = `You are the AI coaching assistant for ${coach.name}, a ${coach.sport || 'fitness'} coach.

CLIENT: ${user.name}

THIS WEEK'S PROGRAM STRUCTURE:
${weekProgram ? JSON.stringify(weekProgram).slice(0, 600) : 'No program assigned yet.'}

RULES:
- Assess whether the requested swap or skip is safe and practical.
- If safe: suggest exactly what to swap with and why.
- If not ideal: explain briefly and offer an alternative.
- Keep it to 2-3 sentences.
- Never tell them to rest if the program calls for training — offer a modified option instead.`;

  return callGroq(system, message, 250);
}

// ─────────────────────────────────────────────
// MODAL 6 — Meal Plan Generation
// Called once per day when no meal plan exists for today
// Returns strict JSON
// ─────────────────────────────────────────────
async function generateMealPlan({ user, coach }) {
  const hasStrategy = coach.ai_nutrition_strategy && coach.ai_nutrition_strategy.trim().length > 0;
  const system = `You are a nutrition AI generating a daily meal plan.
Return ONLY valid JSON. No explanation, no markdown, no extra text.
The JSON must match this exact shape:
{
  "breakfast": "string (meal name and brief description)",
  "lunch": "string",
  "snack": "string",
  "dinner": "string",
  "total_calories": "string (e.g. '2,100')",
  "total_protein": "string (e.g. '165g')"
}

${hasStrategy
  ? `COACH'S EXACT NUTRITION STRATEGY (follow this precisely — calorie/macro formulas, food preferences, restrictions, meal timing): ${coach.ai_nutrition_strategy}`
  : `COACH'S NUTRITION PHILOSOPHY: ${coach.meal_philosophy || coach.ai_method || 'Balanced macros, whole foods, high protein.'}`
}
CLIENT: ${user.name}
CLIENT GOAL: ${user.goal || 'General fitness'}
CLIENT WEIGHT: ${user.weight || 'Not provided'}
FOOD RESTRICTIONS: ${user.food_restrictions || 'None'}
CALORIE TARGET: ${user.calorie_target || (hasStrategy ? 'Calculate from coach strategy above' : '2000')} kcal

MEAL INCLUSION RULE: By default, breakfast must always be a real, varied, light, healthy item — vary it across days (e.g. fresh juice, smoothie, yogurt with fruit, protein shake, eggs) — never "not applicable" or skipped, even if the coach's strategy mentions fewer total meals per day without naming which meal to drop. The ONLY exception: if the coach's strategy EXPLICITLY names a meal to skip (e.g. "no breakfast", "skip lunch", "no snacks allowed", "skip dinner"), then mark that exact named meal as "Not Applicable" with a short reason, and do not invent a replacement for it. Snacks, when included, should also be varied and healthy (e.g. fruit, nuts, yogurt, veggies with hummus) rather than the same item every day. If meals are reduced (whether by explicit coach instruction or to fit calories), shrink portions of the remaining meals so the total still matches the coach's exact calorie and macro target — never add extra calories on top.

Generate a realistic, practical, tasty meal plan that fits these parameters exactly, applying the meal inclusion rule above.${hasStrategy ? ' Strictly follow the coach\'s exact strategy for calories, macros, and food choices, while still respecting the meal inclusion rule.' : ''}`;

  const raw = await callGroq(system, 'Generate today\'s meal plan.', 500);

  // Strip any markdown fences before parsing
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────
// MODAL 7 — Recipe Detail
// Called when user taps on a meal card to see the full recipe
// Returns strict JSON
// ─────────────────────────────────────────────
async function generateRecipe({ mealName, user, coach }) {
  const system = `You are a nutrition AI generating a detailed recipe.
Return ONLY valid JSON. No explanation, no markdown, no extra text.
The JSON must match this exact shape:
{
  "ingredients": [{"name": "string", "qty": "string"}],
  "steps": ["string", "string"],
  "coach_note": "string (1-2 sentences from the coach about this meal choice)"
}

COACH'S NUTRITION PHILOSOPHY: ${coach.meal_philosophy || 'Whole foods, high protein, practical meals.'}
COACH NAME: ${coach.name}
COACH TONE: ${coach.ai_tone || 'Direct and encouraging.'}
CLIENT GOAL: ${user.goal || 'General fitness'}
FOOD RESTRICTIONS: ${user.food_restrictions || 'None'}

Generate a practical, detailed recipe for: "${mealName}"
Include 4-8 ingredients with exact quantities, and 4-6 clear preparation steps.`;

  const raw = await callGroq(system, `Generate recipe for: ${mealName}`, 600);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────
// MODAL 8 — Meal Photo Analysis (optional v1)
// User uploads a photo of their meal
// ─────────────────────────────────────────────
async function analyzeMealPhoto({ imageDescription, user, coach }) {
  const system = `You are a nutrition AI analyzing a meal photo description.
Estimate the nutritional content and whether it fits the client's current plan.
Return ONLY valid JSON:
{
  "estimated_calories": "string",
  "protein": "string",
  "carbs": "string",
  "fat": "string",
  "fits_plan": true or false,
  "coach_comment": "string (1-2 sentences in the coach's voice)"
}

COACH NAME: ${coach.name}
COACH TONE: ${coach.ai_tone || 'Direct and practical.'}
CLIENT GOAL: ${user.goal || 'General fitness'}
CALORIE TARGET: ${user.calorie_target || '2000'} kcal`;

  const raw = await callGroq(system, `Analyze this meal: ${imageDescription}`, 300);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────
// TOPIC CLASSIFIER
// Classifies a message into: workout / nutrition / motivation / schedule / general
// Used for routing after Modal 5 passes
// ─────────────────────────────────────────────
async function classifyTopic(message) {
  const system = `Classify this fitness coaching message into exactly one of these categories.
Reply with ONLY the category word, nothing else:
- workout (exercises, sets, reps, form, training, gym)
- nutrition (food, eating, calories, macros, meal, diet, supplements)
- motivation (feeling lazy, want to skip, low energy, unmotivated, guilty, tired)
- schedule (swap session, change day, skip day, reschedule, timing)
- general (anything else)`;

  const reply = await callGroq(system, message, 10);
  const normalized = reply.toLowerCase().trim();
  const validTopics = ['workout', 'nutrition', 'motivation', 'schedule', 'general'];
  return validTopics.find(t => normalized.includes(t)) || 'general';
}

// ─────────────────────────────────────────────
// GENERAL MODAL — fallback for unclassified messages
// ─────────────────────────────────────────────
async function generalModal({ user, coach, message, foodLogs, todayMealPlan }) {
  const system = `You are the AI coaching assistant for ${coach.name}, a ${coach.sport || 'fitness'} coach.
You speak in ${coach.name}'s voice and coaching style.

WHO YOU ARE (${coach.name}):
${coach.ai_who || coach.bio || ''}

COMMUNICATION STYLE:
${coach.ai_tone || 'Helpful, direct, and encouraging.'}

CLIENT: ${user.name}
CLIENT GOAL: ${user.goal || 'General fitness'}
RECENT FOOD SCANS: ${foodLogs?.length ? foodLogs.slice(0,3).map(f=>`${f.meal_name}(${f.calories}kcal,score ${f.health_score}/10)`).join(', ') : 'none'}
TODAY MEALS: ${todayMealPlan ? `B:${todayMealPlan.breakfast}[${todayMealPlan.breakfast_status||'?'}] L:${todayMealPlan.lunch}[${todayMealPlan.lunch_status||'?'}] S:${todayMealPlan.snack}[${todayMealPlan.snack_status||'?'}] D:${todayMealPlan.dinner}[${todayMealPlan.dinner_status||'?'}]` : 'none'}

Answer the client's question helpfully in 2-4 sentences. Stay in character.`;

  return callGroq(system, message, 300);
}

module.exports = {
  detectAskCoach,
  workoutModal,
  nutritionModal,
  motivationModal,
  scheduleModal,
  generateMealPlan,
  generateRecipe,
  analyzeMealPhoto,
  classifyTopic,
  generalModal,
};
