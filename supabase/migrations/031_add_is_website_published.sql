-- Migration: Add website publishing tracking column
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS is_website_published BOOLEAN DEFAULT FALSE;
