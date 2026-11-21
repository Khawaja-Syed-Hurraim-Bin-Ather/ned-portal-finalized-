/**
 * EduCompass Layer 1 Knowledge Base Matcher (Phase 5)
 * Source of truth: EDUCOMPASS_KB_EXPANSION_SPEC.md (Section 5 & Section 10)
 * 
 * Features:
 * 1. 60-second in-memory cache of DB chatbot_answers.
 * 2. Defensive handling of missing columns (is_active, language, intent_id).
 * 3. Token-based and substring scoring with confidence threshold check (default 0.85).
 * 4. Language-aware matching (English & Roman Urdu).
 * 5. Instant verified fallback for core intents G01-G12 with zero network/LLM calls.
 */

import { supabaseAdmin } from './supabase';
import { normalizeQuery, detectLanguage } from '@educompass/shared';

export interface KBAnswerItem {
  id?: string;
  intent_id?: string;
  question_pattern: string;
  answer_text: string;
  category?: string;
  confidence_threshold?: number;
  language?: 'en' | 'ru';
  is_active?: boolean;
  review_status?: string;
}

export interface KBMatchResult {
  matched: boolean;
  answer?: string;
  category?: string;
  intentId?: string;
  score: number;
  source: 'database' | 'static_verified';
}

// ─── Verified Static Fallbacks (G01–G12, English & Roman Urdu) ─────────────────

interface VerifiedFallback {
  intentId: string;
  category: string;
  en: {
    patterns: string[];
    answer: string;
  };
  ru: {
    patterns: string[];
    answer: string;
  };
}

