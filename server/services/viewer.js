import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import { deleteFile } from './dropbox.js';

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ---------- Admin Viewer (Gallery) ----------
router.get('/viewer', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, prompt, image_url, dropbox_url, dropbox_path, source_url, created_at
      FROM images
      ORDER BY created_at DESC
      LIMIT 200
    `);

    const items = rows.map(r => `
      <div class="card">
        <a href="/download/${r.id}" target="_blank">
          <img src="${r.dropbox_url || r.image_url}" alt="img ${r.id}"/>
        </a>
        <div class="meta">
          <div class="id">#${r.id}</div>
          <div class="created">${new Date(r.created_at).toLocaleString()}</div>
        </div>
        <div class="prompt">${(r.prompt || '').replace(/</g, '&lt;')}</div>
        <div class="links">
          ${r.dropbox_url ? `<a href="${r.dropbox_url}" target="_blank">Dropbox</a>` : ''}
          ${r.source_url ? `<a href="${r.source_url}" target="_blank">Source</a>` : ''}
          <form method="POST" action="/admin/delete/${r.id}" onsubmit="return confirm('Delete image #${r.id}? This removes the DB row${r.dropbox_path ? ' and Dropbox file' : ''}.');">
            <button type="submit" class="danger">Delete</button>
          </form>
        </div>
      </div>
    `).join('');

    res.send(`
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Admin Gallery</title>
          <style>
            body {
              font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
              background:#0b0b0b; color:#ddd; margin:0; padding:20px;
            }
            h1 { margin:0 0 16px 0; font-size:20px; }
            .grid {
              display:grid;
              grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
              gap:16px;
            }
            .card {
              background:#151515;
              border-radius:12px;
              padding:12px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }
            img {
              width:100%; height:260px; object-fit:cover;
              border-radius:8px; display:block;
            }
            .meta {
              display:flex; justify-content:space-between;
              font-size:12px; opacity:0.8; margin:8px 0 4px;
            }
            .prompt {
              font-size:12px; line-height:1.4;
              max-height:66px; overflow:auto;
              background:#0f0f0f; border-radius:8px; padding:8px;
            }
            .links {
              display:flex; gap:8px; align-items:center; margin-top:8px;
            }
            a { color:#7bb7ff; text-decoration:none; }
            a:hover { text-decoration:underline; }
            button.danger {
              background:#3b0b0b; color:#fff;
              border:1px solid #5a1a1a;
              padding:6px 10px; border-radius:8px; cursor:pointer;
            }
            button.danger:hover { background:#5a1a1a; }
          </style>
        </head>
        <body>
          <h1>Admin Gallery</h1>
          <div class="grid">${items}</div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[admin viewer] error:', err);
    res.status(500).send('Failed to load gallery');
  }
});

// ---------- Delete Route ----------
router.post('/delete/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT dropbox_path FROM images WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).send('Not found');
    }

    const dropboxPath = rows[0].dropbox_path;

    await client.query('DELETE FROM images WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');

    if (dropboxPath) {
      try {
        await deleteFile(dropboxPath);
      } catch (e) {
        console.warn('[admin delete] Dropbox delete failed:', e.message);
      }
    }

    res.redirect('/admin/viewer');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[admin delete] error:', err);
    res.status(500).send('Delete failed');
  } finally {
    client.release();
  }
});

export default router;
