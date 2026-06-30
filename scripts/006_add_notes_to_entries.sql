-- Add notes column to lunch_entries table (what was eaten that day)
ALTER TABLE IF EXISTS public.lunch_entries
ADD COLUMN IF NOT EXISTS notes TEXT;
