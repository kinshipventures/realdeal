
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
  industry text,
  stage text,
  ticker text,
  domain text,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX contacts_user_id_idx ON contacts(user_id);
CREATE INDEX contacts_last_contacted_at_idx ON contacts(last_contacted_at);

CREATE TRIGGER contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE contact_pods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  pod_id uuid REFERENCES pods(id) ON DELETE CASCADE NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(contact_id, pod_id)
);

CREATE INDEX contact_pods_contact_id_idx ON contact_pods(contact_id);
CREATE INDEX contact_pods_pod_id_idx ON contact_pods(pod_id);

CREATE TABLE contact_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(contact_id, category_id)
);

CREATE INDEX contact_categories_contact_id_idx ON contact_categories(contact_id);
CREATE INDEX contact_categories_category_id_idx ON contact_categories(category_id);

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

CREATE INDEX interactions_contact_id_idx ON interactions(contact_id);

CREATE TRIGGER interactions_updated_at
BEFORE UPDATE ON interactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
