-- Create menu_dropdown_values table for Supabase
-- This table stores values for tipologie, categorie, materie prime, and fornitori
-- that can be used in dropdowns without creating actual raw material entries
--
-- IMPORTANT: Execute this script in your Supabase SQL Editor
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste this script > Run

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

-- Grant necessary permissions (adjust if needed based on your RLS policies)
-- ALTER TABLE menu_dropdown_values ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can read their location dropdown values" ON menu_dropdown_values FOR SELECT USING (true);
-- CREATE POLICY "Users can insert their location dropdown values" ON menu_dropdown_values FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Users can update their location dropdown values" ON menu_dropdown_values FOR UPDATE USING (true);
-- CREATE POLICY "Users can delete their location dropdown values" ON menu_dropdown_values FOR DELETE USING (true);

