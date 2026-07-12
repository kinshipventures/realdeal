CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email = lower(trim(email)))
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user
  ON public.platform_admins (user_id)
  WHERE active = true;

DROP TRIGGER IF EXISTS update_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER update_platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'invited')),
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  invite_sent_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email = lower(trim(email)))
);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_status
  ON public.waitlist_entries (status, created_at DESC);

DROP TRIGGER IF EXISTS update_waitlist_entries_updated_at ON public.waitlist_entries;
CREATE TRIGGER update_waitlist_entries_updated_at
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_events_created
  ON public.admin_audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_events_target
  ON public.admin_audit_events (target_type, target_id, created_at DESC);

ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;
