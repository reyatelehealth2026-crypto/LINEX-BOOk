-- Migration 013: AI multimodal support (vision + image generation)
-- Run in Supabase SQL editor after 012_super_admins.sql

-- 1. Per-shop feature toggles in ai_settings
ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS vision_enabled     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS image_gen_enabled  boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN ai_settings.vision_enabled    IS 'Allow customers to send images for AI vision analysis';
COMMENT ON COLUMN ai_settings.image_gen_enabled IS 'Allow customers to request AI-generated preview images (costs more)';

-- 2. Storage bucket for AI-generated images
-- If this INSERT fails (pg_storage extension not available), create the bucket
-- manually: Supabase Dashboard → Storage → New bucket
--   Name: ai-generated  |  Public: ON  |  Max size: 5 MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-generated',
  'ai-generated',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies — public read, service-role write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'ai-generated public read'
  ) THEN
    CREATE POLICY "ai-generated public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'ai-generated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'ai-generated service role insert'
  ) THEN
    CREATE POLICY "ai-generated service role insert"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'ai-generated');
  END IF;
END $$;
