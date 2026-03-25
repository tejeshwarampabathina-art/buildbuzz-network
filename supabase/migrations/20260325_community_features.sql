-- Community Members table (track who's in each community)
CREATE TABLE public.community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    -- 'admin', 'moderator', 'member'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(community_id, user_id)
);
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community members are visible to authenticated users" ON public.community_members FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Users can join communities" ON public.community_members FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage members" ON public.community_members FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.community_members cm
            WHERE cm.community_id = community_members.community_id
                AND cm.user_id = auth.uid()
                AND cm.role IN ('admin', 'moderator')
        )
    );
-- Community Groups/Channels table (separate discussion groups within communities)
CREATE TABLE public.community_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community groups are visible to community members" ON public.community_groups FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.community_members cm
            WHERE cm.community_id = community_groups.community_id
                AND cm.user_id = auth.uid()
        )
        OR is_private = false
    );
CREATE POLICY "Community members can create groups" ON public.community_groups FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.community_members cm
            WHERE cm.community_id = community_groups.community_id
                AND cm.user_id = auth.uid()
        )
    );
-- Community Meetings/Calls table
CREATE TABLE public.community_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.community_groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    -- 'scheduled', 'ongoing', 'completed', 'canceled'
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_url TEXT,
    max_participants INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meetings visible to community members" ON public.community_meetings FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.community_members cm
            WHERE cm.community_id = community_meetings.community_id
                AND cm.user_id = auth.uid()
        )
    );
CREATE POLICY "Community members can create meetings" ON public.community_meetings FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.community_members cm
            WHERE cm.community_id = community_meetings.community_id
                AND cm.user_id = auth.uid()
        )
    );
-- Meeting Participants table
CREATE TABLE public.meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.community_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ,
    UNIQUE(meeting_id, user_id)
);
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants visible within community" ON public.meeting_participants FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.community_meetings cm
                INNER JOIN public.community_members community_members ON cm.community_id = community_members.community_id
            WHERE cm.id = meeting_participants.meeting_id
                AND community_members.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can join meetings" ON public.meeting_participants FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Community Join Requests table
CREATE TABLE public.community_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(community_id, user_id)
);
ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own join requests" ON public.community_join_requests FOR
SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Community admins can view join requests" ON public.community_join_requests FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.communities c
                LEFT JOIN public.community_members cm ON cm.community_id = c.id
            WHERE c.id = community_join_requests.community_id
                AND (
                    c.creator_id = auth.uid()
                    OR (cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator'))
                )
        )
    );
CREATE POLICY "Users can create join requests" ON public.community_join_requests FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their pending join requests" ON public.community_join_requests FOR
UPDATE TO authenticated USING (auth.uid() = user_id AND status IN ('pending', 'rejected'))
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Community admins can review join requests" ON public.community_join_requests FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.communities c
                LEFT JOIN public.community_members cm ON cm.community_id = c.id
            WHERE c.id = community_join_requests.community_id
                AND (
                    c.creator_id = auth.uid()
                    OR (cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator'))
                )
        )
    );
