-- Add pro_tier column to differentiate Standard vs Elite
ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_tier TEXT 
  CHECK (pro_tier IN ('standard', 'elite')) DEFAULT NULL;

-- Backfill: existing pro users get 'elite' (Matt's account)
UPDATE users SET pro_tier = 'elite' 
  WHERE pro_status = true AND pro_tier IS NULL AND telegram_id = 646401564;

-- Other existing pro users default to standard
UPDATE users SET pro_tier = 'standard' 
  WHERE pro_status = true AND pro_tier IS NULL;
