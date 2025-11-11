-- Funzione PostgreSQL per eseguire la migration coperti
-- Questa funzione può essere chiamata tramite Supabase RPC

CREATE OR REPLACE FUNCTION add_coperti_column()
RETURNS TEXT AS $$
BEGIN
  -- Aggiungere colonna coperti alla tabella sales_imports
  ALTER TABLE sales_imports 
  ADD COLUMN IF NOT EXISTS coperti INTEGER DEFAULT 0;
  
  -- Commento colonna
  COMMENT ON COLUMN sales_imports.coperti IS 'Numero di coperti per questo periodo (escluso dal conteggio piatti). Rilevato dalla voce "Coperto" durante l''import.';
  
  -- Verifica che la colonna sia stata aggiunta
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sales_imports' 
      AND column_name = 'coperti'
  ) THEN
    RETURN 'ERROR: Colonna coperti non trovata dopo la migration';
  END IF;
  
  RETURN 'SUCCESS: Colonna coperti aggiunta con successo';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

