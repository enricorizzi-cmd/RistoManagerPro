-- =====================================================
-- MIGRAZIONE DATABASE: ANALISI VENDITE
-- =====================================================
-- Questo script crea tutte le tabelle necessarie per
-- la sezione Analisi Vendite in Supabase
--
-- IMPORTANTE: Eseguire questo script nel SQL Editor
-- di Supabase Dashboard
-- =====================================================

-- =====================================================
-- 1. TABELLA: sales_imports
-- =====================================================
-- Registra ogni importazione mensile di dati vendite
-- NOTA: Usa TEXT per id per coerenza con schema esistente (recipes, recipe_sales, ecc.)
CREATE TABLE IF NOT EXISTS sales_imports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location_id TEXT NOT NULL,
  import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  file_name TEXT NOT NULL,
  total_categories INTEGER DEFAULT 0,
  total_dishes INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  total_value NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, period_month, period_year),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_sales_imports_location_period 
  ON sales_imports(location_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_sales_imports_date 
  ON sales_imports(import_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_imports_location 
  ON sales_imports(location_id);

-- Commento tabella
COMMENT ON TABLE sales_imports IS 'Registra ogni importazione mensile di dati vendite dal gestionale';

-- =====================================================
-- 2. TABELLA: sales_categories
-- =====================================================
-- Categorie vendute per periodo (dalla tabella riepilogativa)
CREATE TABLE IF NOT EXISTS sales_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location_id TEXT NOT NULL,
  import_id TEXT REFERENCES sales_imports(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  total_value NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(import_id, category_name),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_sales_categories_import 
  ON sales_categories(import_id);
CREATE INDEX IF NOT EXISTS idx_sales_categories_location 
  ON sales_categories(location_id);

-- Commento tabella
COMMENT ON TABLE sales_categories IS 'Categorie vendute per periodo (dalla tabella riepilogativa Excel)';

-- =====================================================
-- 3. TABELLA: sales_dishes
-- =====================================================
-- Master list di tutti i piatti importati (con collegamento ricette)
CREATE TABLE IF NOT EXISTS sales_dishes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location_id TEXT NOT NULL,
  dish_name TEXT NOT NULL, -- Nome normalizzato per matching
  dish_name_original TEXT NOT NULL, -- Nome originale dal primo import
  category_gestionale TEXT, -- Categoria nel gestionale
  recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL, -- Collegamento ricetta (NULL se non collegato)
  is_linked BOOLEAN DEFAULT FALSE,
  first_seen_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_imports INTEGER DEFAULT 1, -- Numero import in cui appare
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, dish_name),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_sales_dishes_location 
  ON sales_dishes(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_dishes_recipe 
  ON sales_dishes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_sales_dishes_linked 
  ON sales_dishes(location_id, is_linked);
CREATE INDEX IF NOT EXISTS idx_sales_dishes_category 
  ON sales_dishes(location_id, category_gestionale);

-- Indice full-text per ricerca (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_sales_dishes_name_search 
  ON sales_dishes USING gin(to_tsvector('italian', dish_name));

-- Commento tabella
COMMENT ON TABLE sales_dishes IS 'Master list di tutti i piatti importati con collegamento alle ricette';

-- =====================================================
-- 4. TABELLA: sales_dish_data
-- =====================================================
-- Dati vendita per piatto per periodo
CREATE TABLE IF NOT EXISTS sales_dish_data (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  location_id TEXT NOT NULL,
  import_id TEXT REFERENCES sales_imports(id) ON DELETE CASCADE,
  dish_id TEXT REFERENCES sales_dishes(id) ON DELETE CASCADE,
  recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL, -- Copia per performance (denormalizzazione)
  quantity INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(10, 2) GENERATED ALWAYS AS (
    CASE WHEN quantity > 0 THEN total_value / quantity ELSE 0 END
  ) STORED,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(import_id, dish_id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_sales_dish_data_import 
  ON sales_dish_data(import_id);
CREATE INDEX IF NOT EXISTS idx_sales_dish_data_dish 
  ON sales_dish_data(dish_id);
CREATE INDEX IF NOT EXISTS idx_sales_dish_data_recipe 
  ON sales_dish_data(recipe_id);
CREATE INDEX IF NOT EXISTS idx_sales_dish_data_period 
  ON sales_dish_data(location_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_sales_dish_data_location 
  ON sales_dish_data(location_id);

-- Commento tabella
COMMENT ON TABLE sales_dish_data IS 'Dati vendita per piatto per periodo (dalla tabella analitica Excel)';

-- =====================================================
-- 5. TRIGGER: Aggiorna recipe_sales quando si collega un piatto
-- =====================================================
-- Quando un piatto viene collegato a una ricetta, popola
-- automaticamente la tabella recipe_sales con i dati storici

-- Funzione trigger per aggiornare recipe_sales quando si collega un piatto
CREATE OR REPLACE FUNCTION update_recipe_sales_on_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Se il piatto è stato appena collegato (recipe_id non è NULL)
  IF NEW.recipe_id IS NOT NULL AND (OLD.recipe_id IS NULL OR OLD.recipe_id != NEW.recipe_id) THEN
    -- Inserisci/aggiorna record in recipe_sales per tutti i dati storici del piatto
    -- Somma le quantità se più piatti sono collegati alla stessa ricetta
    INSERT INTO recipe_sales (id, location_id, recipe_id, quantity, sale_date)
    SELECT 
      gen_random_uuid()::text,
      sdd.location_id,
      NEW.recipe_id,
      sdd.quantity,
      -- Crea una data del primo giorno del mese del periodo
      MAKE_DATE(sdd.period_year, sdd.period_month, 1)
    FROM sales_dish_data sdd
    WHERE sdd.dish_id = NEW.id
    ON CONFLICT (location_id, recipe_id, sale_date) 
    DO UPDATE SET quantity = recipe_sales.quantity + EXCLUDED.quantity;
    
    -- Aggiorna anche i record esistenti in sales_dish_data con il nuovo recipe_id
    UPDATE sales_dish_data
    SET recipe_id = NEW.recipe_id
    WHERE dish_id = NEW.id AND recipe_id IS DISTINCT FROM NEW.recipe_id;
  END IF;
  
  -- Se il collegamento è stato rimosso (recipe_id diventa NULL)
  IF NEW.recipe_id IS NULL AND OLD.recipe_id IS NOT NULL THEN
    -- Rimuovi i record da recipe_sales per questo piatto
    -- (opzionale: potremmo voler mantenere i dati storici)
    -- DELETE FROM recipe_sales WHERE recipe_id = OLD.recipe_id AND sale_date IN (...)
    -- Per ora non rimuoviamo, manteniamo i dati storici
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sulla tabella sales_dishes
DROP TRIGGER IF EXISTS trigger_update_recipe_sales_on_link ON sales_dishes;
CREATE TRIGGER trigger_update_recipe_sales_on_link
  AFTER UPDATE OF recipe_id ON sales_dishes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_sales_on_link();

-- =====================================================
-- 6. TRIGGER: Aggiorna sales_dishes quando si inserisce nuovo import
-- =====================================================
-- Quando si inserisce un nuovo sales_dish_data, aggiorna
-- le statistiche in sales_dishes

CREATE OR REPLACE FUNCTION update_sales_dishes_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiorna last_seen_date e total_imports
  UPDATE sales_dishes
  SET 
    last_seen_date = NOW(),
    total_imports = total_imports + 1,
    updated_at = NOW()
  WHERE id = NEW.dish_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sales_dishes_stats ON sales_dish_data;
CREATE TRIGGER trigger_update_sales_dishes_stats
  AFTER INSERT ON sales_dish_data
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_dishes_stats();

-- =====================================================
-- 7. TRIGGER: Aggiorna is_linked in sales_dishes
-- =====================================================
-- Mantieni is_linked sincronizzato con recipe_id

CREATE OR REPLACE FUNCTION update_is_linked_flag()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_linked = (NEW.recipe_id IS NOT NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_is_linked_flag ON sales_dishes;
CREATE TRIGGER trigger_update_is_linked_flag
  BEFORE INSERT OR UPDATE ON sales_dishes
  FOR EACH ROW
  EXECUTE FUNCTION update_is_linked_flag();

-- =====================================================
-- 8. FUNZIONE HELPER: Calcola statistiche import
-- =====================================================
-- Funzione per calcolare statistiche aggregate di un import

CREATE OR REPLACE FUNCTION calculate_import_stats(import_id_param TEXT)
RETURNS TABLE (
  total_categories INTEGER,
  total_dishes INTEGER,
  total_quantity BIGINT,
  total_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT category_name) FROM sales_categories WHERE import_id = import_id_param)::INTEGER,
    (SELECT COUNT(DISTINCT dish_id) FROM sales_dish_data WHERE import_id = import_id_param)::INTEGER,
    (SELECT COALESCE(SUM(quantity), 0) FROM sales_dish_data WHERE import_id = import_id_param),
    (SELECT COALESCE(SUM(total_value), 0) FROM sales_dish_data WHERE import_id = import_id_param);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. VISTE UTILI PER QUERY
-- =====================================================

-- Vista: Piatti con dettagli vendita aggregati
CREATE OR REPLACE VIEW v_sales_dishes_summary AS
SELECT 
  sd.id,
  sd.location_id,
  sd.dish_name,
  sd.dish_name_original,
  sd.category_gestionale,
  sd.recipe_id,
  sd.is_linked,
  sd.first_seen_date,
  sd.last_seen_date,
  sd.total_imports,
  COALESCE(SUM(sdd.quantity), 0) as total_quantity_sold,
  COALESCE(SUM(sdd.total_value), 0) as total_value_generated,
  COUNT(DISTINCT sdd.import_id) as periods_count
FROM sales_dishes sd
LEFT JOIN sales_dish_data sdd ON sd.id = sdd.dish_id
GROUP BY sd.id, sd.location_id, sd.dish_name, sd.dish_name_original, 
         sd.category_gestionale, sd.recipe_id, sd.is_linked, 
         sd.first_seen_date, sd.last_seen_date, sd.total_imports;

-- Vista: Vendite per periodo con dettagli
CREATE OR REPLACE VIEW v_sales_by_period AS
SELECT 
  sdd.location_id,
  sdd.period_year,
  sdd.period_month,
  COUNT(DISTINCT sdd.dish_id) as unique_dishes,
  SUM(sdd.quantity) as total_quantity,
  SUM(sdd.total_value) as total_value,
  AVG(sdd.unit_price) as avg_unit_price,
  COUNT(DISTINCT sdd.recipe_id) FILTER (WHERE sdd.recipe_id IS NOT NULL) as linked_dishes_count
FROM sales_dish_data sdd
GROUP BY sdd.location_id, sdd.period_year, sdd.period_month
ORDER BY sdd.period_year DESC, sdd.period_month DESC;

-- =====================================================
-- FINE SCRIPT
-- =====================================================
-- Dopo l'esecuzione, verificare che tutte le tabelle
-- siano state create correttamente:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name LIKE 'sales_%';

