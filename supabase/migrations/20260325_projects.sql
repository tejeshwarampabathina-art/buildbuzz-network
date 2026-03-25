-- Persist uploaded projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    project_url TEXT,
    cover_image_url TEXT,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    tags TEXT [] NOT NULL DEFAULT '{}',
    likes_count INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    views_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects are publicly readable" ON public.projects FOR
SELECT USING (true);
CREATE POLICY "Authenticated users can create projects" ON public.projects FOR
INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR
UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = creator_id);
CREATE INDEX projects_created_at_idx ON public.projects(created_at DESC);