// server/index.js
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

// Set up __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 5050;

// Validate required env vars early
if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
  console.error('❌ SHOPIFY_WEBHOOK_SECRET is not set!');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set!');
  process.exit(1);
}

// PostgreSQL Pool (Railway DB)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CORS
app.use(cors());

// Mount the raw-body webhook BEFORE any JSON/body parsers
app.use('/webhooks/orders-create', ordersCreateWebhook);

// Global body parser for all other routes
app.use(express.json());

// Health check
app.get('/ping', (req, res) => res.send('pong'));

// Legacy file upload support
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'server/uploads';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('artwork'), async (req, res) => {
  const { garments, models, prompt } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded.' });

  try {
    const mockupUrl = await generateMiniMaxMockup(prompt, file.path);
    res.json({
      message: 'Upload and generation successful!',
      filename: file.filename,
      filepath: file.path,
      mockupUrl
    });
  } catch (err) {
    console.error('❌ MiniMax Error:', err);
    res.status(500).json({ error: 'Mockup generation failed.' });
  }
});

app.post('/generate-artwork', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || prompt.trim().length < 5) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const mockupUrl = await generateMiniMaxMockup(prompt); // No image
    const insertResult = await pool.query(
      'INSERT INTO images (prompt, image_url, created_at) VALUES ($1, $2, NOW()) RETURNING id',
      [prompt, mockupUrl]
    );

    res.json({ mockupUrl, imageId: insertResult.rows[0].id });
  } catch (err) {
    console.error('❌ Generation DB Error:', err);
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
    console.error('❌ Download Error:', err);
    res.status(500).send('Download failed');
  }
});

// Start Express server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
