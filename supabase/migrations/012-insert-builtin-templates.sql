-- Alter campaign_templates id column to text type instead of uuid
-- to support string ids like 'intro', 'demo', etc.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'campaign_templates'
      and column_name = 'id'
      and data_type = 'uuid'
  ) then
    -- Create temporary column
    alter table public.campaign_templates add column id_temp text;
    
    -- Copy existing uuids to temp column
    update public.campaign_templates set id_temp = id::text;
    
    -- Drop primary key first
    alter table public.campaign_templates drop constraint if exists campaign_templates_pkey;
    
    -- Drop old uuid column
    alter table public.campaign_templates drop column id;
    
    -- Rename temp to id
    alter table public.campaign_templates rename column id_temp to id;
    
    -- Add primary key on text id
    alter table public.campaign_templates add primary key (id);
  end if;
end $$;

-- Add description column if missing
alter table public.campaign_templates
  add column if not exists description text;

-- Insert 4 built-in templates
insert into public.campaign_templates (id, name, subject, content, description, brochure_attached, pdf_urls)
values
  ('intro', 'Introduction', 'Grow your loan business with LeadHub', '<p>Hi {{name}},</p><p>I work with loan agents and DSAs who want to manage enquiries more professionally.</p><p>Many agents still manage leads through WhatsApp chats, notebooks, and spreadsheets. LeadHub gives you a simple system to capture enquiries, track follow-ups, and contact customers faster.</p><ul><li>Your own loan website</li><li>Lead capture form</li><li>WhatsApp-ready CRM</li><li>Follow-up tracking</li><li>14-day free trial</li></ul><p>You can see the demo here: <a href="{{demo_url}}">Open LeadHub demo</a></p><p>Start your free trial here: <a href="{{signup_url}}">Create your LeadHub account</a></p><p>Regards,<br />{{sender_name}}<br />{{sender_phone}}<br />{{sender_email}}</p>', 'First outreach for DSAs and loan agents who need a website plus CRM.', false, '{}'),
  ('demo', 'Demo Invitation', 'Quick LeadHub demo for your loan enquiries', '<p>Hi {{name}},</p><p>I wanted to share a quick demo of LeadHub for {{company_name}}.</p><p>It shows how a customer can visit your loan website, submit an enquiry, and how you can follow up from one dashboard instead of searching through chats.</p><p><a href="{{demo_url}}">View the LeadHub demo</a></p><p>If this looks useful, you can start the 14-day free trial here: <a href="{{signup_url}}">Start free trial</a></p><p>Regards,<br />{{sender_name}}<br />{{sender_phone}}</p>', 'Invite a prospect to open the live demo and see the workflow.', false, '{}'),
  ('trial', 'Trial Reminder', 'Start your 14-day LeadHub trial', '<p>Hi {{name}},</p><p>If you are still managing loan enquiries manually, LeadHub can help you keep every lead, note, source, and follow-up in one place.</p><p>Your trial includes a public loan website, lead form, WhatsApp contact buttons, CRM dashboard, source tracking, and CSV export.</p><p>Start your free 14-day trial here: <a href="{{signup_url}}">Create your LeadHub account</a></p><p>You can also check the demo first: <a href="{{demo_url}}">Open demo</a></p><p>Regards,<br />{{sender_name}}<br />{{sender_phone}}<br />{{sender_email}}</p>', 'Encourage a warm prospect to start the working free trial.', false, '{}'),
  ('followup', 'Follow-up', 'Following up on LeadHub for your loan business', '<p>Hi {{name}},</p><p>Just following up on LeadHub.</p><p>It is built for loan agents and small DSA teams who want a professional website, structured enquiries, and a simple follow-up dashboard.</p><p>If you want, you can review the demo here: <a href="{{demo_url}}">LeadHub demo</a></p><p>Free trial signup: <a href="{{signup_url}}">Start your 14-day trial</a></p><p>Regards,<br />{{sender_name}}<br />{{sender_phone}}</p>', 'Gentle follow-up after a prior message or demo share.', false, '{}')
on conflict (id) do nothing;
