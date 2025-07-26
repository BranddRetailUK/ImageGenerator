// minimax.js
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

export async function generateMiniMaxMockup(prompt, filePath = null, numImages = 1) {
  console.log('[MiniMax] Prompt:', prompt);
  if (filePath) console.log('[MiniMax] Using reference image:', filePath);

  const form = new FormData();
  form.append('model', 'image-01');
  form.append('prompt', prompt);
  form.append('aspect_ratio', '1:1');
  form.append('response_format', 'url');
  form.append('n', String(numImages)); // ✅ use input value
  form.append('prompt_optimizer', 'true');

  if (filePath) {
    form.append('subject_reference[0]', fs.createReadStream(filePath));
  }

  try {
    const response = await fetch('https://api.minimax.io/v1/image_generation', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });

    const data = await response.json();

    if (!response.ok || !data?.data?.image_urls?.length) {
      console.error('[MiniMax Error]', JSON.stringify(data, null, 2));
      throw new Error(data?.base_resp?.message || 'Image generation failed');
    }

    const urls = data.data.image_urls;
    console.log('[MiniMax] Generated URLs:', urls);
    return urls;
  } catch (error) {
    console.error('[MiniMax Request Error]', error);
    throw error;
  }
}

