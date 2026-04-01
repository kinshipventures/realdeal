-- Schema spec for Lovable execution. Feed this to Lovable to create all tables in Supabase.
-- Phase 22: Airtable to Supabase Data Migration
-- Generated: 2026-04-01

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE cadence AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly');
CREATE TYPE interaction_type AS ENUM ('call', 'email', 'text', 'meeting', 'intro', 'note', 'pod_change', 'field_update', 'categorization', 'pipeline_event', 'project_event', 'merge_event');
CREATE TYPE relationship_type AS ENUM ('Contact', 'Company');
CREATE TYPE relationship_status AS ENUM ('Active', 'Pending', 'Archived');
CREATE TYPE pipeline_status AS ENUM ('active', 'hidden');
CREATE TYPE opportunity_status AS ENUM ('open', 'won', 'lost', 'archived');
CREATE TYPE opportunity_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE campaign_type AS ENUM ('event', 'investment', 'outreach', 'other');
CREATE TYPE campaign_contact_status AS ENUM ('pending', 'reached', 'responded', 'confirmed');
CREATE TYPE campaign_status AS ENUM ('active', 'completed');
CREATE TYPE global_region AS ENUM ('AMER', 'APAC', 'ME', 'LATAM', 'EU');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Non-binary', 'Other');
CREATE TYPE contact_frequency AS ENUM ('Weekly', 'Monthly', 'Quarterly', 'Annual', 'As Needed');
CREATE TYPE owner_type AS ENUM ('moj_mahdara', 'kinship_ventures');
CREATE TYPE interaction_source AS ENUM ('Gmail', 'Granola', 'Manual');

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLES (FK dependency order)
-- ============================================================

-- 1. pods (was: Lists)
CREATE TABLE pods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  color text,
  owner owner_type,
  is_priority boolean DEFAULT false NOT NULL,
  cadence cadence,
  description text,
  capacity integer,
  enrichment_opt_in boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER pods_updated_at
  BEFORE UPDATE ON pods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. categories
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  pod_id uuid REFERENCES pods(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. companies (split from contacts where type='Company')
CREATE TABLE companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  industry text,
  stage text,
  ticker text,
  domain text,
  website text,
  location text,
  notes text,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. contacts
CREATE TABLE contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  first_name text,
  last_name text,
  email text,
  email_2 text,
  email_3 text,
  phone text,
  company text,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  role text,
  location text,
  website text,
  linkedin text,
  country text,
  global_region global_region,
  gender gender_type,
  notes text,
  recommended_by text,
  introduced_by text,
  specialization text,
  past_clients text,
  -- birthday kept as text: stores MM/DD or YYYY-MM-DD from Airtable
  birthday text,
  milestones text,
  interests text,
  relationship_context text,
  intel_notes text,
  relationship_owner text,
  contact_frequency contact_frequency,
  next_follow_up_date date,
  next_action text,
  kv_fund_investor text[],
  spv_investor text[],
  needs_review boolean DEFAULT false NOT NULL,
  last_contacted_at date,
  cadence_override cadence,
  type relationship_type DEFAULT 'Contact' NOT NULL,
  status relationship_status DEFAULT 'Active' NOT NULL,
  -- company-type fields duplicated on contacts per existing types.ts interface
  industry text,
  stage text,
  ticker text,
  domain text,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Performance indexes
CREATE INDEX contacts_user_id_idx ON contacts(user_id);       -- RLS performance
CREATE INDEX contacts_last_contacted_at_idx ON contacts(last_contacted_at); -- overdue queries

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. contact_pods (junction: contacts <-> pods, replaces Airtable Lists linked-record arrays)
CREATE TABLE contact_pods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  pod_id uuid REFERENCES pods(id) ON DELETE CASCADE NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(contact_id, pod_id)
);

-- Performance indexes
CREATE INDEX contact_pods_contact_id_idx ON contact_pods(contact_id);
CREATE INDEX contact_pods_pod_id_idx ON contact_pods(pod_id);

-- 6. contact_categories (junction: contacts <-> categories)
CREATE TABLE contact_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(contact_id, category_id)
);

-- Performance indexes
CREATE INDEX contact_categories_contact_id_idx ON contact_categories(contact_id);
CREATE INDEX contact_categories_category_id_idx ON contact_categories(category_id);

-- 7. interactions
CREATE TABLE interactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  type interaction_type NOT NULL,
  date date NOT NULL,
  notes text,
  summary text,
  source interaction_source,
  email_link text,
  granola_link text,
  event_detail text,
  actor text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Performance index
CREATE INDEX interactions_contact_id_idx ON interactions(contact_id);

CREATE TRIGGER interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. pipelines
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

-- 9. pipeline_stages
CREATE TABLE pipeline_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  pipeline_id uuid REFERENCES pipelines(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text,
  -- "order" is a reserved word in SQL, must be quoted
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Performance index
CREATE INDEX pipeline_stages_pipeline_id_idx ON pipeline_stages(pipeline_id);

CREATE TRIGGER pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. opportunities
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

-- 11. opportunity_contacts (junction: opportunities <-> contacts)
CREATE TABLE opportunity_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(opportunity_id, contact_id)
);

-- 12. campaigns
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

-- 13. campaign_contacts (junction: campaigns <-> contacts with per-contact status)
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

-- 14. projects
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

-- 15. project_contacts (junction: projects <-> contacts)
CREATE TABLE project_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, contact_id)
);

-- 16. project_opportunities (junction: projects <-> opportunities)
CREATE TABLE project_opportunities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, opportunity_id)
);

-- 17. field_config (custom field definitions per pod or global)
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

-- 18. _migration_id_map (temp table: maps airtable_id -> supabase_uuid during migration)
-- Safe to DROP after migration is validated.
CREATE TABLE _migration_id_map (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  airtable_id text NOT NULL,
  table_name text NOT NULL,
  supabase_uuid uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(airtable_id, table_name)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

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
