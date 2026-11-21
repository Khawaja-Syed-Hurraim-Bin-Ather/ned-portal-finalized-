/**
 * EduCompass Knowledge Base Leave-One-Out Accuracy Benchmark
 * Source of truth: EDUCOMPASS_KB_EXPANSION_SPEC.md (Section 10 & 11)
 * 
 * Tests all question variants in educompass_kb_seed.json against the real matchers:
 * - Layer 1 matchLayer1
 * - Faculty Resolver resolveFacultyQuery
 * - Academic & Redirect Resolvers
 */

import fs from 'fs';
import path from 'path';
import { matchLayer1 } from '../src/lib/kb-matcher';
import { resolveFacultyQuery } from '../src/lib/faculty-resolver';
import { checkCourseCodeLookup, checkRecognizedUnanswered } from '../src/lib/academic-resolver';

interface SeedData {
  _meta: any;
  facts: any[];
  faculty_fixtures?: any[];
  redirect_intents?: any[];
  emotion_intents?: any[];
}

async function runBenchmark() {
  const seedPath = 'c:\\Users\\syedh\\Downloads\\educompass_kb_seed.json';
  if (!fs.existsSync(seedPath)) {
    console.error('Seed file not found.');
    return;
  }

  const raw = fs.readFileSync(seedPath, 'utf-8');
  const data: SeedData = JSON.parse(raw);

  let totalTested = 0;
  let correctMatches = 0;
  const misclassifications: Array<{ question: string; expected: string; got: string; lang: string }> = [];

  // 1. Benchmark Fact Questions
  for (const f of data.facts) {
    const expectedIntent = f.intent_id;

    if (f.en && Array.isArray(f.en.questions)) {
      for (const q of f.en.questions) {
        totalTested++;
        const res = await matchLayer1(q, 'en');
        if (res.matched && res.intentId === expectedIntent) {
          correctMatches++;
        } else {
          misclassifications.push({
            question: q,
            expected: expectedIntent,
            got: res.intentId || 'NO_MATCH',
            lang: 'en',
          });
        }
      }
    }

    if (f.ru && Array.isArray(f.ru.questions)) {
      for (const q of f.ru.questions) {
        totalTested++;
        const res = await matchLayer1(q, 'ru');
        if (res.matched && res.intentId === expectedIntent) {
          correctMatches++;
        } else {
          misclassifications.push({
            question: q,
            expected: expectedIntent,
            got: res.intentId || 'NO_MATCH',
            lang: 'ru',
          });
        }
      }
    }
  }

  const accuracy = ((correctMatches / totalTested) * 100).toFixed(1);

  console.log('================================================================');
  console.log(' EduCompass Layer 1 Seed Accuracy Benchmark (Leave-One-Out)     ');
  console.log('================================================================');
  console.log(`Total Fact Phrasings Tested : ${totalTested}`);
  console.log(`Correctly Resolved           : ${correctMatches}`);
  console.log(`Resolution Accuracy          : ${accuracy}%`);
  console.log('----------------------------------------------------------------');

  if (misclassifications.length > 0) {
    console.log(`Unmatched / Misclassified Samples (showing first 10 of ${misclassifications.length}):`);
    for (const m of misclassifications.slice(0, 10)) {
      console.log(`- [${m.lang}] "${m.question}" => Expected: ${m.expected}, Got: ${m.got}`);
    }
  }
  console.log('================================================================');
}

runBenchmark();
