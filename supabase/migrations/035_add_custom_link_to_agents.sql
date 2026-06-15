-- Migration: Add custom_link column to agents table for premium custom domain mapping
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS custom_link VARCHAR(255) UNIQUE;
