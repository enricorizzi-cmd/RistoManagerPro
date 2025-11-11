-- =====================================================
-- MIGRAZIONE: Aggiungere colonna coperti a sales_imports
-- =====================================================
-- Questa migration aggiunge la colonna coperti per
-- registrare il numero di coperti per periodo
-- (esclusi dal conteggio piatti)
-- =====================================================

-- Aggiungere colonna coperti alla tabella sales_imports
ALTER TABLE sales_imports 
ADD COLUMN IF NOT EXISTS coperti INTEGER DEFAULT 0;

-- Commento colonna
COMMENT ON COLUMN sales_imports.coperti IS 'Numero di coperti per questo periodo (escluso dal conteggio piatti). Rilevato dalla voce "Coperto" durante l''import.';

-- Indice per performance (se necessario per query frequenti)
-- CREATE INDEX IF NOT EXISTS idx_sales_imports_coperti 
--   ON sales_imports(location_id, period_year, period_month) 
--   WHERE coperti > 0;

-- Verifica che la colonna sia stata aggiunta
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sales_imports' 
      AND column_name = 'coperti'
  ) THEN
    RAISE EXCEPTION 'Colonna coperti non trovata dopo la migration';
  END IF;
END $$;

