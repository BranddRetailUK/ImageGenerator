-- Add Dropbox mirror columns to images table (id, prompt, image_url already exist)
ALTER TABLE IF EXISTS public.images
  ADD COLUMN IF NOT EXISTS source_url TEXT,          -- original MiniMax URL
  ADD COLUMN IF NOT EXISTS dropbox_path TEXT,        -- e.g. /GG-Generator/2025-10-08/img-123.png
  ADD COLUMN IF NOT EXISTS dropbox_url  TEXT;        -- shared link (optional)

-- Optional: index for quick lookups
CREATE INDEX IF NOT EXISTS idx_images_dropbox_path ON public.images (dropbox_path);
