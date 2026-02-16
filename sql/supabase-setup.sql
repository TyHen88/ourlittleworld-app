-- OurLittleWorld Database Setup Script
-- Run this entire script in your Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  couple_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create couples table
CREATE TABLE IF NOT EXISTS couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  partner_1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  partner_2_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  couple_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for couple_id in profiles
ALTER TABLE profiles 
  ADD CONSTRAINT fk_profiles_couple 
  FOREIGN KEY (couple_id) 
  REFERENCES couples(id) 
  ON DELETE SET NULL;

-- 3. Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  payer TEXT CHECK (payer IN ('His', 'Hers', 'Shared')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 7. Create RLS Policies for couples
CREATE POLICY "Couple members can view their couple" 
  ON couples FOR SELECT 
  USING (auth.uid() = partner_1_id OR auth.uid() = partner_2_id);

CREATE POLICY "Couple members can update their couple" 
  ON couples FOR UPDATE 
  USING (auth.uid() = partner_1_id OR auth.uid() = partner_2_id);

CREATE POLICY "Authenticated users can create couples" 
  ON couples FOR INSERT 
  WITH CHECK (auth.uid() = partner_1_id);

-- 8. Create RLS Policies for transactions
CREATE POLICY "Couple members can view their transactions" 
  ON transactions FOR SELECT 
  USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
    )
  );

CREATE POLICY "Couple members can create transactions" 
  ON transactions FOR INSERT 
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples 
      WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
    )
  );

CREATE POLICY "Couple members can update their transactions" 
  ON transactions FOR UPDATE 
  USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
    )
  );

CREATE POLICY "Couple members can delete their transactions" 
  ON transactions FOR DELETE 
  USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
    )
  );

-- 9. Create RLS Policies for posts
CREATE POLICY "Couple members can view their posts" 
  ON posts FOR SELECT 
  USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
    )
  );

CREATE POLICY "Couple members can create posts" 
  ON posts FOR INSERT 
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples 
      WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
    ) AND author_id = auth.uid()
  );

CREATE POLICY "Authors can update their own posts" 
  ON posts FOR UPDATE 
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their own posts" 
  ON posts FOR DELETE 
  USING (author_id = auth.uid());

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_couple_id ON profiles(couple_id);
CREATE INDEX IF NOT EXISTS idx_couples_invite_code ON couples(invite_code);
CREATE INDEX IF NOT EXISTS idx_transactions_couple_id ON transactions(couple_id);
CREATE INDEX IF NOT EXISTS idx_posts_couple_id ON posts(couple_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);

-- 11. Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_couples_updated_at ON couples;
CREATE TRIGGER update_couples_updated_at 
  BEFORE UPDATE ON couples
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at 
  BEFORE UPDATE ON posts
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'OurLittleWorld database schema created successfully! 💕';
END $$;
