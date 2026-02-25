-- ALTER TABLE for couples to support savings_goals relation
-- This is informational only - the relation is handled by the savings_goals table's foreign key

-- The savingsGoals relation in the Couple model is a "reverse relation"
-- It doesn't require any changes to the couples table itself
-- The foreign key is defined in the savings_goals table (couple_id column)

-- However, if you want to verify the relationship exists, you can run:
SELECT 
    tc.table_name AS child_table,
    kcu.column_name AS child_column,
    ccu.table_name AS parent_table,
    ccu.column_name AS parent_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'savings_goals'
    AND ccu.table_name = 'couples';

-- Expected result:
-- child_table: savings_goals
-- child_column: couple_id
-- parent_table: couples
-- parent_column: id
-- constraint_name: savings_goals_couple_id_fkey (or similar)

-- Note: The couples table doesn't need any ALTER statements
-- because the relation is defined on the savings_goals side via the foreign key
