DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'share_links'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS share_links_authenticated ON public.share_links';
    EXECUTE 'DROP POLICY IF EXISTS share_links_public_read ON public.share_links';
    EXECUTE 'DROP TABLE IF EXISTS public.share_links CASCADE';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'contacts'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS contacts_anon_read ON public.contacts';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'contact_pods'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS contact_pods_anon_read ON public.contact_pods';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'pods'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS pods_anon_read ON public.pods';
  END IF;
END $$;
