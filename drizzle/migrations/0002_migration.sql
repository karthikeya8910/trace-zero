
-- Research records are written only by trusted server functions; users may read their own,
-- rename/save investigations, delete them, and control report sharing.
REVOKE INSERT, UPDATE, DELETE ON public.claims FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.sources FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.evidence FROM authenticated;
REVOKE INSERT, DELETE ON public.investigation_events FROM authenticated;
REVOKE INSERT, UPDATE ON public.investigations FROM authenticated;
GRANT UPDATE (title, is_saved) ON public.investigations TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.reports FROM authenticated;
GRANT UPDATE (is_public, public_token, published_at) ON public.reports TO authenticated;
