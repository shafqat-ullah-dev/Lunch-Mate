-- ============================================================
-- HARDENING: Row Level Security on the lunch money tables
-- ============================================================
-- 001_create_tables.sql created lunch_users / lunch_entries /
-- lunch_shares / lunch_payments WITHOUT org_id and WITHOUT RLS.
-- The application scopes every query with `.eq("org_id", ...)`, but
-- app-layer filtering alone is not a security boundary: any signed-in
-- user holds a Supabase JWT and can query these tables directly,
-- reaching other organizations' expenses, shares and balances.
--
-- This migration makes org isolation a DATABASE guarantee. It is
-- idempotent and safe to re-run. It relies on the SECURITY DEFINER
-- helpers public.is_org_member(uuid) / public.is_org_admin(uuid)
-- defined in 003_fix_rls_recursion.sql.
-- ============================================================

-- 1. Ensure org_id exists on every money table (the app already writes it).
ALTER TABLE IF EXISTS public.lunch_users
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.lunch_entries
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.lunch_shares
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.lunch_payments
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Index org_id for the policy checks and the app's org-scoped reads.
CREATE INDEX IF NOT EXISTS idx_lunch_users_org ON public.lunch_users(org_id);
CREATE INDEX IF NOT EXISTS idx_lunch_entries_org ON public.lunch_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_lunch_shares_org ON public.lunch_shares(org_id);
CREATE INDEX IF NOT EXISTS idx_lunch_payments_org ON public.lunch_payments(org_id);

-- 3. Turn RLS on. After this, rows are invisible unless a policy allows them.
ALTER TABLE public.lunch_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lunch_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lunch_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lunch_payments ENABLE ROW LEVEL SECURITY;

-- 4. Policies. Read = any member of the org; write = org admins only.
--    (Server actions already enforce the admin check; this backs it in the DB.)

-- ---- lunch_users ----
DROP POLICY IF EXISTS "Org members can view lunch users" ON public.lunch_users;
CREATE POLICY "Org members can view lunch users"
  ON public.lunch_users FOR SELECT USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Org admins can insert lunch users" ON public.lunch_users;
CREATE POLICY "Org admins can insert lunch users"
  ON public.lunch_users FOR INSERT WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Org admins can update lunch users" ON public.lunch_users;
CREATE POLICY "Org admins can update lunch users"
  ON public.lunch_users FOR UPDATE USING (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Org admins can delete lunch users" ON public.lunch_users;
CREATE POLICY "Org admins can delete lunch users"
  ON public.lunch_users FOR DELETE USING (public.is_org_admin(org_id));

-- ---- lunch_entries ----
DROP POLICY IF EXISTS "Org members can view lunch entries" ON public.lunch_entries;
CREATE POLICY "Org members can view lunch entries"
  ON public.lunch_entries FOR SELECT USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Org admins can insert lunch entries" ON public.lunch_entries;
CREATE POLICY "Org admins can insert lunch entries"
  ON public.lunch_entries FOR INSERT WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Org admins can update lunch entries" ON public.lunch_entries;
CREATE POLICY "Org admins can update lunch entries"
  ON public.lunch_entries FOR UPDATE USING (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Org admins can delete lunch entries" ON public.lunch_entries;
CREATE POLICY "Org admins can delete lunch entries"
  ON public.lunch_entries FOR DELETE USING (public.is_org_admin(org_id));

-- ---- lunch_shares ----
DROP POLICY IF EXISTS "Org members can view lunch shares" ON public.lunch_shares;
CREATE POLICY "Org members can view lunch shares"
  ON public.lunch_shares FOR SELECT USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Org admins can insert lunch shares" ON public.lunch_shares;
CREATE POLICY "Org admins can insert lunch shares"
  ON public.lunch_shares FOR INSERT WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Org admins can update lunch shares" ON public.lunch_shares;
CREATE POLICY "Org admins can update lunch shares"
  ON public.lunch_shares FOR UPDATE USING (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Org admins can delete lunch shares" ON public.lunch_shares;
CREATE POLICY "Org admins can delete lunch shares"
  ON public.lunch_shares FOR DELETE USING (public.is_org_admin(org_id));

-- ---- lunch_payments ----
DROP POLICY IF EXISTS "Org members can view lunch payments" ON public.lunch_payments;
CREATE POLICY "Org members can view lunch payments"
  ON public.lunch_payments FOR SELECT USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Org admins can insert lunch payments" ON public.lunch_payments;
CREATE POLICY "Org admins can insert lunch payments"
  ON public.lunch_payments FOR INSERT WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Org admins can update lunch payments" ON public.lunch_payments;
CREATE POLICY "Org admins can update lunch payments"
  ON public.lunch_payments FOR UPDATE USING (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Org admins can delete lunch payments" ON public.lunch_payments;
CREATE POLICY "Org admins can delete lunch payments"
  ON public.lunch_payments FOR DELETE USING (public.is_org_admin(org_id));
