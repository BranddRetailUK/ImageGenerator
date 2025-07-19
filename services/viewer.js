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
              max-width: 1000px;
              margin: auto;
            }
            h1 {
              color: #fff;
              margin-bottom: 2rem;
              font-size: 1.8rem;
            }
            .card {
              background: #1e1e1e;
              border-radius: 8px;
              padding: 1rem 1.5rem;
              margin-bottom: 2rem;
              box-shadow: 0 0 10px rgba(0,0,0,0.2);
              display: flex;
              flex-direction: column;
              align-items: flex-start;
            }
            .meta {
              font-size: 0.85rem;
              color: #999;
              margin-bottom: 0.5rem;
            }
            .prompt {
              font-size: 1rem;
              font-weight: 600;
              margin-bottom: 1rem;
              line-height: 1.4;
            }
            img {
              max-width: 100%;
              width: 400px;
              border-radius: 6px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.4);
            }
          </style>
        </head>
        <body>
          <h1>Generated Image Viewer</h1>
          ${rows.map(row => `
            <div class="card">
              <div class="meta">#${row.id} — ${new Date(row.created_at).toLocaleString()}</div>
              <div class="prompt">${row.prompt}</div>
              <img src="${row.image_url}" alt="Generated Image" />
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
