-- Kinship Brain — Core Schema
-- Run against your Supabase project via: supabase db push
-- Or paste into the Supabase SQL editor

create table lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  owner text,
  is_priority boolean default false,
  created_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  role text,
  location text,
  website text,
  notes text,
  recommended_by text,
  specialization text,
  past_clients text,
  last_contacted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table list_memberships (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  list_id uuid references lists(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  added_at timestamptz default now(),
  unique(contact_id, list_id, category_id)
);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  type text not null check (type in ('call','email','meeting','intro','event','note')),
  date timestamptz not null default now(),
  notes text,
  created_at timestamptz default now()
);

create table node_positions (
  id uuid primary key default gen_random_uuid(),
  node_id text not null,
  node_type text not null check (node_type in ('list','category')),
  x float not null,
  y float not null,
  updated_at timestamptz default now(),
  unique(node_id, node_type)
);

-- Indexes
create index idx_list_memberships_list_id on list_memberships(list_id);
create index idx_list_memberships_contact_id on list_memberships(contact_id);
create index idx_interactions_contact_id on interactions(contact_id);
create index idx_interactions_date on interactions(date desc nulls last);
create index idx_contacts_last_contacted on contacts(last_contacted_at desc nulls last);

-- Auto-update updated_at on contacts
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();
