-- Kinship Brain — Seed: Lists + Categories
-- Run after 001_schema.sql

insert into lists (name, color, owner, is_priority) values
  ('MAPS',                       '#E53E3E', 'moj_mahdara',      true),
  ('MAPS Lite',                  '#ED8936', 'moj_mahdara',      false),
  ('Talent & Influencers',       '#38B2AC', 'moj_mahdara',      false),
  ('MM Professionals & Resources','#805AD5','moj_mahdara',      false),
  ('Family & Friends',           '#D69E2E', 'moj_mahdara',      false),
  ('General',                    '#718096', 'moj_mahdara',      false),
  ('Services for Founders',      '#48BB78', 'moj_mahdara',      false),
  ('LPs',                        '#F6AD55', 'kinship_ventures', false),
  ('Pipeline',                   '#68D391', 'kinship_ventures', false),
  ('SPV',                        '#63B3ED', 'kinship_ventures', false),
  ('Companies',                  '#FC8181', 'kinship_ventures', false);

-- MAPS categories
insert into categories (list_id, name)
select id, unnest(array[
  'Art', 'Music', 'VCS / Investment Exec', 'Hospitality',
  'Silicon Valley / Tech', 'Philanthropy', 'Beauty', 'Fashion',
  'Family & Friends'
]) from lists where name = 'MAPS';

-- Talent & Influencers categories
insert into categories (list_id, name)
select id, unnest(array[
  'Celebrities', 'Musicians', 'Athletes', 'Execs / Thought Leaders',
  'Micro (5-20k)', 'Pro / MUA / Industry', 'Fashion', 'Beauty Editors',
  'DJs', 'Models', 'Fitness', 'Music', 'Latinx', 'Asian',
  'Natural Hair', 'African American'
]) from lists where name = 'Talent & Influencers';

-- LP categories
insert into categories (list_id, name)
select id, unnest(array[
  'LP ABG', 'LP Internal', 'LP PR', 'Existing SPVs'
]) from lists where name = 'LPs';

-- Services for Founders categories (from Service Providers CSV)
insert into categories (list_id, name)
select id, unnest(array[
  'Web Development & Design', 'Branding', 'PR', 'Marketing',
  'Legal', 'Finance', 'HR + Benefits', 'Recruiting',
  'Executive Coaching', 'SEO', 'Design', 'Copywriting'
]) from lists where name = 'Services for Founders';
