
-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text CHECK (display_name IS NULL OR char_length(display_name) <= 80),
  avatar_url text,
  preferred_theme text NOT NULL DEFAULT 'system' CHECK (preferred_theme IN ('light','dark','system')),
  role_focus text CHECK (role_focus IS NULL OR char_length(role_focus) <= 60),
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    left(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), 80),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INVESTIGATIONS
CREATE TABLE public.investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Untitled investigation' CHECK (char_length(title) BETWEEN 1 AND 160),
  input_type text NOT NULL CHECK (input_type IN ('text','url','image')),
  original_content text CHECK (original_content IS NULL OR char_length(original_content) <= 20000),
  source_url text CHECK (source_url IS NULL OR char_length(source_url) <= 2048),
  uploaded_file_path text,
  extracted_text text,
  status text NOT NULL DEFAULT 'deconstructing' CHECK (status IN ('deconstructing','awaiting_review','discovering','examining','concluding','completed','failed','cancelled')),
  stage_cursor integer NOT NULL DEFAULT 0,
  lock_until timestamptz,
  error_message text,
  research_mode text NOT NULL DEFAULT 'pending' CHECK (research_mode IN ('pending','live','unavailable')),
  overall_assessment text CHECK (overall_assessment IS NULL OR overall_assessment IN ('supported','contradicted','mixed','unverified','missing_context')),
  confidence_level text CHECK (confidence_level IS NULL OR confidence_level IN ('low','medium','high')),
  summary text,
  limitations text,
  is_saved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX investigations_user_created_idx ON public.investigations (user_id, created_at DESC);
CREATE INDEX investigations_user_status_idx ON public.investigations (user_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigations TO authenticated;
GRANT ALL ON public.investigations TO service_role;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_select_own" ON public.investigations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "inv_insert_own" ON public.investigations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "inv_update_own" ON public.investigations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "inv_delete_own" ON public.investigations FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER investigations_updated_at BEFORE UPDATE ON public.investigations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.owns_investigation(_investigation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.investigations WHERE id = _investigation_id AND user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.owns_investigation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_investigation(uuid) TO authenticated;

-- CLAIMS
CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  claim_text text NOT NULL CHECK (char_length(claim_text) BETWEEN 3 AND 1000),
  original_text text,
  claim_type text NOT NULL DEFAULT 'factual' CHECK (claim_type IN ('factual','opinion','prediction','question','subjective')),
  is_verifiable boolean NOT NULL DEFAULT true,
  entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  context text,
  user_edited boolean NOT NULL DEFAULT false,
  assessment text CHECK (assessment IS NULL OR assessment IN ('supported','contradicted','mixed','unverified','missing_context')),
  confidence_level text CHECK (confidence_level IS NULL OR confidence_level IN ('low','medium','high')),
  evidence_strength text CHECK (evidence_strength IS NULL OR evidence_strength IN ('none','weak','moderate','strong')),
  explanation text,
  unresolved jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX claims_investigation_idx ON public.claims (investigation_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims_all_own" ON public.claims FOR ALL TO authenticated USING (public.owns_investigation(investigation_id)) WITH CHECK (public.owns_investigation(investigation_id));

-- SOURCES
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  discovered_for_claim_id uuid REFERENCES public.claims(id) ON DELETE SET NULL,
  title text NOT NULL,
  url text,
  publisher text,
  publication_date text,
  source_type text NOT NULL DEFAULT 'independent' CHECK (source_type IN ('official','primary','independent','reference','submitted','other')),
  retrieval_status text NOT NULL DEFAULT 'retrieved' CHECK (retrieval_status IN ('retrieved','snippet_only','inaccessible')),
  excerpt text,
  search_query text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, url)
);
CREATE INDEX sources_investigation_idx ON public.sources (investigation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources_all_own" ON public.sources FOR ALL TO authenticated USING (public.owns_investigation(investigation_id)) WITH CHECK (public.owns_investigation(investigation_id));

-- EVIDENCE
CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('supports','contradicts','context','neutral')),
  summary text NOT NULL,
  relevance text,
  limitations text,
  is_outdated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (claim_id, source_id)
);
CREATE INDEX evidence_investigation_idx ON public.evidence (investigation_id);
CREATE INDEX evidence_claim_idx ON public.evidence (claim_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence TO authenticated;
GRANT ALL ON public.evidence TO service_role;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_all_own" ON public.evidence FOR ALL TO authenticated USING (public.owns_investigation(investigation_id)) WITH CHECK (public.owns_investigation(investigation_id));

-- EVENTS
CREATE TABLE public.investigation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'system' CHECK (stage IN ('intake','deconstruct','review','discover','examine','conclude','system')),
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX events_investigation_idx ON public.investigation_events (investigation_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.investigation_events TO authenticated;
GRANT ALL ON public.investigation_events TO service_role;
ALTER TABLE public.investigation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_own" ON public.investigation_events FOR SELECT TO authenticated USING (public.owns_investigation(investigation_id));
CREATE POLICY "events_insert_own" ON public.investigation_events FOR INSERT TO authenticated WITH CHECK (public.owns_investigation(investigation_id));
CREATE POLICY "events_delete_own" ON public.investigation_events FOR DELETE TO authenticated USING (public.owns_investigation(investigation_id));

-- REPORTS
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL UNIQUE REFERENCES public.investigations(id) ON DELETE CASCADE,
  report_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  public_token text UNIQUE,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_all_own" ON public.reports FOR ALL TO authenticated USING (public.owns_investigation(investigation_id)) WITH CHECK (public.owns_investigation(investigation_id));
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public read-only report access by token (no uploads, no original submission)
CREATE OR REPLACE FUNCTION public.get_public_report(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'report', jsonb_build_object('id', r.id, 'report_content', r.report_content, 'published_at', r.published_at, 'created_at', r.created_at),
    'investigation', jsonb_build_object('id', i.id, 'title', i.title, 'input_type', i.input_type, 'status', i.status,
      'overall_assessment', i.overall_assessment, 'confidence_level', i.confidence_level, 'summary', i.summary,
      'limitations', i.limitations, 'research_mode', i.research_mode, 'created_at', i.created_at, 'updated_at', i.updated_at),
    'claims', coalesce((SELECT jsonb_agg(to_jsonb(c) - 'original_text' ORDER BY c.position) FROM public.claims c WHERE c.investigation_id = i.id), '[]'::jsonb),
    'sources', coalesce((SELECT jsonb_agg(to_jsonb(s) - 'search_query' ORDER BY s.created_at) FROM public.sources s WHERE s.investigation_id = i.id AND s.source_type <> 'submitted'), '[]'::jsonb),
    'evidence', coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM public.evidence e JOIN public.sources s2 ON s2.id = e.source_id WHERE e.investigation_id = i.id AND s2.source_type <> 'submitted'), '[]'::jsonb)
  )
  FROM public.reports r JOIN public.investigations i ON i.id = r.investigation_id
  WHERE r.is_public = true AND r.public_token IS NOT NULL AND length(_token) >= 24 AND r.public_token = _token
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_report(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_report(text) TO anon, authenticated;

-- Storage policies for private submissions bucket (bucket created separately)
CREATE POLICY "submissions_select_own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "submissions_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "submissions_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