export const VERIFIED_STATIC_INTENTS: VerifiedFallback[] = [
  {
    intentId: 'G00',
    category: 'general',
    en: {
      patterns: [
        'hi', 'hello', 'hey', 'salam', 'assalam', 'aoa', 'greetings', 'help',
        'who are you', 'what can you do', 'good morning', 'good afternoon', 'good evening'
      ],
      answer: 'Hello! I am the EduCompass Academic Assistant for NED University Computer & Information Systems Engineering. You can ask me about degree requirements, course prerequisites, grading scales, FYP rules & archive, faculty research domains, and career roadmaps.',
    },
    ru: {
      patterns: [
        'salam', 'assalam o alaikum', 'assalam alaikum', 'kya haal hai', 'aap kaun ho', 'abdul bari'
      ],
      answer: 'Salam! Main EduCompass Academic Assistant Abdul Bari hoon, NED CISE department ke liye. Aap mujhse degree requirements, courses, prerequisites, grading scale, FYP rules aur faculty research ke baare mein pooch sakte hain.',
    },
  },
  {
    intentId: 'G01',
    category: 'grading',
    en: {
      patterns: [
        'minimum cgpa', 'cgpa to graduate', 'passing cgpa', 'required cgpa',
        'cgpa needed', 'graduation cgpa', 'what cgpa do i need', 'how much cgpa to graduate', 'lowest cgpa',
        'low cgpa', 'cgpa low'
      ],
      answer: 'To graduate you need a minimum CGPA of 2.00.',
    },
    ru: {
      patterns: [
        'graduate hone ke liye kitna cgpa', 'kam az kam cgpa kitna', 'minimum cgpa kitna hai',
        'degree ke liye cgpa kitna chahiye', 'cgpa kitna hona chahiye', 'pass hone ke liye cgpa',
        'cgpa kitna', 'kam az kam cgpa', 'cgpa chahiye', 'cgpa kam', 'kam cgpa'
      ],
      answer: 'Graduate hone ke liye kam az kam 2.00 CGPA chahiye.',
    },
  },
  {
    intentId: 'G02',
    category: 'grading',
    en: {
      patterns: [
        'passing grade', 'minimum passing grade', 'pass mark', 'minimum grade to pass',
        'pass marks', 'what grade is fail'
      ],
      answer: 'The minimum passing grade is D (1.0 grade point, 50% marks).',
    },
    ru: {
      patterns: [
        'passing grade kya hai', 'pass hone ke liye kya chahiye', 'minimum grade kya hai',
        'pass marks kitne hain', 'kitne marks pe pass', 'passing grade', 'pass marks'
      ],
      answer: 'Minimum passing grade D hai (1.0 grade point, yaani 50% marks).',
    },
  },
  {
    intentId: 'G03',
    category: 'grading',
    en: {
      patterns: [
        'retake course', 'repeat course', 'which grade counts', 'improve grade',
        'grade improvement', 'repeat a failed course', 'retake a course'
      ],
      answer: 'If you repeat a course, the higher grade replaces the earlier grade in your CGPA calculation.',
    },
    ru: {
      patterns: [
        'course dobara parhna', 'repeat karna', 'kaun sa grade count hoga',
        'grade improve kaise', 'fail course dobara', 'retake kaise', 'course repeat'
      ],
      answer: 'Course repeat karo to CGPA mein higher grade purane grade ki jagah count hota hai.',
    },
  },
  {
    intentId: 'G04',
    category: 'registration',
    en: {
      patterns: [
        'max credits', 'credit limit', 'maximum credit hours', 'credit ceiling',
        'how many credits can i take', 'overload', '21 credits', 'credit overload'
      ],
      answer: 'The regular maximum is 18 credit hours per semester. An overload of up to 21 credit hours is possible with the Chairman\'s approval.',
    },
    ru: {
      patterns: [
        'ek semester mein kitne credit hours', 'zyada se zyada credit hours',
        'credit limit kitni hai', 'overload kaise', '21 credit hours', 'credit limit'
      ],
      answer: 'Aam taur par ek semester mein zyada se zyada 18 credit hours le sakte ho. 21 credit hours tak overload Chairman ki manzoori se mumkin hai.',
    },
  },
  {
    intentId: 'G05',
    category: 'program',
    en: {
      patterns: [
        'total credit hours', 'degree credit hours', 'how many credits in degree',
        'total credits', 'credits to graduate'
      ],
      answer: 'The degree is 136 credit hours across 8 semesters.',
    },
    ru: {
      patterns: [
        'degree mein kul kitne credit hours', 'total credit hours kitne',
        'graduate hone ke liye kitne credits', 'total credit hours'
      ],
      answer: 'Degree 136 credit hours ki hai, jo 8 semesters mein hoti hai.',
    },
  },
  {
    intentId: 'G06',
    category: 'program',
    en: {
      patterns: [
        'how many courses', 'total courses', 'number of courses', 'how many subjects'
      ],
      answer: 'The program has 53 courses in total, including theory courses and practical labs.',
    },
    ru: {
      patterns: [
        'kitne courses hain', 'kul kitne subjects', 'total courses kitne', 'kitne courses'
      ],
      answer: 'Program mein kul 53 courses hain, jin mein theory aur practical labs shamil hain.',
    },
  },
  {
    intentId: 'G07',
    category: 'prerequisites',
    en: {
      patterns: [
        'failed prereq', 'fail prerequisite', 'failed prerequisite', 'locked course',
        'cannot register course', 'why is my course locked', 'prerequisite failed what happens'
      ],
      answer: 'If you fail a prerequisite, the courses that depend on it stay locked until you pass the prerequisite.',
    },
    ru: {
      patterns: [
        'prerequisite fail ho gaya', 'prereq fail', 'course lock kyun',
        'agla course kyun nahi mil raha', 'prerequisite fail to kya hoga', 'prerequisite fail'
      ],
      answer: 'Agar prerequisite fail ho jaye to jo courses us par depend karte hain woh us waqt tak lock rehte hain jab tak tum prerequisite pass nahi kar lete.',
    },
  },
  {
    intentId: 'G08',
    category: 'fyp',
    en: {
      patterns: [
        'when fyp starts', 'fyp start', '7th semester fyp', 'fyp semester',
        'fyp timing', 'when do i start fyp', 'fyp duration'
      ],
      answer: 'The Final Year Project is CS-406: Part I runs in Semester 7 and Part II in Semester 8, 3 credit hours each.',
    },
    ru: {
      patterns: [
        'fyp kab shuru hota hai', 'fyp kis semester mein', 'fyp kab start',
        'fyp kitne semester ka', 'fyp kab shuru'
      ],
      answer: 'Final Year Project CS-406 hai: Part I Semester 7 mein aur Part II Semester 8 mein hota hai, har part 3 credit hours ka.',
    },
  },
  {
    intentId: 'G09',
    category: 'fyp',
    en: {
      patterns: [
        'how to get supervisor', 'find supervisor', 'contact professor',
        'who can supervise my fyp', 'fyp supervisor', 'supervisor fyp'
      ],
      answer: 'Explore faculty members in the Professor Directory to find matching research areas. Reach out via email with your CV and a 2-line project abstract.',
    },
    ru: {
      patterns: [
        'supervisor kaise milega', 'supervisor kaise dhoondun', 'fyp ke liye professor',
        'kis professor se fyp', 'supervisor kaise'
      ],
      answer: 'Professor Directory mein faculty ki research areas dekho aur apne project idea se match karo. Phir apna CV aur 2 line ka project idea email kar do.',
    },
  },
  {
    intentId: 'G11',
    category: 'tools',
    en: {
      patterns: [
        'what if simulation', 'failure simulator', 'what if simulator',
        'simulate failing a course'
      ],
      answer: 'The What-If Failure Simulator in the Prerequisite Explorer runs entirely in your browser. It never alters your official academic record.',
    },
    ru: {
      patterns: [
        'what if simulator kya', 'failure simulator', 'fail simulate kaise'
      ],
      answer: 'What-If Failure Simulator Prerequisite Explorer mein tumhare browser ke andar hi chalta hai. Yeh tumhara official academic record kabhi nahi badalta.',
    },
  },
  {
    intentId: 'G12',
    category: 'fyp',
    en: {
      patterns: [
        'fyp credits', 'how many credits is fyp', 'credit hours of fyp',
        'cs-406 credits', 'is fyp 3 credit hours'
      ],
      answer: 'CS-406 (Final Year Project) is 3 credit hours per part: Part I in Semester 7 and Part II in Semester 8.',
    },
    ru: {
      patterns: [
        'fyp ke credit', 'fyp kitne credit', 'cs-406 credit'
      ],
      answer: 'CS-406 (Final Year Project) har part ke liye 3 credit hours ka hai: Part I Semester 7 mein aur Part II Semester 8 mein.',
    },
  },
];

