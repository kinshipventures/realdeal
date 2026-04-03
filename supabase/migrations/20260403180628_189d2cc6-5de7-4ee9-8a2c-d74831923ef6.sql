
-- Gmail sync state table for incremental sync tracking
CREATE TABLE public.gmail_sync_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_history_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.gmail_sync_state ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sync state
CREATE POLICY "gmail_sync_state_owner" ON public.gmail_sync_state
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_gmail_sync_state_updated_at
  BEFORE UPDATE ON public.gmail_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
