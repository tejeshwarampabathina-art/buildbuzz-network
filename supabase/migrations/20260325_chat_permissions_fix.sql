-- Fix DM creation flow permissions.
-- Allow authenticated users to create conversations directly.
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow inserting own membership, and allow DM creators (already members)
-- to add one other participant into the same DM conversation.
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_members;
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
    AND EXISTS (
      SELECT 1
      FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid()
    )
  )
);
