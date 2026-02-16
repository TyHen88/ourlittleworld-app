-- Add missing foreign key constraint from profiles.couple_id to couples.id
-- This constraint is required for PostgREST relationship queries using 'fk_profiles_couple' hint

ALTER TABLE "profiles" 
ADD CONSTRAINT "fk_profiles_couple" 
FOREIGN KEY ("couple_id") 
REFERENCES "couples"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;
