
CREATE TABLE pipelines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  status pipeline_status DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER pipelines_updated_at
BEFORE UPDATE ON pipelines
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE pipeline_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  pipeline_id uuid REFERENCES pipelines(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX pipeline_stages_pipeline_id_idx ON pipeline_stages(pipeline_id);

CREATE TRIGGER pipeline_stages_updated_at
BEFORE UPDATE ON pipeline_stages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE opportunities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  notes text,
  priority opportunity_priority,
  status opportunity_status DEFAULT 'open' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER opportunities_updated_at
BEFORE UPDATE ON opportunities
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE opportunity_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(opportunity_id, contact_id)
);

CREATE TABLE campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  type campaign_type NOT NULL,
  deadline date,
  status campaign_status DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE campaign_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  status campaign_contact_status DEFAULT 'pending' NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(campaign_id, contact_id)
);

CREATE TRIGGER campaign_contacts_updated_at
BEFORE UPDATE ON campaign_contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  description text,
  owner text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE project_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, contact_id)
);

CREATE TABLE project_opportunities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, opportunity_id)
);

CREATE TABLE field_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  airtable_field_id text,
  field_type text NOT NULL,
  scope_type text NOT NULL,
  scope_pod_id uuid REFERENCES pods(id) ON DELETE SET NULL,
  required boolean DEFAULT false NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER field_config_updated_at
BEFORE UPDATE ON field_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE _migration_id_map (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  airtable_id text NOT NULL,
  table_name text NOT NULL,
  supabase_uuid uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(airtable_id, table_name)
);

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pods_owner" ON pods FOR ALL USING (user_id = auth.uid());

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_owner" ON categories FOR ALL USING (user_id = auth.uid());

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_owner" ON companies FOR ALL USING (user_id = auth.uid());

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_owner" ON contacts FOR ALL USING (user_id = auth.uid());

ALTER TABLE contact_pods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_pods_owner" ON contact_pods FOR ALL USING (user_id = auth.uid());

ALTER TABLE contact_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_categories_owner" ON contact_categories FOR ALL USING (user_id = auth.uid());

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interactions_owner" ON interactions FOR ALL USING (user_id = auth.uid());

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipelines_owner" ON pipelines FOR ALL USING (user_id = auth.uid());

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_stages_owner" ON pipeline_stages FOR ALL USING (user_id = auth.uid());

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opportunities_owner" ON opportunities FOR ALL USING (user_id = auth.uid());

ALTER TABLE opportunity_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opportunity_contacts_owner" ON opportunity_contacts FOR ALL USING (user_id = auth.uid());

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_owner" ON campaigns FOR ALL USING (user_id = auth.uid());

ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_contacts_owner" ON campaign_contacts FOR ALL USING (user_id = auth.uid());

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_owner" ON projects FOR ALL USING (user_id = auth.uid());

ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_contacts_owner" ON project_contacts FOR ALL USING (user_id = auth.uid());

ALTER TABLE project_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_opportunities_owner" ON project_opportunities FOR ALL USING (user_id = auth.uid());

ALTER TABLE field_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_config_owner" ON field_config FOR ALL USING (user_id = auth.uid());

ALTER TABLE _migration_id_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "_migration_id_map_owner" ON _migration_id_map FOR ALL USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
