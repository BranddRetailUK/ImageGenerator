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
              max-width: 1400px;
              margin: auto;
            }

            h1 {
              color: #fff;
              margin-bottom: 1rem;
              font-size: 1.8rem;
            }

            #toggle-btn {
              margin-bottom: 2rem;
              padding: 0.5rem 1rem;
              border: none;
              background: #333;
              color: #f1f1f1;
              border-radius: 6px;
              cursor: pointer;
              transition: background 0.2s ease;
            }

            #toggle-btn:hover {
              background: #555;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 1.5rem;
            }

            .card {
              background: #1e1e1e;
              border-radius: 8px;
              padding: 1rem 1.2rem;
              box-shadow: 0 0 10px rgba(0,0,0,0.2);
              display: flex;
              flex-direction: column;
              align-items: flex-start;
            }

            .meta {
              font-size: 0.85rem;
              color: #999;
              margin-bottom: 0.4rem;
            }

            .prompt {
              font-size: 1rem;
              font-weight: 600;
              margin-bottom: 0.8rem;
              line-height: 1.4;
            }

            .entry-image {
              max-width: 100%;
              width: 100%;
              border-radius: 6px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.4);
              margin-bottom: 0.8rem;
            }

            .delete-btn {
              background: #902020;
              color: white;
              border: none;
              padding: 0.4rem 0.9rem;
              border-radius: 5px;
              cursor: pointer;
              transition: background 0.2s ease;
            }

            .delete-btn:hover {
              background: #bb3e3e;
            }
          </style>
        </head>
        <body>
          <h1>Generated Image Viewer</h1>
          <button id="toggle-btn" onclick="toggleImages()">Hide Images</button>

          <div class="grid">
            ${rows.map(row => `
              <div class="card" id="card-${row.id}">
                <div class="meta">#${row.id} — ${new Date(row.created_at).toLocaleString()}</div>
                <div class="prompt">${row.prompt}</div>
                <img class="entry-image" src="${row.image_url}" alt="Generated Image" />
                <button class="delete-btn" onclick="deleteImage(${row.id})">Delete</button>
              </div>
            `).join('')}
          </div>

          <script>
            function toggleImages() {
              const images = document.querySelectorAll('.entry-image');
              const toggleBtn = document.getElementById('toggle-btn');
              const currentlyVisible = images[0]?.style.display !== 'none';

              images.forEach(img => {
                img.style.display = currentlyVisible ? 'none' : 'block';
              });

              toggleBtn.textContent = currentlyVisible ? 'Show Images' : 'Hide Images';
            }

            async function deleteImage(id) {
              if (!confirm('Are you sure you want to delete image #' + id + '?')) return;

              const res = await fetch('/admin/delete/' + id, { method: 'DELETE' });

              if (res.ok) {
                document.getElementById('card-' + id).remove();
              } else {
                alert('Failed to delete image.');
              }
            }
          </script>
        </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error('❌ Error rendering viewer:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM images WHERE id = $1', [id]);
    res.status(200).send('Deleted');
  } catch (err) {
    console.error('❌ Delete Error:', err);
    res.status(500).send('Failed to delete image');
  }
});

export default router;
