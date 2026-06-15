-- Migration: Add fields for dynamic agent website publishing and theme selection
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS role VARCHAR(255);
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS chosen_theme VARCHAR(255);
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS services JSONB;
