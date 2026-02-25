-- Create savings_goals table
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount DECIMAL(10, 2) NOT NULL,
    current_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    icon VARCHAR(50) DEFAULT 'Target',
    color VARCHAR(50) DEFAULT 'purple',
    deadline DATE,
    priority VARCHAR(20) DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT false NOT NULL,
    completed_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_savings_goals_couple
        FOREIGN KEY (couple_id)
        REFERENCES couples(id)
        ON DELETE CASCADE
);

-- Create index on couple_id for faster queries
CREATE INDEX IF NOT EXISTS idx_savings_goals_couple_id ON savings_goals(couple_id);

-- Create index on is_completed for filtering
CREATE INDEX IF NOT EXISTS idx_savings_goals_is_completed ON savings_goals(is_completed);

-- Create index on deadline for sorting
CREATE INDEX IF NOT EXISTS idx_savings_goals_deadline ON savings_goals(deadline);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_savings_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_savings_goals_updated_at
    BEFORE UPDATE ON savings_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_savings_goals_updated_at();

-- Verify table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'savings_goals'
ORDER BY ordinal_position;
