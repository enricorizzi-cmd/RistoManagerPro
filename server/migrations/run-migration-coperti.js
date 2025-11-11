// Temporary script to run migration for coperti column
// This uses Supabase service_role key to execute raw SQL
// Run with: node server/migrations/run-migration-coperti.js

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://yuvvqdtyxmdhdamhtszs.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error(
    'ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required'
  );
  console.error(
    'Please set it in your .env file or as an environment variable'
  );
  process.exit(1);
}

const migrationSQL = `
-- Aggiungere colonna coperti alla tabella sales_imports
ALTER TABLE sales_imports 
ADD COLUMN IF NOT EXISTS coperti INTEGER DEFAULT 0;

-- Commento colonna
COMMENT ON COLUMN sales_imports.coperti IS 'Numero di coperti per questo periodo (escluso dal conteggio piatti). Rilevato dalla voce "Coperto" durante l''import.';
`;

async function runMigration() {
  try {
    console.log('Running migration: add_coperti_to_sales_imports');
    console.log('Supabase URL:', SUPABASE_URL);

    // Use Supabase PostgREST RPC or direct SQL execution
    // Note: Supabase REST API doesn't support ALTER TABLE directly
    // We need to use the SQL Editor API or PostgREST with service_role

    // Try using PostgREST SQL endpoint (if available)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        sql: migrationSQL,
      }),
    });

    if (!response.ok) {
      // If RPC doesn't work, try alternative method
      console.log('RPC method not available, trying alternative...');

      // Alternative: Use Supabase Management API (if available)
      // Or provide instructions for manual execution
      throw new Error(
        `Migration failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log('Migration completed successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('\n=== MANUAL EXECUTION REQUIRED ===');
    console.error('Please execute the following SQL in Supabase SQL Editor:');
    console.error('\n' + migrationSQL);
    console.error('\nSteps:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select your project');
    console.error('3. Go to SQL Editor');
    console.error('4. Paste and run the SQL above');
    process.exit(1);
  }
}

runMigration();
