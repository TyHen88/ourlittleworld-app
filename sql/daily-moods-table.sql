-- Daily Moods Table for Couple Check-ins
CREATE TABLE daily_moods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    mood_emoji TEXT NOT NULL,
    note TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One mood per user per day
    UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE daily_moods ENABLE ROW LEVEL SECURITY;

-- Policies: Only couple members can read/write their couple's moods
CREATE POLICY "Couple members can view their moods"
ON daily_moods FOR SELECT
USING (
    couple_id IN (
        SELECT id FROM couples 
        WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
    )
);

CREATE POLICY "Couple members can insert their own moods"
ON daily_moods FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND
    couple_id IN (
        SELECT id FROM couples 
        WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own moods"
ON daily_moods FOR UPDATE
USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_daily_moods_couple_date ON daily_moods(couple_id, date DESC);
CREATE INDEX idx_daily_moods_user_date ON daily_moods(user_id, date DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE daily_moods;
