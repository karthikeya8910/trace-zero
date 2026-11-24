
ALTER TABLE public.claims ADD COLUMN search_queries jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.investigations ADD COLUMN failed_stage text CHECK (failed_stage IS NULL OR failed_stage IN ('deconstructing','discovering','examining','concluding'));
