// index.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { generateMiniMaxMockup } from './minimax.js';
import pkg from 'pg';
import ordersCreateWebhook from '../services/orders-create.js';

import path from 'path';
import { fileURLToPath } from 'url';

// ✅ Runtime debug for Railway path issues
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[BOOT] __filename:', __filename);
console.log('[BOOT] __dirname:', __dirname);

try {
  console.log('[BOOT] Listing /app directory:', fs.readdirSync('/app'));
} catch (err) {
  console.error('❌ Failed to list /app:', err.message);
}

try {
  console.log('[BOOT] Listing /app/server directory:', fs.readdirSync('/app/server'));
} catch (err) {
  console.error('❌ Failed to list /app/server:', err.message);
}

try {
  console.log('[BOOT] Listing /app/services directory:', fs.readdirSync('/app/services'));
} catch (err) {
  console.error('❌ Failed to list /app/services:', err.message);
}

dotenv.config();

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// ✅ PostgreSQL Pool (Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Multer config for optional image uploads (legacy)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'server/uploads';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ✅ Mount Shopify webhook route (must come BEFORE body parsing affects rawBody)
app.use('/webhooks/orders-create', ordersCreateWebhook);

// Health check
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Upload + generate with file (legacy mode)
app.post('/upload', upload.single('artwork'), async (req, res) => {
  const { garments, models, prompt } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  console.log('Received:', { garments, models, prompt });
  console.log('Saved file to:', file.path);

  try {
    const mockupUrl = await generateMiniMaxMockup(prompt, file.path);
    res.json({
      message: 'Upload and generation successful!',
      filename: file.filename,
      filepath: file.path,
      mockupUrl
    });
  } catch (err) {
    console.error('MiniMax error:', err);
    res.status(500).json({ error: 'Mockup generation failed.' });
  }
});

app.post('/generate-artwork', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || prompt.trim().length < 5) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  console.log('[🎨 Artwork Request]', prompt);

  try {
    const mockupUrl = await generateMiniMaxMockup(prompt); // No image

    const insertResult = await pool.query(
      'INSERT INTO images (prompt, image_url, created_at) VALUES ($1, $2, NOW()) RETURNING id',
      [prompt, mockupUrl]
    );

    const imageId = insertResult.rows[0].id;
    res.json({ mockupUrl, imageId });
  } catch (err) {
    console.error('[❌ Generation Error]', err);
    res.status(500).json({ error: 'Artwork generation failed.' });
  }
});

app.get('/download/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query('SELECT image_url FROM images WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).send('Image not found');

    const imageUrl = result.rows[0].image_url;
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="artwork.png"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Download failed');
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
