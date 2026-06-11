-- ============================================
-- TcheOrganiza — Initial Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- profiles: extends auth.users
-- ============================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- categories: system + user-defined
-- ============================================
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  icon          TEXT NOT NULL,
  color         TEXT NOT NULL,
  parent_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_system     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Insert default system categories (idempotent — skips if already seeded)
INSERT INTO categories (id, name, icon, color, is_system)
SELECT gen_random_uuid(), name, icon, color, true
FROM (VALUES
  ('Transporte', '🚗', '#6366F1'),
  ('Alimentação', '🍔', '#F59E0B'),
  ('Moradia', '🏠', '#8B5CF6'),
  ('Saúde', '💊', '#EF4444'),
  ('Lazer', '🎮', '#22C55E'),
  ('Salário/Receita', '💰', '#10B981'),
  ('Compras', '🛒', '#EC4899'),
  ('Educação', '📚', '#3B82F6'),
  ('Investimentos', '💸', '#F97316'),
  ('Outros', '❓', '#6E7681')
) AS defaults(name, icon, color)
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_system = true);

-- Trigger: prevent parent category cross-user assignment
CREATE OR REPLACE FUNCTION check_category_parent_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM categories
      WHERE id = NEW.parent_id
        AND user_id IS NOT NULL
        AND user_id != auth.uid()
    ) THEN
      RAISE EXCEPTION 'Parent category belongs to another user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_category_parent
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION check_category_parent_user();

-- ============================================
-- institutions: connected banks
-- ============================================
CREATE TABLE institutions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  ispb          TEXT NOT NULL,
  consent_id    TEXT NOT NULL,
  vault_key_id  TEXT NOT NULL,
  token_expires TIMESTAMPTZ,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  last_sync_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- accounts: accounts within each bank
-- ============================================
CREATE TABLE accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('corrente', 'poupanca', 'investimento')),
  currency        TEXT DEFAULT 'BRL',
  balance         DECIMAL(18,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- transactions: the central table
-- ============================================
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,
  amount          DECIMAL(18,2) NOT NULL,
  description     TEXT NOT NULL,
  merchant_name   TEXT,
  merchant_cnpj   TEXT,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  user_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date            DATE NOT NULL,
  type            TEXT DEFAULT 'DEBIT' CHECK (type IN ('DEBIT', 'CREDIT', 'PIX', 'TED', 'BOLETO')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'categorized')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(external_id, account_id)
);

-- ============================================
-- categorization_rules: learned patterns
-- ============================================
CREATE TABLE categorization_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pattern       TEXT NOT NULL,
  field         TEXT DEFAULT 'description' CHECK (field IN ('description', 'merchant_name', 'merchant_cnpj')),
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  confidence    DECIMAL(3,2) DEFAULT 1.0,
  hit_count     INT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, pattern, field)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(user_id, category_id);
CREATE INDEX idx_transactions_status ON transactions(user_id, status);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_cnpj) WHERE merchant_cnpj IS NOT NULL;
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_institutions_user ON institutions(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- categories (system categories are readable by all, user categories private)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read system categories"
  ON categories FOR SELECT USING (is_system = true OR (auth.uid() = user_id));
CREATE POLICY "Users can create own categories"
  ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE USING (auth.uid() = user_id);

-- institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own institutions"
  ON institutions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own accounts"
  ON accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own transactions"
  ON transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- categorization_rules
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own rules"
  ON categorization_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
