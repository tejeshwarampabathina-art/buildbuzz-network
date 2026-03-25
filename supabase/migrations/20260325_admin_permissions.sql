-- Ensure community creators always exist as admin members
INSERT INTO public.community_members (community_id, user_id, role)
SELECT c.id, c.creator_id, 'admin'
FROM public.communities c
LEFT JOIN public.community_members cm
  ON cm.community_id = c.id
 AND cm.user_id = c.creator_id
WHERE cm.id IS NULL;

UPDATE public.community_members cm
SET role = 'admin'
FROM public.communities c
WHERE cm.community_id = c.id
  AND cm.user_id = c.creator_id
  AND cm.role <> 'admin';

-- Replace restrictive policies with creator/admin-aware permissions
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.community_members;

CREATE POLICY "Users can join communities"
ON public.community_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_members.community_id
      AND c.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can manage members"
ON public.community_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_members.community_id
      AND c.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_members.community_id
      AND c.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can remove members"
ON public.community_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_members.community_id
      AND c.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
  )
);
