// server/services/viewer.js
import express from 'express';
import pkg from 'pg';

const router = express.Router();
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.get('/viewer', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, prompt, created_at, image_url
      FROM images
      ORDER BY created_at DESC
    `);

    const rows = result.rows;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Image Viewer</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #121212;
              color: #f1f1f1;
              padding: 2rem;
            }
            h1 { color: #fff; }
            .card {
              background: #1e1e1e;
              border-radius: 8px;
              padding: 1rem;
              margin-bottom: 2rem;
              box-shadow: 0 0 6px rgba(255,255,255,0.05);
            }
            img {
              max-width: 100%;
              border-radius: 6px;
              margin-top: 0.5rem;
            }
            .prompt { font-size: 1.1rem; font-weight: bold; }
            .meta { font-size: 0.85rem; color: #999; margin-bottom: 0.5rem; }
          </style>
        </head>
        <body>
          <h1>Generated Image Viewer</h1>
          ${rows.map(row => `
            <div class="card">
              <div class="meta">#${row.id} — ${new Date(row.created_at).toLocaleString()}</div>
              <div class="prompt">${row.prompt}</div>
              <img src="${row.image_url}" alt="Generated Image" style="width: 50%;" />
            </div>
          `).join('')}
        </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error('❌ Error rendering viewer:', err);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
