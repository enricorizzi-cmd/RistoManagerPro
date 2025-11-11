-- =====================================================
-- MIGRAZIONE: Aggiungere exclusion_type a sales_import_exclusions
-- =====================================================
-- Aggiunge il campo exclusion_type per distinguere tra
-- esclusioni per piatti (dish) e per categorie (category)

-- Aggiungere colonna exclusion_type con default 'dish' per retrocompatibilità
ALTER TABLE sales_import_exclusions 
ADD COLUMN IF NOT EXISTS exclusion_type TEXT DEFAULT 'dish' CHECK (exclusion_type IN ('dish', 'category'));

-- Aggiornare i record esistenti per avere exclusion_type = 'dish'
UPDATE sales_import_exclusions 
SET exclusion_type = 'dish' 
WHERE exclusion_type IS NULL;

-- Modificare il constraint UNIQUE per includere exclusion_type
-- Nota: Se il constraint UNIQUE esistente è inline, potrebbe non avere un nome esplicito
-- Proviamo a rimuovere il constraint se esiste con un nome comune
DO $$
BEGIN
  -- Prova a rimuovere il constraint se esiste (vari nomi possibili)
  BEGIN
    ALTER TABLE sales_import_exclusions 
    DROP CONSTRAINT IF EXISTS sales_import_exclusions_location_id_exclusion_word_key;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignora se il constraint non esiste o ha un nome diverso
  END;
  
  BEGIN
    ALTER TABLE sales_import_exclusions 
    DROP CONSTRAINT IF EXISTS sales_import_exclusions_location_id_exclusion_word_unique;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Aggiungiamo il nuovo constraint che include exclusion_type
-- Se il vecchio constraint esiste ancora come inline, PostgreSQL potrebbe dare errore
-- In quel caso, sarà necessario ricreare la tabella o rimuovere manualmente il constraint
ALTER TABLE sales_import_exclusions 
ADD CONSTRAINT sales_import_exclusions_location_word_type_unique 
UNIQUE(location_id, exclusion_word, exclusion_type);

-- Commento colonna
COMMENT ON COLUMN sales_import_exclusions.exclusion_type IS 'Tipo di esclusione: "dish" per escludere piatti, "category" per escludere categorie';

-- Aggiornare commento tabella
COMMENT ON TABLE sales_import_exclusions IS 'Parole da escludere dall''import: piatti (exclusion_type="dish") o categorie (exclusion_type="category")';