// ─── DB Cache (TTL 60s) ────────────────────────────────────────────────────────

let cachedDbAnswers: KBAnswerItem[] = [];
let dbCacheTimestamp = 0;
const DB_CACHE_TTL_MS = 60 * 1000;

/** Clear the in-memory cache (for testing) */
export function clearKBCache(): void {
  cachedDbAnswers = [];
  dbCacheTimestamp = 0;
}

export async function getActiveDBAnswers(): Promise<KBAnswerItem[]> {
  const now = Date.now();
  if (cachedDbAnswers.length > 0 && now - dbCacheTimestamp < DB_CACHE_TTL_MS) {
    return cachedDbAnswers;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('chatbot_answers')
      .select('*')
      .in('review_status', ['approved', 'published']);

    if (!error && data && data.length > 0) {
      // Defensive filtering: row is active if is_active is undefined or true
      cachedDbAnswers = data.filter((row: any) => row.is_active !== false);
      dbCacheTimestamp = now;
      return cachedDbAnswers;
    }
  } catch (err) {
    console.warn('[KB-Matcher] DB query error, relying on static fallback:', err);
  }

  return cachedDbAnswers;
}

// ─── Scored Matcher Algorithm ──────────────────────────────────────────────────

interface ScoredCandidate {
  answer: string;
  category?: string;
  intentId?: string;
  score: number;
  source: 'database' | 'static_verified';
}

