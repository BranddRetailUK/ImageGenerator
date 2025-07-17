// services/shopify-webhooks.js

import fetch from 'node-fetch';

export async function registerOrderWebhook({ accessToken, shop }) {
  const webhookUrl = `https://imagegenerator-production-1fac.up.railway.app/webhooks/orders-create`;
  const apiVersion = '2025-07';

  const response = await fetch(`https://${shop}/admin/api/${apiVersion}/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhook: {
        topic: 'orders/create',
        address: webhookUrl,
        format: 'json',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Failed to register webhook: ${response.status} ${error}`);
    throw new Error('Webhook registration failed');
  }

  const data = await response.json();
  console.log(`✅ Webhook registered: ID ${data.webhook.id}`);
  return data.webhook;
}
