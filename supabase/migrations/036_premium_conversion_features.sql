-- Migration: Add premium conversion features columns
-- 1. Add licensing_info to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS licensing_info VARCHAR(255);

-- 2. Add documents column to leads table (text array to hold secure document paths)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS documents TEXT[] DEFAULT ARRAY[]::text[];

-- 3. Ensure the leads table is part of the supabase_realtime publication
-- First, try to add it, ignoring if already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback/silence if publication structure is handled differently
    NULL;
END $$;

-- 4. Create storage bucket for secure documents in storage schema if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'secured-docs', 
  'secured-docs', 
  false, -- private bucket
  10485760, -- 10MB size limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;
