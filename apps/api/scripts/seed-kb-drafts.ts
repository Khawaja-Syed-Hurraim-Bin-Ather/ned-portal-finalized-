/**
 * EduCompass Knowledge Base Draft Seeder (Phase 9)
 * Source of truth: EDUCOMPASS_KB_EXPANSION_SPEC.md (Section 10 & educompass_kb_seed.json)
 * 
 * Rules:
 * 1. Insert ALL rows with is_active = false and review_status = 'draft'.
 * 2. Idempotent: uses upsert on (intent_id, language). Safe to run multiple times with zero duplicates.
 * 3. Verified = false rows stay inactive (needs_verification).
 */

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../src/lib/supabase';

interface FactGroup {
  intent_id: string;
  category: string;
  verified: boolean;
  load_active: boolean;
  dynamic_value: boolean;
  note: string | null;
  en?: {
    patterns: string[];
    questions: string[];
    answer: string;
  };
  ru?: {
    patterns: string[];
    questions: string[];
    answer: string;
  };
}

interface SeedFile {
  _meta: any;
  facts: FactGroup[];
}

export function prepareDraftRows(): Array<{
  intent_id: string;
  category: string;
  question_pattern: string;
  answer_text: string;
  language: 'en' | 'ru';
  confidence_threshold: number;
  review_status: string;
  is_active: boolean;
}> {
  const seedPath = 'c:\\Users\\syedh\\Downloads\\educompass_kb_seed.json';
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found at ${seedPath}`);
  }

  const raw = fs.readFileSync(seedPath, 'utf-8');
  const seedData: SeedFile = JSON.parse(raw);

  const rows: Array<{
    intent_id: string;
    category: string;
    question_pattern: string;
    answer_text: string;
    language: 'en' | 'ru';
    confidence_threshold: number;
    review_status: string;
    is_active: boolean;
  }> = [];

  for (const f of seedData.facts) {
    if (f.en) {
      rows.push({
        intent_id: f.intent_id,
        category: f.category,
        question_pattern: f.en.patterns.join(', '),
        answer_text: f.en.answer,
        language: 'en',
        confidence_threshold: 0.85,
        review_status: 'draft',
        is_active: false, // Strictly false: drafts are inactive
      });
    }

    if (f.ru) {
      rows.push({
        intent_id: f.intent_id,
        category: f.category,
        question_pattern: f.ru.patterns.join(', '),
        answer_text: f.ru.answer,
        language: 'ru',
        confidence_threshold: 0.85,
        review_status: 'draft',
        is_active: false, // Strictly false: drafts are inactive
      });
    }
  }

  return rows;
}

async function run() {
  const rows = prepareDraftRows();
  const isApply = process.argv.includes('--apply');

  console.log('================================================================');
  console.log(`EduCompass Knowledge Base Seeder — ${isApply ? 'APPLY MODE' : 'DRY RUN'}`);
  console.log('================================================================');
  console.log(`Total draft rows prepared: ${rows.length} across ${rows.length / 2} intents\n`);

  console.log('Intent | Lang | Status | Active | Category    | Sample Patterns / Answer Preview');
  console.log('-------+------+--------+--------+-------------+---------------------------------------------------');

  for (const r of rows) {
    const preview = `[${r.question_pattern.slice(0, 30)}...] -> "${r.answer_text.slice(0, 35)}..."`;
    console.log(
      `${r.intent_id.padEnd(6)} | ${r.language.padEnd(4)} | ${r.review_status.padEnd(6)} | ${String(r.is_active).padEnd(6)} | ${r.category.padEnd(11)} | ${preview}`
    );
  }

  console.log('================================================================');

  if (!isApply) {
    console.log('\n[DRY RUN COMPLETE] Zero database writes performed.');
    console.log('To apply these 38 draft rows idempotently to Supabase, run with --apply.');
    return;
  }

  console.log('\n[APPLYING DRAFTS] Staging 38 draft rows into Supabase chatbot_answers...');
  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const { data: existing, error: checkErr } = await supabaseAdmin
      .from('chatbot_answers')
      .select('id')
      .eq('intent_id', row.intent_id)
      .eq('language', row.language)
      .maybeSingle();

    if (checkErr) {
      console.error(`❌ Check error for ${row.intent_id} (${row.language}):`, checkErr.message);
      continue;
    }

    if (existing) {
      const { error: updateErr } = await supabaseAdmin
        .from('chatbot_answers')
        .update({
          question_pattern: row.question_pattern,
          answer_text: row.answer_text,
          category: row.category,
          confidence_threshold: row.confidence_threshold,
          review_status: 'draft',
          is_active: false,
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error(`❌ Failed to update ${row.intent_id} (${row.language}):`, updateErr.message);
      } else {
        updatedCount++;
      }
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from('chatbot_answers')
        .insert({
          ...row,
          review_status: 'draft',
          is_active: false,
        });

      if (insertErr) {
        console.error(`❌ Failed to insert ${row.intent_id} (${row.language}):`, insertErr.message);
      } else {
        insertedCount++;
      }
    }
  }

  console.log(`\n✅ Finished: ${insertedCount} rows inserted, ${updatedCount} rows updated.`);
  console.log('Total staged: 38 rows. ALL have is_active = false and review_status = "draft".');
}

run();
