// routes/webhooks/orders-create.js

import express from 'express';
import crypto from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

// 1. Initialize DB pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 2. Load secrets
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
console.log(
  '🔒 SHOPIFY_WEBHOOK_SECRET:',
  SHOPIFY_WEBHOOK_SECRET ? 'loaded ✅' : '❌ MISSING'
);
console.log(
  '🔗 DATABASE_URL:',
  process.env.DATABASE_URL ? 'loaded ✅' : '❌ MISSING'
);

// 3. Manual raw‐body capture (must run before any body parser)
router.use((req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
  req.on('error', err => {
    console.error('⚠️ Error capturing raw body:', err);
    next(err);
  });
});

// 4. HMAC verification helper
function verifyHmac(rawBodyString, hmacHeader) {
  if (!hmacHeader || !rawBodyString) return false;
  const generatedHash = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(rawBodyString, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(hmacHeader, 'utf8'),
    Buffer.from(generatedHash, 'utf8')
  );
}

// 5. Webhook handler
router.post('/', async (req, res) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] 📬 Webhook hit /orders-create`);

  const raw = req.rawBody;  
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  if (!verifyHmac(raw, hmac)) {
    console.warn(`[${new Date().toISOString()}] ❌ Invalid HMAC`);
    return res.status(401).send('Invalid HMAC');
  }

  // Toggle this to skip DB writes for latency testing
  const skipDbWrite = false;
  if (skipDbWrite) {
    console.log(`[+${Date.now() - start}ms] ⏩ Skipping DB write (test mode)`);
    return res.status(200).send('ok');
  }

  try {
    // Parse payload from raw body
    const order = JSON.parse(raw);
    console.log(`[+${Date.now() - start}ms] ✅ Parsed order payload`);

    const customer = order.customer;
    const line = order.line_items?.find(item =>
      ['Starter','Creator','Pro'].some(plan => item.title.includes(plan))
    );
    if (!customer || !line) {
      console.log(`[+${Date.now() - start}ms] ℹ️ No subscription plan in order`);
      return res.status(200).send('No subscription plan purchased');
    }

    // Determine plan & credits
    let plan = '', credits = 0;
    if (line.title.includes('Starter'))     { plan = 'starter'; credits = 200; }
    else if (line.title.includes('Creator')){ plan = 'creator'; credits = 1000; }
    else if (line.title.includes('Pro'))    { plan = 'pro'; credits = null; }

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    console.log(`[+${Date.now() - start}ms] 🗄 Writing subscription to DB...`);
    await pool.query(`
      INSERT INTO user_subscriptions (shopify_customer_id, email, plan, credits, renewal_date)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (shopify_customer_id) DO UPDATE
        SET plan = $3, credits = $4, renewal_date = $5, updated_at = NOW()
    `, [
      customer.id,
      customer.email,
      plan,
      credits,
      renewalDate
    ]);

    console.log(`[+${Date.now() - start}ms] ✅ DB updated for ${customer.email} → ${plan}`);
    return res.status(200).send('ok');
  } catch (err) {
    console.error(`[+${Date.now() - start}ms] 🔥 Processing error:`, err.stack || err);
    return res.status(500).send('Webhook processing failed');
  }
});

export default router;
