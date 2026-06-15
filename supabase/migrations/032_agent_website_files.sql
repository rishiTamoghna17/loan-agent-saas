-- Migration: Create table to store compiled agent website files
CREATE TABLE IF NOT EXISTS public.agent_website_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_content TEXT NOT NULL, -- Base64 encoded file content
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_agent_file UNIQUE (agent_id, file_path)
);

-- Index for fast retrieval by agent and path
CREATE INDEX IF NOT EXISTS idx_agent_website_files_lookup 
ON public.agent_website_files(agent_id, file_path);

-- Enable RLS
ALTER TABLE public.agent_website_files ENABLE ROW LEVEL SECURITY;

-- Allow public read access to website files so anyone can view the websites
CREATE POLICY "Allow public read access to agent website files" 
ON public.agent_website_files 
FOR SELECT 
USING (true);
