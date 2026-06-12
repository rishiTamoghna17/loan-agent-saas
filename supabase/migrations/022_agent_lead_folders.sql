-- Create lead_folders table for agent dashboard
-- Similar to prospect_folders but for agents

CREATE TABLE IF NOT EXISTS public.lead_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  parent_id UUID REFERENCES public.lead_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure folder names are unique per agent at each level
  UNIQUE (agent_id, name, parent_id)
);

-- Add folder_id column to leads table for agent folder organization
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.lead_folders(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_folders_agent_id ON public.lead_folders(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_folders_parent_id ON public.lead_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_leads_folder_id ON public.leads(folder_id);

-- Create audit log table for lead folder operations (optional, for tracking changes)
CREATE TABLE IF NOT EXISTS public.lead_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_audit_logs_agent_id ON public.lead_audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_audit_logs_created_at ON public.lead_audit_logs(created_at DESC);

DROP TRIGGER IF EXISTS set_lead_folders_updated_at ON public.lead_folders;
CREATE TRIGGER set_lead_folders_updated_at
BEFORE UPDATE ON public.lead_folders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lead_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can read own lead folders" ON public.lead_folders;
CREATE POLICY "Agents can read own lead folders"
ON public.lead_folders FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.agents
  WHERE agents.id = lead_folders.agent_id AND agents.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Agents can create own lead folders" ON public.lead_folders;
CREATE POLICY "Agents can create own lead folders"
ON public.lead_folders FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = lead_folders.agent_id AND agents.user_id = auth.uid()
  )
  AND (
    lead_folders.parent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.lead_folders parent
      WHERE parent.id = lead_folders.parent_id AND parent.agent_id = lead_folders.agent_id
    )
  )
);

DROP POLICY IF EXISTS "Agents can update own lead folders" ON public.lead_folders;
CREATE POLICY "Agents can update own lead folders"
ON public.lead_folders FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.agents
  WHERE agents.id = lead_folders.agent_id AND agents.user_id = auth.uid()
))
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = lead_folders.agent_id AND agents.user_id = auth.uid()
  )
  AND (
    lead_folders.parent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.lead_folders parent
      WHERE parent.id = lead_folders.parent_id AND parent.agent_id = lead_folders.agent_id
    )
  )
);

DROP POLICY IF EXISTS "Agents can delete own lead folders" ON public.lead_folders;
CREATE POLICY "Agents can delete own lead folders"
ON public.lead_folders FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.agents
  WHERE agents.id = lead_folders.agent_id AND agents.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Agents can read own lead audit logs" ON public.lead_audit_logs;
CREATE POLICY "Agents can read own lead audit logs"
ON public.lead_audit_logs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.agents
  WHERE agents.id = lead_audit_logs.agent_id AND agents.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Agents can create own lead audit logs" ON public.lead_audit_logs;
CREATE POLICY "Agents can create own lead audit logs"
ON public.lead_audit_logs FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.agents
  WHERE agents.id = lead_audit_logs.agent_id AND agents.user_id = auth.uid()
));
