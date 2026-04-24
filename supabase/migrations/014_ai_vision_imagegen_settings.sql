-- Migration 014: Per-shop image-gen quota in ai_settings
-- Run after 013_ai_multimodal.sql
-- Note: vision_enabled and image_gen_enabled were already added in 013.
-- This migration adds the hourly quota column.

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS image_gen_per_hour int NOT NULL DEFAULT 3;

COMMENT ON COLUMN ai_settings.image_gen_per_hour IS 'Max AI image generations per user per hour (1-50)';
