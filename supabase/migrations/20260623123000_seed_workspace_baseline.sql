CREATE OR REPLACE FUNCTION public.seed_workspace_baseline(_workspace_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pod_id uuid;
BEGIN
  IF _workspace_id IS NULL OR _user_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.pods WHERE workspace_id = _workspace_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.pods (user_id, workspace_id, name, color, owner, is_priority, cadence, description, capacity, enrichment_opt_in)
  VALUES (_user_id, _workspace_id, 'MAPS', '#E53935', 'moj_mahdara', true, 'monthly', 'Strategic map relationships and high-context network nodes.', NULL, false)
  RETURNING id INTO _pod_id;
  INSERT INTO public.categories (user_id, workspace_id, pod_id, name, color)
  VALUES
    (_user_id, _workspace_id, _pod_id, 'Music', '#E53935'),
    (_user_id, _workspace_id, _pod_id, 'Hospitality', '#E53935'),
    (_user_id, _workspace_id, _pod_id, 'Silicon Valley / Tech', '#E53935'),
    (_user_id, _workspace_id, _pod_id, 'Philanthropy', '#E53935'),
    (_user_id, _workspace_id, _pod_id, 'Beauty', '#E53935'),
    (_user_id, _workspace_id, _pod_id, 'Fashion', '#E53935'),
    (_user_id, _workspace_id, _pod_id, 'Family & Friends', '#E53935'),
    (_user_id, _workspace_id, _pod_id, 'Art', '#E53935'),
    (_user_id, _workspace_id, _pod_id, 'VCs/Investment Exec', '#E53935');

  INSERT INTO public.pods (user_id, workspace_id, name, color, owner, is_priority, cadence, description, capacity, enrichment_opt_in)
  VALUES (_user_id, _workspace_id, 'LPs', '#FF6B8A', 'moj_mahdara', true, 'monthly', 'Limited partners and fundraising relationships.', NULL, false)
  RETURNING id INTO _pod_id;
  INSERT INTO public.categories (user_id, workspace_id, pod_id, name, color)
  VALUES
    (_user_id, _workspace_id, _pod_id, 'LP Internal', '#FF6B8A'),
    (_user_id, _workspace_id, _pod_id, 'LP PR', '#FF6B8A'),
    (_user_id, _workspace_id, _pod_id, 'LP ABG', '#FF6B8A');

  INSERT INTO public.pods (user_id, workspace_id, name, color, owner, is_priority, cadence, description, capacity, enrichment_opt_in)
  VALUES (_user_id, _workspace_id, 'Companies', '#7E57C2', 'moj_mahdara', false, 'monthly', 'Portfolio companies, partners, and company relationships.', NULL, false)
  RETURNING id INTO _pod_id;
  INSERT INTO public.categories (user_id, workspace_id, pod_id, name, color)
  VALUES
    (_user_id, _workspace_id, _pod_id, 'Brand Partners', '#7E57C2'),
    (_user_id, _workspace_id, _pod_id, 'Portfolio', '#7E57C2'),
    (_user_id, _workspace_id, _pod_id, 'Pipeline', '#7E57C2');

  INSERT INTO public.pods (user_id, workspace_id, name, color, owner, is_priority, cadence, description, capacity, enrichment_opt_in)
  VALUES (_user_id, _workspace_id, 'Services for Founders', '#F5A623', 'moj_mahdara', false, 'monthly', 'Service providers who support founders and portfolio companies.', NULL, false)
  RETURNING id INTO _pod_id;
  INSERT INTO public.categories (user_id, workspace_id, pod_id, name, color)
  VALUES
    (_user_id, _workspace_id, _pod_id, 'Design', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Development', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'PR & Comms', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Legal', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Branding', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Web Design + Dev', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Virtual Event + Video Production', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Virtual Assistants', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Venues (NY Events)', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Swag Providers', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'SEO', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Sales', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Recruiting', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Product Design', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Pricing Strategy', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'PR', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Performance & Growth Marketing', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'HR + Benefits', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Freelance/Gig Workers (Startup/VC)', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Finance', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Executive Coaching', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Digital Marketing', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Dev Shops', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Customer Support', '#F5A623'),
    (_user_id, _workspace_id, _pod_id, 'Copywriters', '#F5A623');

  INSERT INTO public.pods (user_id, workspace_id, name, color, owner, is_priority, cadence, description, capacity, enrichment_opt_in)
  VALUES (_user_id, _workspace_id, 'Maps Lite', '#1F2329', 'moj_mahdara', false, 'monthly', 'Lightweight map relationships without sub-pods.', NULL, false);

  INSERT INTO public.pods (user_id, workspace_id, name, color, owner, is_priority, cadence, description, capacity, enrichment_opt_in)
  VALUES (_user_id, _workspace_id, 'Talent & Influencers', '#25B439', 'moj_mahdara', false, 'quarterly', 'Talent, creators, influencers, and public-facing relationship nodes.', NULL, false)
  RETURNING id INTO _pod_id;
  INSERT INTO public.categories (user_id, workspace_id, pod_id, name, color)
  VALUES
    (_user_id, _workspace_id, _pod_id, 'Execs/ thought leaders', '#25B439'),
    (_user_id, _workspace_id, _pod_id, 'Celebrities', '#25B439');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ws_id uuid := gen_random_uuid();
  _slug text;
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      email = EXCLUDED.email;

  _slug := 'personal-' || substr(NEW.id::text, 1, 8);

  INSERT INTO public.workspaces (id, name, slug) VALUES (_ws_id, 'Personal', _slug);
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (_ws_id, NEW.id, 'owner');

  PERFORM public.seed_workspace_baseline(_ws_id, NEW.id);

  RETURN NEW;
END;
$$;
