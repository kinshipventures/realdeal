
CREATE TABLE public.contact_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, company_id)
);

CREATE INDEX idx_contact_companies_contact ON public.contact_companies(contact_id);
CREATE INDEX idx_contact_companies_company ON public.contact_companies(company_id);

ALTER TABLE public.contact_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_companies_workspace" ON public.contact_companies
  FOR ALL TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

-- Migrate existing company_id data
INSERT INTO public.contact_companies (contact_id, company_id, is_primary, user_id, workspace_id)
SELECT c.id, c.company_id, true, c.user_id, c.workspace_id
FROM public.contacts c
WHERE c.company_id IS NOT NULL
ON CONFLICT DO NOTHING;
