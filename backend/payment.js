// payment.js — Payment placeholder module
// ─────────────────────────────────────────────────────────────────────────────
// PLUGGING IN A PAYMENT PROVIDER:
//
// 1. Choose LemonSqueezy or Paddle (both work well for SaaS)
//
// 2. LemonSqueezy setup:
//    - npm install @lemonsqueezy/lemonsqueezy.js
//    - Set env vars: LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET
//    - Replace createCheckout() with their createCheckout() SDK call
//    - Replace handleWebhook() with their webhook verification + subscription update
//
// 3. Paddle setup:
//    - npm install @paddle/paddle-node-sdk
//    - Set env vars: PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET
//    - Replace createCheckout() with paddle.transactions.create()
//    - Replace handleWebhook() with paddle.webhooks.unmarshal()
//
// 4. The ONLY file you edit is this one. No changes needed in server.js routes.
//
// 5. Platform fee: 10% of every subscription payment.
//    Currently tracked in subscriptions.plan_price — the platform keeps 10%,
//    coach receives 90%. When payment is live, pass the net amount to the coach
//    via the payment provider's split/affiliate payout feature.
//
// ─────────────────────────────────────────────────────────────────────────────

// TODO: import your payment SDK here
// const { lemonSqueezySetup, createCheckout } = require('@lemonsqueezy/lemonsqueezy.js');

// TODO: initialize your SDK here
// lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY });

/**
 * createCheckout — called when a user subscribes to a coach
 *
 * @param {Object} params
 * @param {string} params.userId - Supabase user ID
 * @param {string} params.coachId - Supabase coach ID
 * @param {number} params.planMonths - 3, 6, or 12
 * @param {number} params.planPrice - price the user agreed to pay
 * @param {string} params.subscriptionId - newly created subscription record ID
 *
 * @returns {{ checkoutUrl: string|null, skipPayment: boolean }}
 *   - checkoutUrl: redirect the user here to complete payment
 *   - skipPayment: if true, skip payment and activate subscription directly (dev mode)
 */
async function createCheckout({ userId, coachId, planMonths, planPrice, subscriptionId }) {
  // ── CURRENT BEHAVIOR (manual payment-proof system) ──
  // No payment provider connected — client pays the coach directly outside
  // the app and uploads a screenshot as proof. Subscription stays pending
  // until the coach (or admin, after 48h) approves it.
  return {
    checkoutUrl: null,
    skipPayment: false,
  };

  // ── LEMONSQUEEZY EXAMPLE (uncomment when ready) ──
  // const checkout = await createCheckout(
  //   process.env.LEMONSQUEEZY_STORE_ID,
  //   process.env.LEMONSQUEEZY_VARIANT_ID, // your product variant for this plan
  //   {
  //     checkoutOptions: { embed: false },
  //     checkoutData: {
  //       email: userEmail,
  //       custom: { userId, coachId, subscriptionId },
  //       billingAddress: {},
  //     },
  //     expiresAt: null,
  //     preview: false,
  //   }
  // );
  // return { checkoutUrl: checkout.data.attributes.url, skipPayment: false };

  // ── PADDLE EXAMPLE (uncomment when ready) ──
  // const transaction = await paddle.transactions.create({
  //   items: [{ priceId: process.env.PADDLE_PRICE_ID, quantity: 1 }],
  //   customData: { userId, coachId, subscriptionId },
  // });
  // return { checkoutUrl: transaction.checkoutUrl, skipPayment: false };
}

/**
 * handleWebhook — called by POST /api/webhook when payment provider sends an event
 *
 * @param {Object} req - Express request (raw body needed for signature verification)
 * @returns {{ subscriptionId: string, status: string }|null}
 */
async function handleWebhook(req) {
  // ── CURRENT BEHAVIOR ──
  // No webhook logic. Returns null — the server ignores it.
  return null;

  // ── LEMONSQUEEZY EXAMPLE (uncomment when ready) ──
  // const rawBody = req.rawBody; // needs express.raw() middleware
  // const signature = req.headers['x-signature'];
  // const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  //
  // const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // if (hash !== signature) throw new Error('Invalid webhook signature');
  //
  // const event = JSON.parse(rawBody);
  // if (event.meta.event_name === 'order_created') {
  //   const subscriptionId = event.meta.custom_data.subscriptionId;
  //   return { subscriptionId, status: 'active' };
  // }
  // return null;

  // ── PADDLE EXAMPLE (uncomment when ready) ──
  // const signature = req.headers['paddle-signature'];
  // const event = paddle.webhooks.unmarshal(req.rawBody, process.env.PADDLE_WEBHOOK_SECRET, signature);
  // if (event.eventType === 'transaction.completed') {
  //   const subscriptionId = event.data.customData.subscriptionId;
  //   return { subscriptionId, status: 'active' };
  // }
  // return null;
}

/**
 * calculatePlatformFee — utility to compute the 10% platform cut
 *
 * @param {number} planPrice
 * @returns {{ platformFee: number, coachReceives: number }}
 */
function calculatePlatformFee(planPrice) {
  const platformFee = parseFloat((planPrice * 0.10).toFixed(2));
  const coachReceives = parseFloat((planPrice * 0.90).toFixed(2));
  return { platformFee, coachReceives };
}

module.exports = { createCheckout, handleWebhook, calculatePlatformFee };
