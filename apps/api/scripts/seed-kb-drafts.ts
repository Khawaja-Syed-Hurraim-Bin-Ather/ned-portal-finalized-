/**
 * EduCompass Knowledge Base Draft Seeder (Phase 9)
 * Source of truth: EDUCOMPASS_KB_EXPANSION_SPEC.md (Section 10 & educompass_kb_seed.json)
 * 
 * Rules:
 * 1. Insert ALL rows with is_active = false and review_status = 'draft'.
 * 2. Never touch or delete existing rows.
 * 3. Verified = false rows stay inactive (needs_verification).
 * 4. Generates both SQL migration file and executes safe upsert/insert if run with --apply.
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

async function runSeeder() {
  const seedPath = 'c:\\Users\\syedh\\Downloads\\educompass_kb_seed.json';
  if (!fs.existsSync(seedPath)) {
    console.error(`Seed file not found at ${seedPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(seedPath, 'utf-8');
  const seedData: SeedFile = JSON.parse(raw);

  console.log('Loaded seed file. Total facts:', seedData.facts.length);

  const rowsToInsert: Array<{
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
      rowsToInsert.push({
        intent_id: f.intent_id,
        category: f.category,
        question_pattern: f.en.patterns.join(', '),
        answer_text: f.en.answer,
        language: 'en',
        confidence_threshold: 0.85,
        review_status: 'draft',
        is_active: false, // Non-negotiable: drafts are inactive
      });
    }

    if (f.ru) {
      rowsToInsert.push({
        intent_id: f.intent_id,
        category: f.category,
        question_pattern: f.ru.patterns.join(', '),
        answer_text: f.ru.answer,
        language: 'ru',
        confidence_threshold: 0.85,
        review_status: 'draft',
        is_active: false, // Non-negotiable: drafts are inactive
      });
    }
  }

  console.log(`Prepared ${rowsToInsert.length} draft rows across ${seedData.facts.length} intents.`);

  // Write SQL migration file
  const sqlStatements: string[] = [
    '-- EduCompass Knowledge Base Draft Seed Data',
    '-- Source: educompass_kb_seed.json',
    '-- All rows inserted with is_active = false and review_status = \'draft\'',
    '',
  ];

  for (const row of rowsToInsert) {
    const escPattern = row.question_pattern.replace(/'/g, "''");
    const escAnswer = row.answer_text.replace(/'/g, "''");
    sqlStatements.push(
      `INSERT INTO chatbot_answers (intent_id, category, question_pattern, answer_text, language, confidence_threshold, review_status, is_active)` +
      ` VALUES ('${row.intent_id}', '${row.category}', '${escPattern}', '${escAnswer}', '${row.language}', ${row.confidence_threshold}, '${row.review_status}', ${row.is_active})` +
      ` ON CONFLICT DO NOTHING;`
    );
  }

  const outSqlPath = path.resolve(__dirname, '../../../supabase/migrations/20261122000002_chatbot_seed_drafts.sql');
  fs.writeFileSync(outSqlPath, sqlStatements.join('\n'), 'utf-8');
  console.log(`Wrote SQL migration file to: ${outSqlPath}`);

  // Also save json export
  const outJsonPath = path.resolve(__dirname, '../../../docs/data/chatbot_draft_seeds.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(rowsToInsert, null, 2), 'utf-8');
  console.log(`Wrote draft JSON export to: ${outJsonPath}`);

  const applyFlag = process.argv.includes('--apply');
  if (applyFlag) {
    console.log('Applying draft rows to Supabase database...');
    let successCount = 0;
    for (const row of rowsToInsert) {
      const { error } = await supabaseAdmin.from('chatbot_answers').insert(row);
      if (error) {
        console.warn(`Error inserting draft ${row.intent_id} (${row.language}):`, error.message);
      } else {
        successCount++;
      }
    }
    console.log(`Inserted ${successCount} draft rows into Supabase chatbot_answers.`);
  } else {
    console.log('Dry-run complete. Run with --apply to insert into database, or execute the generated migration.');
  }
}

runSeeder();
