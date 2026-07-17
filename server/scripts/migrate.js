const { supabase } = require('../src/config/supabase');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../migrations');

const runMigrations = async () => {
  console.log('🚀 Starting migrations...');

  // 1. Create migrations table if not exists
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name TEXT UNIQUE, executed_at TIMESTAMP DEFAULT NOW());`
  });

  if (tableError) {
    // If RPC exec_sql is not available, we have a chicken-and-egg problem.
    // In Supabase, usually we use the dashboard or a CLI.
    // For this POC, we'll assume the user can run SQL.
    console.error('❌ Migration runner requires "exec_sql" RPC or direct database access.');
    return;
  }

  const files = fs.readdirSync(migrationsDir).sort();
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    const { data: alreadyRun } = await supabase.from('_migrations').select('id').eq('name', file).maybeSingle();
    if (alreadyRun) continue;

    console.log(`⏳ Executing ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`❌ Error in ${file}:`, error.message);
      break;
    }

    await supabase.from('_migrations').insert({ name: file });
    console.log(`✅ ${file} completed.`);
  }

  console.log('🏁 All migrations processed.');
};

runMigrations();
