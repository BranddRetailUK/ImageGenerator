import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

import { generateMiniMaxMockup } from './minimax.js';
import adminViewer from './services/viewer.js';

import { getBuffer } from './utils/http.js';
import { dateStamp, uniqueName } from './utils/path.js';
import {
  uploadBuffer,
  getTemporaryLink,
  createSharedLink,
} from './services/dropbox.js';


dotenv.config({ path: path.join(process.cwd(), 'server/.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Raw body only for Shopify webhooks route (if you mount it).
app.use((req, res, next) => {
  if (req.path.startsWith('/webhooks/')) {
    // keep raw body for HMAC verification
    let data = Buffer.alloc(0);
    req.setEncoding('utf8');
    req.on('data', chunk => { data = Buffer.concat([data, Buffer.from(chunk)]); });
    req.on('end', () => { req.rawBody = data; next(); });
  } else {
    next();
  }
});

// --- Database ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- Health ---
app.get('/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// --- Multer (legacy upload route) ---
const upload = multer({ dest: path.join(process.cwd(), 'server/uploads') });

// --- Helpers ---
async function insertImage({ prompt, source_url, dropbox_path, dropbox_url }) {
  const q = `
    INSERT INTO images (prompt, image_url, created_at, source_url, dropbox_path, dropbox_url)
    VALUES ($1, $2, NOW(), $3, $4, $5)
    RETURNING id, prompt, image_url, source_url, dropbox_path, dropbox_url, created_at
  `;
  // Keep image_url as the primary URL we expose (Dropbox link if available; fallback to source_url)
  const image_url = dropbox_url || source_url;
  const { rows } = await pool.query(q, [prompt, image_url, source_url, dropbox_path, dropbox_url]);
  return rows[0];
}

async function mirrorToDropbox(miniMaxUrl, { subfolder } = {}) {
  const buf = await getBuffer(miniMaxUrl);
  const dated = dateStamp();
  const filename = uniqueName('img', '.png');
  const dest = `/${dated}${subfolder ? `/${subfolder}` : ''}/${filename}`;
  const meta = await uploadBuffer(buf, dest, { makeSharedLink: true }); // was createSharedLink: true
  let url = meta.sharedUrl;
  // Convert dl=0 to dl=1 for direct download (if you want)
  if (url && url.includes('dl=0')) url = url.replace('dl=0', 'dl=1');
  return { dropbox_path: meta.pathLower, dropbox_url: url };
}

// --- Generate via prompt-only (MiniMax) ---
app.post('/generate-artwork', async (req, res) => {
  try {
    const { prompt, aspect_ratio, numImages = 4, subfolder } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const urls = await generateMiniMaxMockup(prompt, null, { aspect_ratio, numImages });

    const out = [];
    for (const srcUrl of urls) {
      const mirror = await mirrorToDropbox(srcUrl, { subfolder });
      const row = await insertImage({
        prompt,
        source_url: srcUrl,
        dropbox_path: mirror.dropbox_path,
        dropbox_url: mirror.dropbox_url,
      });
      out.push({ id: row.id, url: row.image_url, dropbox_path: row.dropbox_path });
    }

    res.json({ ok: true, count: out.length, images: out });
  } catch (err) {
    console.error('[generate-artwork] error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
});

// --- Legacy file + prompt flow ---
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { prompt, aspect_ratio, numImages = 4, subfolder } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (!req.file) return res.status(400).json({ error: 'Missing file' });

    const filePath = req.file.path;
    const urls = await generateMiniMaxMockup(prompt, filePath, { aspect_ratio, numImages });

    const out = [];
    for (const srcUrl of urls) {
      const mirror = await mirrorToDropbox(srcUrl, { subfolder });
      const row = await insertImage({
        prompt,
        source_url: srcUrl,
        dropbox_path: mirror.dropbox_path,
        dropbox_url: mirror.dropbox_url,
      });
      out.push({ id: row.id, url: row.image_url, dropbox_path: row.dropbox_path });
    }

    res.json({ ok: true, count: out.length, images: out });
  } catch (err) {
    console.error('[upload] error:', err);
    res.status(500).json({ error: 'Upload flow failed' });
  }
});

// --- Recent images (unchanged API, now returns Dropbox URLs where present) ---
app.get('/api/recent-images', async (_req, res) => {
  try {
    const q = `SELECT id, image_url AS url, dropbox_path, dropbox_url, prompt, created_at
               FROM images ORDER BY created_at DESC LIMIT 48`;
    const { rows } = await pool.query(q);
    res.json({ ok: true, images: rows });
  } catch (err) {
    console.error('[recent-images] error:', err);
    res.status(500).json({ error: 'Failed to load images' });
  }
});

// --- Download proxy: prefers Dropbox (shared or temp), then falls back to source_url ---
app.get('/download/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT image_url, source_url, dropbox_path, dropbox_url FROM images WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const row = rows[0];

    // 1) If we have a permanent Dropbox shared link, redirect to it.
    if (row.dropbox_url) {
      return res.redirect(row.dropbox_url);
    }
    // 2) If we have a Dropbox path, create a temporary link and redirect.
    if (row.dropbox_path) {
      const temp = await getTemporaryLink(row.dropbox_path);
      return res.redirect(temp);
    }
    // 3) Fallback: stream from source URL (MiniMax).
    if (row.source_url) {
      return res.redirect(row.source_url);
    }
    // 4) Last resort: image_url column.
    return res.redirect(row.image_url);
  } catch (err) {
    console.error('[download] error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// --- Admin viewer (gallery) ---
app.use('/admin', adminViewer);

// --- Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[server] running on http://localhost:${PORT}`));
