-- Create prospects table
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  name text,
  company_name text,
  email text unique,
  phone text,
  
  city text,
  state text,
  
  loan_category text,
  
  linkedin_url text,
  website_url text,
  
  lead_score integer default 0,
  
  status text check (
    status in (
      'new',
      'contacted',
      'opened',
      'clicked',
      'replied',
      'demo_requested',
      'trial_started',
      'converted',
      'lost'
    )
  ) default 'new',
  
  notes text
);

-- Create email_campaigns table
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete cascade,
  
  campaign_name text,
  
  email_sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  
  message_id text,
  
  status text,
  
  created_at timestamptz default now()
);

-- Create website_visits table
create table if not exists public.website_visits (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete cascade,
  
  page_url text,
  user_agent text,
  ip_address text,
  
  created_at timestamptz default now()
);

-- Create conversions table
create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  
  conversion_type text,
  
  created_at timestamptz default now()
);

-- Add indexes for performance
create index if not exists prospects_email_idx on public.prospects(email);
create index if not exists prospects_status_idx on public.prospects(status);
create index if not exists prospects_lead_score_idx on public.prospects(lead_score);
create index if not exists email_campaigns_prospect_id_idx on public.email_campaigns(prospect_id);
create index if not exists website_visits_prospect_id_idx on public.website_visits(prospect_id);
create index if not exists conversions_prospect_id_idx on public.conversions(prospect_id);
create index if not exists conversions_agent_id_idx on public.conversions(agent_id);

-- Enable RLS
alter table public.prospects enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.website_visits enable row level security;
alter table public.conversions enable row level security;

-- Admin policies (assuming admin access is handled via service role or specific email check in app)
-- For now, let's allow all authenticated users to read if they are admins (we'll enforce this in app logic)
-- But for strict RLS, we'd need a way to check if user is admin.
-- Since the user specified ADMIN_EMAILS env, we'll likely use service role for admin operations or custom claims.
-- For simplicity in this environment, I'll add policies that check for admin emails if I can, 
-- but usually admin dashboards use service_role to bypass RLS.

-- Updated at trigger for prospects
drop trigger if exists set_prospects_updated_at on public.prospects;
create trigger set_prospects_updated_at
before update on public.prospects
for each row execute function public.set_updated_at();
