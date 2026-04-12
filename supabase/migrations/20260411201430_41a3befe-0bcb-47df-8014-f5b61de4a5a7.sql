
-- Add missing columns to campaign_contacts for kanban board functionality
ALTER TABLE public.campaign_contacts
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS next_step_due date,
  ADD COLUMN IF NOT EXISTS moved_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS owner text;

-- Add description column to campaigns for campaign goals/context
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS description text;

-- Index for fast stage lookups
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_stage_id ON public.campaign_contacts(stage_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_moved_at ON public.campaign_contacts(moved_at);
