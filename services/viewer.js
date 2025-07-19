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
              width: 200px;
              height: auto;
              border-radius: 6px;
              margin-bottom: 0.8rem;
              cursor: pointer;
              box-shadow: 0 2px 10px rgba(0,0,0,0.4);
              transition: transform 0.2s ease;
            }

            .entry-image:hover {
              transform: scale(1.02);
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

            /* Modal */
            .modal {
              display: none;
              position: fixed;
              z-index: 1000;
              left: 0;
              top: 0;
              width: 100vw;
              height: 100vh;
              background-color: rgba(0, 0, 0, 0.8);
              justify-content: center;
              align-items: center;
            }

            .modal-content {
              max-width: 90%;
              max-height: 90%;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.6);
            }

            .modal-close {
              position: absolute;
              top: 20px;
              right: 30px;
              font-size: 2rem;
              color: #fff;
              cursor: pointer;
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
                <img class="entry-image" src="${row.image_url}" alt="Generated Image" onclick="openModal('${row.image_url}')"/>
                <button class="delete-btn" onclick="deleteImage(${row.id})">Delete</button>
              </div>
            `).join('')}
          </div>

          <!-- Modal -->
          <div id="imageModal" class="modal" onclick="closeModal()">
            <span class="modal-close" onclick="closeModal()">&times;</span>
            <img id="modalImage" class="modal-content" src="" />
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

            function openModal(imageUrl) {
              const modal = document.getElementById('imageModal');
              const modalImg = document.getElementById('modalImage');
              modalImg.src = imageUrl;
              modal.style.display = 'flex';
            }

            function closeModal() {
              const modal = document.getElementById('imageModal');
              modal.style.display = 'none';
              document.getElementById('modalImage').src = '';
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
