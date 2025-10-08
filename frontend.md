<body>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GG APPAREL | LOGO GENERATOR</title>

  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&amp;display=swap" rel="stylesheet">

<style>
  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Poppins', sans-serif;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: url('https://cdn.shopify.com/s/files/1/0841/7545/4535/files/PAGE_BG.webp?v=1753300137') center center / cover no-repeat;
    z-index: -1;
    transform: translateZ(0);
    will-change: transform;
    background-attachment: fixed;
  }

  .page-wrapper {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 30vh;
    padding: 0.6rem;
  }

  @keyframes glow {
    from {
      text-shadow: 0 0 4px #facc15, 0 0 7px #facc15;
      opacity: 0.7;
    }
    to {
      text-shadow: 0 0 8px #facc15, 0 0 14px #facc15;
      opacity: 1;
    }
  }

  @keyframes pulseSize {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.035); }
    100% { transform: scale(1); }
  }

  .bgBtn {
    flex: 1;
    padding: 0.6rem;
    font-size: 0.95rem;
    font-weight: 600;
    border: none;
    border-radius: 0.6rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: none;
  }

  .whiteBtn {
    background-color: white;
    color: black;
  }

  .blackBtn {
    background-color: black;
    color: white;
  }

  .bgBtn.active {
    animation: glow 1.2s ease-in-out infinite alternate;
    box-shadow: 0 0 10px #facc15, 0 0 20px #facc15;
  }

  .refreshBtn {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    color: black;
    background: white;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
  }

  @media (max-width: 640px) {
    #hailuo-ui {
      padding: 2rem !important;
      margin: 2rem auto 2rem !important;
    }

    .bgBtn {
      width: 100%;
    }
  }

  .credit-display {
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: #facc15;
  }

  .qtyBtn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid white;
    background: transparent;
    color: white;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s, color 0.2s;
  }

  .qtyBtn.selected {
    background-color: #facc15;
    color: black;
    font-weight: bold;
  }

  /* Tabs for generator mode */
  .tabBtn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.6rem;
    background: transparent;
    color: white;
    font-weight: 600;
    border: 2px solid white;
    cursor: pointer;
    transition: background 0.3s, color 0.3s;
  }

  .tabBtn:hover {
    background: #facc15;
    color: black;
  }

  .activeTab {
    background: #facc15;
    color: black;
    box-shadow: 0 0 10px #facc15;
  }

  /* Responsive grid */
  @media (max-width: 768px) {
    #recentImagesGrid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @keyframes boxPulse {
    0%   { box-shadow: 0 0 0px rgba(255, 255, 255, 0); }
    50%  { box-shadow: 0 0 25px rgba(255, 255, 255, 0.25); }
    100% { box-shadow: 0 0 0px rgba(255, 255, 255, 0); }
  }

  @keyframes whiteFlash {
    0%   { background-color: #1e293b; }
    40%, 100% { background-color: #ffffff; }
  }

  #loadingOverlay span {
    color: #facc15;
    font-weight: 600;
    font-size: 1rem;
    text-shadow: 0 0 4px #facc15, 0 0 8px #fffff;
    animation: glow 1s ease-in-out infinite alternate;
  }
</style>


<div class="page-wrapper">
  <div id="hailuo-ui" style="max-width: 800px; width: 100%; background: linear-gradient(to top, #0d0d0d, #1b1b1b); padding: 2rem; border-radius: 1.5rem; color: #334155; display: flex; flex-direction: column; border: 2px solid white; box-shadow: 0 0 15px 6px rgba(255, 255, 255, 0.25);">



<!-- Generator Tabs -->
<div class="tab-container" style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem;">
  <button id="imageTab" class="tabBtn activeTab" style="flex: 1 1 150px; max-width: 250px;">Image Generator</button>

  <button id="videoTab" class="tabBtn" style="flex: 1 1 150px; max-width: 250px; position: relative;">
    Video Generator
    <span style="
      position: absolute;
      top: -1.1rem;
      left: 50%;
      transform: translateX(-50%);
      font-size: 1rem;
      font-weight: 800;
      color: #facc15;
      text-shadow: 0 0 3px black;
      pointer-events: none;
    ">COMING SOON</span>
  </button>
</div>

<!-- Video Generator Page Placeholder -->
<div id="videoPage" style="display: none; text-align: center; padding: 2rem;">
  <h2 style="
    font-size: clamp(1.8rem, 6vw, 3rem);
    color: white;
    font-weight: 900;
    line-height: 1.2;
    margin-bottom: 2rem;
    word-break: break-word;
  ">
    🎞️ VIDEO GENERATOR
  </h2>

  <div style="
    background-color: #1e293b;
    color:rgb(255, 255, 255);
    font-weight: 700;
    font-size: 1.1rem;
    padding: 1.5rem 2rem;
    border-radius: 1rem;
    border: 2px dashed #facc15;
    display: inline-block;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
  ">
    🚧 COMING SOON 🚧
  </div>
</div>




<!-- Image Generator UI -->
<div id="image-ui">

  <!-- Prompt Input (Full Width) -->
  <div style="width: 100%; margin-top: 1rem;">
    <textarea
      id="promptInput"
      placeholder="e.g. modern gaming logo"
      style="width: 100%; min-height: 120px; padding: 1rem; border-radius: 10px; border: none; background-color: #1a2238; color: white; font-size: 1rem; resize: none; box-sizing: border-box;"
    ></textarea>
  </div>

  <!-- Prompt Controls (Slightly Narrower) -->
  <div style="margin: 1rem auto 0 auto; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; width: 90%;">
    <!-- Quantity Selector (Buttons) -->
    <div style="flex: 1;">
      <label style="color: white; font-weight: 600;">Quantity:</label>
      <div id="quantityButtons" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
        <button type="button" class="qtyBtn selected" data-value="1">1</button>
        <button type="button" class="qtyBtn" data-value="2">2</button>
        <button type="button" class="qtyBtn" data-value="3">3</button>
        <button type="button" class="qtyBtn" data-value="4">4</button>
        <button type="button" class="qtyBtn" data-value="5">5</button>
        <button type="button" class="qtyBtn" data-value="6">6</button>
      </div>
    </div>

    <!-- Aspect Ratio Dropdown -->
    <div style="flex: 1;">
      <label for="aspectRatio" style="color: white; font-weight: 600;">Aspect Ratio:</label>
      <select id="aspectRatio" style="width: 100%; padding: 0.5rem; border-radius: 0.5rem; font-weight: 600;">
        <option value="1:1" selected>1:1 (Square)</option>
        <option value="16:9">16:9 (Widescreen)</option>
        <option value="3:4">3:4 (Portrait)</option>
        <option value="4:3">4:3 (Classic)</option>
      </select>
    </div>
  </div>

  <!-- Generate button -->
  <button id="generateBtn" style="margin-top: 1.5rem; width: 100%; background: linear-gradient(to right, #BDA527, #f8b500); color: white; font-weight: 600; padding: 1rem; font-size: 1.1rem; border: none; border-radius: 0.75rem; cursor: pointer;">
    ✨ Generate ✨
  </button>

  <!-- Background selection buttons -->
  <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: center;">
    <button class="bgBtn whiteBtn" id="whiteBgBtn">White Background</button>
    <button class="bgBtn blackBtn" id="blackBgBtn">Black Background</button>
  </div>

  <!-- Progress bar -->
  <div id="progressBarContainer" style="width: 100%; height: 12px; background: #1e293b; border-radius: 4px; overflow: hidden; margin-top: 1rem; display: none;">
    <div id="progressBar" style="height: 100%; width: 0%; background: linear-gradient(to right, #7c3aed, #c026d3); transition: width 0.4s ease;"></div>
  </div>

  <!-- Placeholder Box -->
  <div id="previewPlaceholder" style="width: 100%; background-color: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; min-height: 320px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-top: 2rem;">
    <span style="color: #ffffff; font-weight: 700;">Generated artwork will appear here</span>
  </div>

  <!-- Loading Overlay -->
  <div id="loadingOverlay" style="position: fixed; width: 100vw; height: 100vh; top: 0; left: 0; display: none; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.8); z-index: 9999;">
    <span style="color: #facc15; font-weight: 600; font-size: 1rem; text-shadow: 0 0 4px #facc15, 0 0 8px #facc15; animation: glow 1.2s ease-in-out infinite alternate;">
      ✨ Generating preview...
    </span>
  </div>

  <!-- Save instructions -->
  <p id="saveInstructions" style="display: none; margin-top: 1.5rem; font-size: 0.95rem; font-weight: 500; text-align: center; color: #facc15;">
    ✅ Image ready! Right-click and choose <strong>"Save image as..."</strong> on desktop.<br>Hold on the image to save on mobile.
  </p>

  <!-- Refresh button -->
  <div style="margin-top: 1.5rem; text-align: center;">
    <button class="refreshBtn" onclick="window.location.reload();">
      Generate Again
    </button>
  </div>

  <!-- Variant Grid -->
  <div id="variantGridWrapper" style="max-width: 1200px; margin: 2rem auto 3rem; padding: 0 1rem;">
    <div id="variantGrid" style="display: none; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.25rem;">
      <!-- Injected images appear here -->
    </div>
  </div>

  <!-- Recent Image Grid -->
  <div id="recentGridWrapper" style="max-width: 1200px; margin: 1.5rem auto 3rem; padding: 0 1rem;">
    <div style="text-align: center; margin-bottom: 0.25rem;">
      <h3 style="color: white; font-weight: 700; font-size: 1.3rem; margin-bottom: 0;">Recent Artwork</h3>
      <h3 style="color: #facc15; font-weight: 500; font-size: 0.95rem; margin-top: 0.3rem;">(Click to Enlarge)</h3>
    </div>
    <div id="recentImagesGrid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-top: 1rem;"></div>
  </div>

  <!-- Image Modal -->
  <div id="imageModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); justify-content:center; align-items:center; z-index:9999;">
    <img id="modalImage" src="" alt="Preview" style="max-width:90%; max-height:90%; border-radius:0.75rem; box-shadow:0 0 30px rgba(255,255,255,0.25);">
  </div>

</div> <!-- END #image-ui -->

<div id="video-ui" style="display: none; width: 100%; text-align: center; padding: 4rem 2rem;">
  <h2 style="color: white; font-size: 2.8rem; font-weight: 900; margin-bottom: 0.75rem; letter-spacing: 1px;">🎞️ VIDEO GENERATION</h2>
  <div style="display: inline-block; padding: 0.75rem 1.5rem; border: 2px dashed #facc15; border-radius: 1rem; background-color: #1a2238; color: #facc15; font-size: 1.25rem; font-weight: 700; box-shadow: 0 0 10px rgba(250, 204, 21, 0.3);">
    🚧 COMING SOON 🚧
  </div>
</div>
ß













<script>
  const whiteBgBtn = document.getElementById('whiteBgBtn');
  const blackBgBtn = document.getElementById('blackBgBtn');
  let selectedBg = '';

  function updateBgSelection(color) {
    selectedBg = color;
    whiteBgBtn.classList.remove('active');
    blackBgBtn.classList.remove('active');
    if (color === 'white') whiteBgBtn.classList.add('active');
    if (color === 'black') blackBgBtn.classList.add('active');
  }

  whiteBgBtn.addEventListener('click', () => updateBgSelection('white'));
  blackBgBtn.addEventListener('click', () => updateBgSelection('black'));

  const generateBtn = document.getElementById('generateBtn');
  const promptInput = document.getElementById('promptInput');
  const generatedImage = document.getElementById('generatedImage');
  const placeholderText = document.getElementById('placeholderText');
  const progressBarContainer = document.getElementById('progressBarContainer');
  const progressBar = document.getElementById('progressBar');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const saveInstructions = document.getElementById('saveInstructions');

  function startProgress() {
    progressBar.style.width = '0%';
    progressBarContainer.style.display = 'block';
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() < 0.3 ? 6 : 1;
      progressBar.style.width = Math.min(progress, 95) + '%';
      if (progress >= 95) clearInterval(interval);
    }, 800);
  }

  function completeProgress() {
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBarContainer.style.display = 'none';
    }, 1000);
  }

  generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    let promptSuffix = '';
    if (selectedBg === 'white') promptSuffix = ' Create on white background.';
    else if (selectedBg === 'black') promptSuffix = ' Create on black background.';
    const fullPrompt = `${prompt.replace(/\.*$/, '')}.${promptSuffix}`;

    // Hide placeholder and reset UI
    document.getElementById('previewPlaceholder').style.display = 'none';
    document.getElementById('variantGrid').style.display = 'grid';
    document.getElementById('variantGrid').innerHTML = '';
    loadingOverlay.style.display = 'flex';
    saveInstructions.style.display = 'none';
    startProgress();

    const aspect = document.getElementById('aspectRatio').value;
    const selectedQtyBtn = document.querySelector('.qtyBtn.selected');
    const numImages = parseInt(selectedQtyBtn?.getAttribute('data-value')) || 1;

    try {
      const res = await fetch('https://imagegenerator-production-1fac.up.railway.app/generate-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          num_images: numImages,
          aspect_ratio: aspect
        })
      });

      const data = await res.json();
      completeProgress();
      loadingOverlay.style.display = 'none';
      saveInstructions.style.display = 'block';

      const urls = Array.isArray(data.urls) ? data.urls : [data.mockupUrl];

      urls.forEach(url => {
        const container = document.createElement('div');
        container.style.background = '#1e293b';
        container.style.border = '1px solid #334155';
        container.style.borderRadius = '0.75rem';
        container.style.padding = '0.5rem';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';

        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Generated variant';
        img.classList.add('generated-img');
        img.style.width = '100%';
        img.style.borderRadius = '0.5rem';
        img.style.marginBottom = '0.5rem';
        img.style.cursor = 'zoom-in';

        container.appendChild(img);
        document.getElementById('variantGrid').appendChild(container);
      });

    } catch (err) {
      completeProgress();
      loadingOverlay.style.display = 'none';
      console.error('❌ Generation request failed:', err);
    }
  });

  // Quantity selector button logic
  document.querySelectorAll('.qtyBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qtyBtn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Expand image modal
  const imageModal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');

  document.addEventListener('click', (e) => {
    const isRecent = e.target.matches('#recentImagesGrid img');
    const isVariant = e.target.matches('#variantGrid img');

    if (isRecent || isVariant) {
      modalImage.src = e.target.src;
      imageModal.style.display = 'flex';
    } else if (e.target === imageModal) {
      imageModal.style.display = 'none';
      modalImage.src = '';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      imageModal.style.display = 'none';
      modalImage.src = '';
    }
  });

  // Load recent image grid
  async function loadRecentImages() {
    try {
      const res = await fetch('https://imagegenerator-production-1fac.up.railway.app/api/recent-images');
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const shuffled = data.sort(() => 0.5 - Math.random());
      const images = shuffled.slice(0, 16);

      const grid = document.getElementById('recentImagesGrid');
      grid.innerHTML = '';

      images.forEach(img => {
        const imgEl = document.createElement('img');
        imgEl.src = img.url;
        imgEl.alt = 'Recent generated artwork';
        imgEl.style.width = '100%';
        imgEl.style.aspectRatio = '1 / 1';
        imgEl.style.borderRadius = '0.5rem';
        imgEl.style.objectFit = 'cover';
        imgEl.style.border = '1px solid #334155';
        imgEl.style.boxShadow = '0 0 6px rgba(0,0,0,0.3)';
        grid.appendChild(imgEl);
      });
    } catch (err) {
      console.error('❌ Failed to load recent images:', err);
    }
  }

  loadRecentImages();

  // Tab switching logic
  const imageTab = document.getElementById('imageTab');
  const videoTab = document.getElementById('videoTab');
  const imageUI = document.getElementById('image-ui');
  const videoUI = document.getElementById('video-ui');

  imageTab.addEventListener('click', () => {
    imageTab.classList.add('activeTab');
    videoTab.classList.remove('activeTab');
    imageUI.style.display = 'block';
    videoUI.style.display = 'none';
  });

  videoTab.addEventListener('click', () => {
    videoTab.classList.add('activeTab');
    imageTab.classList.remove('activeTab');
    imageUI.style.display = 'none';
    videoUI.style.display = 'block';
  });
</script>


</body>