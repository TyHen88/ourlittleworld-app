-- Enhanced Couples Table Schema
-- Add these columns to the existing couples table

-- Add new romantic fields
ALTER TABLE couples 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS couple_photo_url TEXT,
ADD COLUMN IF NOT EXISTS partner_1_nickname TEXT,
ADD COLUMN IF NOT EXISTS partner_2_nickname TEXT,
ADD COLUMN IF NOT EXISTS world_theme TEXT DEFAULT 'blush'; -- blush, lavender, rose, mint

-- Update RLS policies to allow joining couples
CREATE POLICY "Users can join couples with valid invite code" 
  ON couples FOR UPDATE 
  USING (
    partner_2_id IS NULL 
    AND invite_code IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = partner_2_id
  );

COMMENT ON COLUMN couples.start_date IS 'The date the couple started their relationship';
COMMENT ON COLUMN couples.couple_photo_url IS 'URL to the couple photo stored in Supabase Storage';
COMMENT ON COLUMN couples.partner_1_nickname IS 'Nickname for partner 1 (e.g., "My Honey")';
COMMENT ON COLUMN couples.partner_2_nickname IS 'Nickname for partner 2';
COMMENT ON COLUMN couples.world_theme IS 'Color theme for the couple world';
