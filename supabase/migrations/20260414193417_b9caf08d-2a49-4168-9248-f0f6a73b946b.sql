-- Add custom_fields to campaign_contacts
ALTER TABLE public.campaign_contacts ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- Add custom_fields to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;