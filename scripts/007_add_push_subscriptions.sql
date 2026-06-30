-- Push subscription storage for web push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org ON public.push_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Org members can see teammates' subscriptions (needed to fan out a push when a new entry is added)
CREATE POLICY "Org members can view org push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (public.is_org_member(org_id));

-- Users can only manage their own subscription
CREATE POLICY "Users can insert their own push subscription"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own push subscription"
ON public.push_subscriptions
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own push subscription"
ON public.push_subscriptions
FOR DELETE
USING (user_id = auth.uid());
