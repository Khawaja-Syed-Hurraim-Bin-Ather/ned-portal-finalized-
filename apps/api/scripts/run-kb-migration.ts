/**
 * Run migration 20261122000001_chatbot_kb_expansion.sql against Supabase PostgreSQL
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const ROOT = path.resolve(__dirname, '../../../');
const MASTER = path.join(ROOT, '.secrets', 'env.master');

if (!fs.existsSync(MASTER)) {
  console.error('❌ .secrets/env.master not found.');
  process.exit(1);
}

const lines = fs.readFileSync(MASTER, 'utf8').split('\n');
let databaseUrl = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    databaseUrl = trimmed.slice(trimmed.indexOf('=') + 1).split('#')[0].trim().replace(/^["']|["']$/g, '');
    break;
  }
}

async function getClient() {
  const parsed = new URL(databaseUrl);
  const projectRef = parsed.hostname.split('.')[1] || 'hrzzxtjuiofivnytqldj';
  const user = parsed.username.includes('.') ? parsed.username : `${parsed.username}.${projectRef}`;

  console.log('Connecting to Supabase pooler...');
  const poolerClient = new Client({
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 5432,
    database: parsed.pathname.replace(/^\//, '') || 'postgres',
    user: user,
    password: decodeURIComponent(parsed.password),
    ssl: { rejectUnauthorized: false },
  });

  await poolerClient.connect();
  return poolerClient;
}

async function run() {
  const client = await getClient();
  console.log('🔌 Connected to PostgreSQL.');

  const migrationFile = path.resolve(ROOT, 'supabase/migrations/20261122000001_chatbot_kb_expansion.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log('\n📄 Executing 20261122000001_chatbot_kb_expansion.sql:');
  console.log('----------------------------------------------------');
  console.log(sql);
  console.log('----------------------------------------------------');

  try {
    await client.query('BEGIN;');
    await client.query(sql);
    // Track in _migrations table
    await client.query(
      'INSERT INTO public._migrations (name) VALUES ($1) ON CONFLICT DO NOTHING;',
      ['20261122000001_chatbot_kb_expansion.sql']
    );
    await client.query('COMMIT;');
    console.log('✅ Migration executed and committed successfully!');

    // Verify columns on chatbot_answers
    const check = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'chatbot_answers'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Current columns on chatbot_answers:');
    console.table(check.rows);

    // Verify existing rows
    const rowsCheck = await client.query(`
      SELECT id, question_pattern, is_active, language, intent_id, review_status
      FROM chatbot_answers;
    `);
    console.log('\n🔍 Existing rows in chatbot_answers:');
    console.table(rowsCheck.rows);

    const allLive = rowsCheck.rows.every((r) => r.is_active === true);
    console.log(`\nVerified: All ${rowsCheck.rows.length} existing rows have is_active === true: ${allLive ? '✅ YES' : '❌ NO'}`);
  } catch (err: any) {
    await client.query('ROLLBACK;');
    console.error('❌ Migration failed and was rolled back:', err.message);
  } finally {
    await client.end();
  }
}

run();
