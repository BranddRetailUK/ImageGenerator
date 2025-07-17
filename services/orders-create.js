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

// Middleware to capture raw body for HMAC
router.use((req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
});

function verifyHmac(req) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  if (!hmacHeader || !req.rawBody) return false;
  const generatedHash = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(req.rawBody, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(hmacHeader, 'utf8'),
    Buffer.from(generatedHash, 'utf8')
  );
}

router.post('/', express.json(), async (req, res) => {
  console.log('📬 Webhook received at /orders-create');

  if (!verifyHmac(req)) {
    console.warn('❌ Webhook HMAC verification failed');
    return res.status(401).send('Invalid HMAC');
  }

  try {
    const order = req.body;
    const customer = order.customer;
    const line = order.line_items?.find(item =>
      ['Starter', 'Creator', 'Pro'].some(plan => item.title.includes(plan))
    );

    if (!customer || !line) {
      console.log('ℹ️ No matching subscription line item or missing customer');
      return res.status(200).send('No subscription plan purchased');
    }

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
  } catch (err) {
    console.error('🔥 Error in /orders-create:', err);
    res.status(500).send('Webhook processing failed');
  }
});

export default router;
