CREATE TABLE share_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  pod_id uuid REFERENCES pods(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE,
  excluded_contact_ids uuid[] DEFAULT '{}' NOT NULL,
  visible_columns text[] DEFAULT '{name,role,company,pod}' NOT NULL,
  expires_at timestamptz NOT NULL,
  pin_hash text,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX share_links_token_idx ON share_links(token);
CREATE INDEX share_links_pod_id_idx ON share_links(pod_id);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own share links
CREATE POLICY share_links_authenticated ON share_links
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Anonymous users can SELECT share links by token (for public page)
CREATE POLICY share_links_public_read ON share_links
  FOR SELECT TO anon
  USING (token IS NOT NULL);

-- Anonymous users need to read contacts for shared views
CREATE POLICY contacts_anon_read ON contacts
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM share_links sl
      JOIN contact_pods cp ON cp.pod_id = sl.pod_id AND cp.contact_id = contacts.id
      WHERE sl.revoked_at IS NULL
        AND sl.expires_at > now()
        AND NOT (contacts.id = ANY(sl.excluded_contact_ids))
    )
  );

CREATE POLICY contact_pods_anon_read ON contact_pods
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM share_links sl
      WHERE sl.pod_id = contact_pods.pod_id
        AND sl.revoked_at IS NULL
        AND sl.expires_at > now()
    )
  );

CREATE POLICY pods_anon_read ON pods
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM share_links sl
      WHERE sl.pod_id = pods.id
        AND sl.revoked_at IS NULL
        AND sl.expires_at > now()
    )
  );
