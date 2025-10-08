import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;
import path from 'path';
import dotenv from 'dotenv';

import { generateMiniMaxMockup } from './minimax.js';
import adminViewer from './services/viewer.js';

import { getBuffer } from './utils/http.js';
import { dateStamp, uniqueName } from './utils/path.js';
import { uploadBuffer } from './services/dropbox.js';

dotenv.config({ path: path.join(process.cwd(), 'server/.env') });

const app = express();
app.use(cors());
app.use(express.json());

// --- Database ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- Health ---
app.get('/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// --- Multer (legacy upload route) ---
const upload = multer({ dest: path.join(process.cwd(), 'server/uploads') });

// --- Helpers: legacy-compatible DB insert (ONLY prompt, image_url) ---
async function insertImageLegacy({ prompt, image_url }) {
  const q = `
    INSERT INTO images (prompt, image_url, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id, prompt, image_url, created_at
  `;
  const { rows } = await pool.query(q, [prompt, image_url]);
  return rows[0];
}

// Mirror a MiniMax URL to Dropbox, but always return a URL we can show immediately.
// If Dropbox link creation fails, we quietly fall back to the original MiniMax URL.
async function mirrorToDropboxOrFallback(miniMaxUrl, { subfolder } = {}) {
  try {
    const buf = await getBuffer(miniMaxUrl);
    const dated = dateStamp();
    const filename = uniqueName('img', '.png');
    const dest = `/${dated}${subfolder ? `/${subfolder}` : ''}/${filename}`;
    const meta = await uploadBuffer(buf, dest, { makeSharedLink: true });
    // Prefer Dropbox link if we got one; otherwise use the original.
    return meta.sharedUrl || miniMaxUrl;
  } catch (e) {
    // Silent fallback keeps UX intact.
    console.warn('[mirrorToDropboxOrFallback] using source url:', String(e?.message || e));
    return miniMaxUrl;
  }
}

// --- Generate via prompt-only (MiniMax) ---
// RESPONSE: { ok:true, urls:[...], count:n }  <-- legacy-compatible for your frontend
app.post('/generate-artwork', async (req, res) => {
  try {
    const { prompt, aspect_ratio, subfolder } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // Accept numImages | quantity | count, clamp to 1..6, default 1
    const reqCount = Number(req.body?.numImages ?? req.body?.quantity ?? req.body?.count ?? 1);
    const numImages = Number.isFinite(reqCount) ? Math.max(1, Math.min(6, reqCount)) : 1;

    const srcUrls = await generateMiniMaxMockup(prompt, null, { aspect_ratio, numImages });

    const finalUrls = [];
    for (const srcUrl of srcUrls) {
      const showUrl = await mirrorToDropboxOrFallback(srcUrl, { subfolder });
      await insertImageLegacy({ prompt, image_url: showUrl });
      finalUrls.push(showUrl);
    }

    // Legacy shape so your existing script renders immediately
    res.json({ ok: true, count: finalUrls.length, urls: finalUrls });
  } catch (err) {
    console.error('[generate-artwork] error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
});


// --- Legacy file + prompt flow ---
// RESPONSE: { ok:true, urls:[...], count:n }
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { prompt, aspect_ratio, subfolder } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (!req.file) return res.status(400).json({ error: 'Missing file' });

    // Accept numImages | quantity | count, clamp to 1..6, default 1
    const reqCount = Number(req.body?.numImages ?? req.body?.quantity ?? req.body?.count ?? 1);
    const numImages = Number.isFinite(reqCount) ? Math.max(1, Math.min(6, reqCount)) : 1;

    const filePath = req.file.path;
    const srcUrls = await generateMiniMaxMockup(prompt, filePath, { aspect_ratio, numImages });

    const finalUrls = [];
    for (const srcUrl of srcUrls) {
      const showUrl = await mirrorToDropboxOrFallback(srcUrl, { subfolder });
      await insertImageLegacy({ prompt, image_url: showUrl });
      finalUrls.push(showUrl);
    }

    res.json({ ok: true, count: finalUrls.length, urls: finalUrls });
  } catch (err) {
    console.error('[upload] error:', err);
    res.status(500).json({ error: 'Upload flow failed' });
  }
});


// --- Download proxy: redirect to the stored image_url ---
app.get('/download/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT image_url FROM images WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.redirect(rows[0].image_url);
  } catch (err) {
    console.error('[download] error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// --- Admin viewer (unchanged mount) ---
app.use('/admin', adminViewer);

// --- Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[server] running on http://localhost:${PORT}`));
