-- Migration: Auto-generate clean website slug on agent signup
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS website_slug VARCHAR(255) UNIQUE;

-- Create an automation function to slugify the agent's name on insert
CREATE OR REPLACE FUNCTION public.set_default_agent_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug VARCHAR(255);
    final_slug VARCHAR(255);
    counter INT := 1;
BEGIN
    -- Lowercase, replace spaces and special characters with hyphens
    -- Modified from full_name to agent_name to align with the schema of the agents table
    base_slug := LOWER(REGEXP_REPLACE(NEW.agent_name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Trim hyphens from ends
    base_slug := TRIM(BOTH '-' FROM base_slug);
    
    final_slug := base_slug;
    
    -- Loop constraint check to make sure the subdomain slug is strictly unique
    WHILE EXISTS (SELECT 1 FROM public.agents WHERE website_slug = final_slug) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    NEW.website_slug := final_slug;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute before account creation
DROP TRIGGER IF EXISTS trigger_auto_slugify_agent_name ON public.agents;
CREATE TRIGGER trigger_auto_slugify_agent_name
BEFORE INSERT ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.set_default_agent_slug();
