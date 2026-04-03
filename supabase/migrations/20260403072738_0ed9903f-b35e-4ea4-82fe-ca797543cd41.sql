
CREATE TABLE public.share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pod_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  excluded_contact_ids UUID[] NOT NULL DEFAULT '{}',
  visible_columns TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  pin_hash TEXT,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own share links"
ON public.share_links
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view valid share links by token"
ON public.share_links
FOR SELECT
TO anon
USING (revoked_at IS NULL AND expires_at > now());

CREATE INDEX idx_share_links_token ON public.share_links (token);
CREATE INDEX idx_share_links_pod_id ON public.share_links (pod_id);
