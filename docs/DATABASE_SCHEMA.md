# OurLittleWorld - Database Schema

This document outlines the database schema for OurLittleWorld using Supabase PostgreSQL.

## Tables

### profiles
Stores user profile information.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);
```

### couples
Stores couple relationship data.

```sql
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  partner_1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  partner_2_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  couple_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Couple members can view their couple" 
  ON couples FOR SELECT 
  USING (auth.uid() = partner_1_id OR auth.uid() = partner_2_id);

CREATE POLICY "Couple members can update their couple" 
  ON couples FOR UPDATE 
  USING (auth.uid() = partner_1_id OR auth.uid() = partner_2_id);

CREATE POLICY "Authenticated users can create couples" 
  ON couples FOR INSERT 
  WITH CHECK (auth.uid() = partner_1_id);
```

### transactions
Stores shared budget transactions.

```sql
CREATE TABLE transactions (
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

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies
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
```

### posts
Stores private social feed posts.

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policies
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
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_profiles_couple_id ON profiles(couple_id);
CREATE INDEX idx_couples_invite_code ON couples(invite_code);
CREATE INDEX idx_transactions_couple_id ON transactions(couple_id);
CREATE INDEX idx_posts_couple_id ON posts(couple_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
```

## Functions

### Update timestamp trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON couples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Setup Instructions

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each table creation script in order
4. Run the indexes script
5. Run the functions and triggers script
6. Verify RLS is enabled on all tables
