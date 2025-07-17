// routes/webhooks/orders-create.js

import express from 'express';
import crypto from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

function verifyHmac(req) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const generatedHash = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(req.rawBody, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hmacHeader, 'utf8'), Buffer.from(generatedHash, 'utf8'));
}

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!verifyHmac(req)) {
    console.warn('⚠️ Webhook HMAC verification failed');
    return res.status(401).send('Invalid HMAC');
  }

  const order = JSON.parse(req.body.toString('utf8'));
  const customer = order.customer;
  const line = order.line_items.find(item =>
    ['Starter', 'Creator', 'Pro'].some(plan => item.title.includes(plan))
  );

  if (!line) return res.status(200).send('No subscription plan purchased');

  let plan = '', credits = 0;
  if (line.title.includes('Starter')) { plan = 'starter'; credits = 200; }
  else if (line.title.includes('Creator')) { plan = 'creator'; credits = 1000; }
  else if (line.title.includes('Pro')) { plan = 'pro'; credits = null; }

  const renewalDate = new Date();
  renewalDate.setMonth(renewalDate.getMonth() + 1);

  await pool.query(`
    INSERT INTO user_subscriptions (shopify_customer_id, email, plan, credits, renewal_date)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (shopify_customer_id)
    DO UPDATE SET plan = $3, credits = $4, renewal_date = $5, updated_at = NOW()
  `, [customer.id, customer.email, plan, credits, renewalDate]);

  console.log(`✅ Stored subscription: ${customer.email} → ${plan}`);
  res.status(200).send('ok');
});

export default router;
