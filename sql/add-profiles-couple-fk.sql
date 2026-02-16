-- Add missing foreign key constraint from profiles.couple_id to couples.id
-- This constraint is named 'fk_profiles_couple' to match the relationship hint used in PostgREST queries

-- First, check if the constraint already exists and drop it if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_profiles_couple' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT fk_profiles_couple;
    END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE profiles 
ADD CONSTRAINT fk_profiles_couple 
FOREIGN KEY (couple_id) 
REFERENCES couples(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Verify the constraint was created
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.constraint_name = 'fk_profiles_couple';
