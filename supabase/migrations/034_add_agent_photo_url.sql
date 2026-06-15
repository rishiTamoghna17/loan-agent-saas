-- Migration: Add photo_url column to agents table for website builder
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS photo_url TEXT;
