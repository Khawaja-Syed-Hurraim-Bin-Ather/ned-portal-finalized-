/**
 * Backup chatbot_answers from live Supabase before running migration
 */

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../src/lib/supabase';

async function backup() {
  console.log('Fetching current live chatbot_answers from Supabase...');
  const { data, error } = await supabaseAdmin.from('chatbot_answers').select('*');

  if (error) {
    console.error('Failed to fetch chatbot_answers:', error);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.resolve(__dirname, `../../../docs/data/chatbot_answers_backup_live_${timestamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✅ Backup successfully saved to: ${outPath}`);
  console.log(`Total live rows backed up: ${data.length}`);
  console.log('Row IDs:', data.map((r: any) => r.id));
}

backup();
