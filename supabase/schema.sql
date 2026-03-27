-- Kinship Brain — Supabase Schema
-- Run this in Supabase SQL Editor to create all tables

-- ── Enums ────────────────────────────────────────────────────────────────────

create type owner_type as enum ('moj_mahdara', 'kinship_ventures');
create type cadence_type as enum ('weekly', 'biweekly', 'monthly', 'quarterly');
create type interaction_type as enum ('call', 'email', 'text', 'meeting', 'intro', 'note');
create type interaction_source as enum ('Gmail', 'Granola', 'Manual');
create type global_region as enum ('AMER', 'APAC', 'ME', 'LATAM', 'EU');
create type gender_type as enum ('Male', 'Female', 'Non-binary', 'Other');
create type contact_frequency as enum ('Weekly', 'Monthly', 'Quarterly', 'Annual', 'As Needed');
create type campaign_type as enum ('event', 'investment', 'outreach', 'other');
create type campaign_status as enum ('active', 'completed');
create type campaign_contact_status as enum ('pending', 'reached', 'responded', 'confirmed');

-- ── Pods (Lists) ─────────────────────────────────────────────────────────────

create table pods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  owner owner_type,
  is_priority boolean not null default false,
  cadence cadence_type,
  created_at timestamptz not null default now()
);

-- ── Categories ───────────────────────────────────────────────────────────────

create table categories (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pods(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create index idx_categories_pod on categories(pod_id);

-- ── Contacts ─────────────────────────────────────────────────────────────────

create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
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
  birthday date,
  milestones text,
  interests text,
  relationship_context text,
  intel_notes text,
  relationship_owner text,
  contact_frequency contact_frequency,
  next_follow_up_date date,
  next_action text,
  needs_review boolean not null default false,
  last_contacted_at date,
  created_at timestamptz not null default now()
);

-- ── Junction: Contacts ↔ Pods (M2M) ─────────────────────────────────────────

create table contact_pods (
  contact_id uuid not null references contacts(id) on delete cascade,
  pod_id uuid not null references pods(id) on delete cascade,
  primary key (contact_id, pod_id)
);

create index idx_contact_pods_pod on contact_pods(pod_id);

-- ── Junction: Contacts ↔ Categories (M2M) ───────────────────────────────────

create table contact_categories (
  contact_id uuid not null references contacts(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (contact_id, category_id)
);

create index idx_contact_categories_category on contact_categories(category_id);

-- ── Interactions ─────────────────────────────────────────────────────────────

create table interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  type interaction_type not null default 'note',
  date date not null default current_date,
  notes text,
  summary text,
  source interaction_source,
  email_link text,
  granola_link text,
  created_at timestamptz not null default now()
);

create index idx_interactions_contact on interactions(contact_id);
create index idx_interactions_date on interactions(date desc);

-- ── Campaigns ────────────────────────────────────────────────────────────────

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type campaign_type not null default 'other',
  deadline date,
  status campaign_status not null default 'active',
  created_at timestamptz not null default now()
);

-- ── Campaign Contacts (junction) ─────────────────────────────────────────────

create table campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  status campaign_contact_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);

create index idx_campaign_contacts_campaign on campaign_contacts(campaign_id);
create index idx_campaign_contacts_contact on campaign_contacts(contact_id);

-- ── Row Level Security (public read/write for now — tighten later) ───────────

alter table pods enable row level security;
alter table categories enable row level security;
alter table contacts enable row level security;
alter table contact_pods enable row level security;
alter table contact_categories enable row level security;
alter table interactions enable row level security;
alter table campaigns enable row level security;
alter table campaign_contacts enable row level security;

-- Permissive policies — allows anon/authenticated full access
-- Replace with proper auth policies when you add user accounts
create policy "Allow all" on pods for all using (true) with check (true);
create policy "Allow all" on categories for all using (true) with check (true);
create policy "Allow all" on contacts for all using (true) with check (true);
create policy "Allow all" on contact_pods for all using (true) with check (true);
create policy "Allow all" on contact_categories for all using (true) with check (true);
create policy "Allow all" on interactions for all using (true) with check (true);
create policy "Allow all" on campaigns for all using (true) with check (true);
create policy "Allow all" on campaign_contacts for all using (true) with check (true);
