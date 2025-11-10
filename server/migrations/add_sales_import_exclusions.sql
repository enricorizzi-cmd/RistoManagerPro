-- =====================================================
-- TABELLA: sales_import_exclusions
-- =====================================================
-- Parole da escludere dall'import per ogni location
-- Se un piatto contiene una di queste parole nel nome, viene escluso dall'import

CREATE TABLE IF NOT EXISTS sales_import_exclusions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location_id TEXT NOT NULL,
  exclusion_word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  UNIQUE(location_id, exclusion_word),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_sales_import_exclusions_location 
  ON sales_import_exclusions(location_id);

-- Commento tabella
COMMENT ON TABLE sales_import_exclusions IS 'Parole da escludere dall''import dei piatti (es: "sospeso", "sospes", ecc.)';

