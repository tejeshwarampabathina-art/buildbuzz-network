-- Direct messages between accounts (Instagram-style 1:1 chat)
CREATE TABLE public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (char_length(trim(content)) > 0),
    CHECK (sender_id <> receiver_id)
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their direct messages"
ON public.direct_messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send direct messages from their account"
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE INDEX direct_messages_sender_created_idx
ON public.direct_messages(sender_id, created_at DESC);

CREATE INDEX direct_messages_receiver_created_idx
ON public.direct_messages(receiver_id, created_at DESC);
