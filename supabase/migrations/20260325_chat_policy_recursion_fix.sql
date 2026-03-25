-- Fix infinite recursion in RLS policy for conversation_members

-- Helper function to check membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_conversation_member(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = p_user_id
  );
$$;

-- Rebuild policies so they do not self-query conversation_members directly
DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_members;

CREATE POLICY "Members can view conversation members"
ON public.conversation_members
FOR SELECT
TO authenticated
USING (
  public.is_conversation_member(conversation_members.conversation_id, auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.type = 'community'
  )
);

CREATE POLICY "Users can join conversations"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_members.conversation_id
        AND c.type = 'dm'
    )
    AND public.is_conversation_member(conversation_members.conversation_id, auth.uid())
  )
);
