-- Create menu_dropdown_values table for storing dropdown values
-- This table stores values for tipologie, categorie, materie prime, and fornitori
-- that can be used in dropdowns without creating actual raw material entries

CREATE TABLE IF NOT EXISTS menu_dropdown_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tipologia', 'categoria', 'materia_prima', 'fornitore')),
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, type, value)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_menu_dropdown_values_location_type ON menu_dropdown_values(location_id, type);

-- Add comment to table
COMMENT ON TABLE menu_dropdown_values IS 'Stores dropdown values for menu engineering (tipologie, categorie, materie prime, fornitori)';

