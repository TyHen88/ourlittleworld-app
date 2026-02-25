-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Create savings_goals table
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_savings_goals_couple_id ON public.savings_goals(couple_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_is_completed ON public.savings_goals(is_completed);
CREATE INDEX IF NOT EXISTS idx_savings_goals_deadline ON public.savings_goals(deadline);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_savings_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_savings_goals_updated_at
    BEFORE UPDATE ON public.savings_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_savings_goals_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view goals from their couple
CREATE POLICY "Users can view their couple's goals"
    ON public.savings_goals
    FOR SELECT
    USING (
        couple_id IN (
            SELECT couple_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert goals for their couple
CREATE POLICY "Users can create goals for their couple"
    ON public.savings_goals
    FOR INSERT
    WITH CHECK (
        couple_id IN (
            SELECT couple_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can update their couple's goals
CREATE POLICY "Users can update their couple's goals"
    ON public.savings_goals
    FOR UPDATE
    USING (
        couple_id IN (
            SELECT couple_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete their couple's goals
CREATE POLICY "Users can delete their couple's goals"
    ON public.savings_goals
    FOR DELETE
    USING (
        couple_id IN (
            SELECT couple_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Verify table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'savings_goals'
ORDER BY ordinal_position;