export async function matchLayer1(
  rawQuery: string,
  forcedLang?: 'en' | 'ru'
): Promise<KBMatchResult> {
  const lang = forcedLang || detectLanguage(rawQuery);
  const normalized = normalizeQuery(rawQuery);
  const queryTokens = normalized.split(/\s+/).filter(Boolean);
  const queryTokenSet = new Set(queryTokens);

  const candidates: ScoredCandidate[] = [];

  // 1. Evaluate Static Verified Intents (G00–G12)
  for (const intent of VERIFIED_STATIC_INTENTS) {
    const primaryGroup = lang === 'ru' ? intent.ru : intent.en;
    const secondaryGroup = lang === 'ru' ? intent.en : intent.ru;

    const checkGroup = (group: { patterns: string[]; answer: string }, isPrimary: boolean) => {
      for (const pat of group.patterns) {
        const pNorm = normalizeQuery(pat);
        const pTokens = pNorm.split(/\s+/).filter(Boolean);

        // Exact match
        if (normalized === pNorm) {
          candidates.push({
            answer: group.answer,
            category: intent.category,
            intentId: intent.intentId,
            score: isPrimary ? 1.0 : 0.95,
            source: 'static_verified',
          });
          continue;
        }

        // Multi-word phrase contained in query
        if (pTokens.length >= 2 && normalized.includes(pNorm)) {
          const ratio = pNorm.length / normalized.length;
          candidates.push({
            answer: group.answer,
            category: intent.category,
            intentId: intent.intentId,
            score: (isPrimary ? 0.92 : 0.87) + ratio * 0.05,
            source: 'static_verified',
          });
          continue;
        }

        // Single short token (<= 3 chars) requires exact token match
        if (pTokens.length === 1 && pNorm.length <= 3) {
          if (queryTokenSet.has(pNorm)) {
            candidates.push({
              answer: group.answer,
              category: intent.category,
              intentId: intent.intentId,
              score: isPrimary ? 0.88 : 0.82,
              source: 'static_verified',
            });
          }
          continue;
        }

        // Greetings (G00) should never match via loose token overlap
        if (intent.intentId === 'G00') {
          continue;
        }

        // Token overlap
        const commonCount = pTokens.filter((t) => queryTokenSet.has(t)).length;
        if (commonCount > 0) {
          const overlap = commonCount / pTokens.length;
          if (overlap >= 0.6) {
            candidates.push({
              answer: group.answer,
              category: intent.category,
              intentId: intent.intentId,
              score: (isPrimary ? 0.78 : 0.72) + overlap * 0.15,
              source: 'static_verified',
            });
          }
        }
      }
    };

    checkGroup(primaryGroup, true);
    checkGroup(secondaryGroup, false);
  }

  // 2. Evaluate DB Chatbot Answers (Active only)
  const dbRows = await getActiveDBAnswers();
  for (const item of dbRows) {
    const patterns = item.question_pattern.split(',').map((p) => normalizeQuery(p.trim()));

    for (const pNorm of patterns) {
      if (!pNorm) continue;
      const pTokens = pNorm.split(/\s+/).filter(Boolean);

      if (normalized === pNorm) {
        candidates.push({
          answer: item.answer_text,
          category: item.category,
          intentId: item.intent_id,
          score: 0.98,
          source: 'database',
        });
        continue;
      }

      if (pTokens.length >= 2 && normalized.includes(pNorm)) {
        candidates.push({
          answer: item.answer_text,
          category: item.category,
          intentId: item.intent_id,
          score: 0.91,
          source: 'database',
        });
        continue;
      }

      if (pTokens.length === 1 && pNorm.length <= 3) {
        if (queryTokenSet.has(pNorm)) {
          candidates.push({
            answer: item.answer_text,
            category: item.category,
            intentId: item.intent_id,
            score: 0.85,
            source: 'database',
          });
        }
        continue;
      }

      // Token overlap (only for multi-word patterns to avoid broad single-word false matches)
      if (pTokens.length >= 2) {
        const commonCount = pTokens.filter((t) => queryTokenSet.has(t)).length;
        const overlap = commonCount / pTokens.length;
        if (overlap >= 0.7) {
          candidates.push({
            answer: item.answer_text,
            category: item.category,
            intentId: item.intent_id,
            score: 0.75 + overlap * 0.15,
            source: 'database',
          });
        }
      }
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0 && candidates[0].score >= 0.8) {
    const best = candidates[0];
    return {
      matched: true,
      answer: best.answer,
      category: best.category,
      intentId: best.intentId,
      score: best.score,
      source: best.source,
    };
  }

  return {
    matched: false,
    score: 0,
    source: 'static_verified',
  };
}
