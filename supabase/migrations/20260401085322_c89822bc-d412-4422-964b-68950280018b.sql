
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

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
