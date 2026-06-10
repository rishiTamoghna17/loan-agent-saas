-- Add pdf_urls column as an array to support multiple documents
alter table public.campaign_templates
  add column if not exists pdf_urls text[] default '{}';

-- Migrate existing pdf_url to pdf_urls if applicable
update public.campaign_templates
set pdf_urls = array[pdf_url]
where pdf_url is not null and (pdf_urls is null or array_length(pdf_urls, 1) is null);
