/**
 * EduCompass Faculty Resolver (Phase 4 / Layer 2 Direct Entity Answer)
 * Source of truth: EDUCOMPASS_KB_EXPANSION_SPEC.md (Section 4 & Section 10)
 * 
 * Rules:
 * 1. Exact/unique match (score >= 0.8) -> direct profile sentence built from professors table data.
 * 2. Ambiguous match (e.g., "Dr. Ali") -> clarification question listing candidates.
 * 3. Below threshold / unknown ("Dr. Zorbax") -> honest redirect + log to chatbot_unanswered.
 * 4. Never use gendered pronouns (he/she/his/her).
 * 5. Works fully offline with in-memory 60s cache (no per-term DB loop).
 */

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase';
import { stripHonorifics, normalizeQuery, detectLanguage } from '@educompass/shared';

export interface ProfessorRecord {
  slug: string;
  name: string;
  title: string | null;
  rank: string | null;
  department?: string | null;
  qualification?: string | null;
  research_areas: string | string[] | null;
  domain_tags?: string[] | null;
  highlights?: string | null;
  review_status?: string;
}

export interface FacultyResolveResult {
  status: 'matched' | 'ambiguous' | 'not_found' | 'domain_search' | 'none';
  answer?: string;
  matchedProfessor?: ProfessorRecord;
  candidates?: ProfessorRecord[];
  domainTopic?: string;
  logUnanswered?: boolean;
}

// In-memory cache for professors (TTL 60s)
let cachedProfessors: ProfessorRecord[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

/** Clear the in-memory cache (for testing) */
export function clearProfessorCache(): void {
  cachedProfessors = [];
  cacheTimestamp = 0;
}

export async function getProfessors(): Promise<ProfessorRecord[]> {
  const now = Date.now();
  if (cachedProfessors.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedProfessors;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('professors')
      .select('slug, name, title, rank, department, qualification, research_areas, domain_tags, highlights, review_status')
      .in('review_status', ['approved', 'published', 'extracted']);

    if (!error && data && data.length > 0) {
      cachedProfessors = data.map((p) => ({
        ...p,
        department: p.department || 'Department of Computer & Information Systems Engineering',
      }));
      cacheTimestamp = now;
      return cachedProfessors;
    }
  } catch (err) {
    console.warn('[Faculty-Resolver] Supabase fetch error, using local fallback:', err);
  }

  // Fallback to local JSON fixture if DB unreachable
  try {
    const candidatePaths = [
      path.resolve(__dirname, '../../../../docs/data/professors/professors.json'),
      path.resolve(__dirname, '../../../docs/data/professors/professors.json'),
      path.resolve(process.cwd(), 'docs/data/professors/professors.json'),
      path.resolve(process.cwd(), '../../docs/data/professors/professors.json'),
      'c:\\Users\\syedh\\.gemini\\antigravity\\scratch\\educompass\\docs\\data\\professors\\professors.json',
    ];

    for (const localPath of candidatePaths) {
      if (fs.existsSync(localPath)) {
        const raw = fs.readFileSync(localPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.professors && parsed.professors.length > 0) {
          cachedProfessors = parsed.professors.map((p: any) => ({
            ...p,
            department: p.department || 'Department of Computer & Information Systems Engineering',
          }));
          cacheTimestamp = now;
          return cachedProfessors;
        }
      }
    }
  } catch {
    // Return empty if fallback fails
  }

  return cachedProfessors;
}

// Helper: Levenshtein distance
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Similarity score [0, 1]
function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1 - dist / maxLen;
}

// Normalize name string for matching
function cleanNameForMatching(name: string): string {
  return stripHonorifics(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Format a direct faculty profile sentence (Rule: pronoun-free)
 */
export function formatFacultyProfileSentence(
  p: ProfessorRecord,
  lang: 'en' | 'ru' = 'en'
): string {
  const title = p.title || 'Dr.';
  const name = p.name.startsWith(title) ? p.name : `${title} ${p.name}`;

  // Check designation / rank
  let designation = p.rank || 'Faculty Member';
  if (p.highlights) {
    if (p.highlights.includes('Director ISL')) {
      designation = 'Professor / Director ISL';
    } else if (p.highlights.includes('Director RCAI')) {
      designation = `${designation} / Director RCAI`;
    }
  }

  // Format research areas
  let areas = '';
  if (Array.isArray(p.research_areas)) {
    areas = p.research_areas.join(', ');
  } else if (typeof p.research_areas === 'string') {
    areas = p.research_areas.replace(/;/g, ',');
  }
  if (!areas) {
    areas = 'Computer & Information Systems Engineering';
  }

  if (lang === 'ru') {
    return `${name} CISE department mein ${designation} hain. Research areas: ${areas}.`;
  }

  return `${name} is ${designation} in the Department of Computer & Information Systems Engineering. Research areas: ${areas}.`;
}

/**
 * Resolve faculty from query
 */
export async function resolveFacultyQuery(
  rawQuery: string,
  forcedLang?: 'en' | 'ru'
): Promise<FacultyResolveResult> {
  const lang = forcedLang || detectLanguage(rawQuery);
  const normalized = normalizeQuery(rawQuery);

  // 1. Check if this is a "who works on [topic]" or "research [topic]" domain search
  const domainMatch = rawQuery.match(
    /(?:who works on|who researches|faculty (?:in|for)|professors? (?:in|for)|kaun kaam karta hai|kaun research karta hai|research areas?)\s+([a-zA-Z\s\-]+)/i
  );
  if (domainMatch && domainMatch[1]) {
    const topic = domainMatch[1].trim().toLowerCase();
    const profs = await getProfessors();
    const matchingProfs = profs.filter((p) => {
      const areasStr = Array.isArray(p.research_areas)
        ? p.research_areas.join(' ')
        : (p.research_areas || '');
      const tagsStr = (p.domain_tags || []).join(' ');
      const combined = `${areasStr} ${tagsStr}`.toLowerCase();
      return combined.includes(topic);
    });

    if (matchingProfs.length > 0) {
      const names = matchingProfs.map((p) => p.name).join(', ');
      const answer =
        lang === 'ru'
          ? `NED CISE ke records ke mutabiq, yeh faculty "${topic}" par research karte hain: ${names}.`
          : `According to NED CISE departmental records, the following faculty work on "${topic}": ${names}.`;
      return {
        status: 'domain_search',
        answer,
        candidates: matchingProfs,
        domainTopic: topic,
      };
    }
  }

  // 2. Check if the query is asking about a faculty member (explicit faculty indicator or name pattern)
  const isFacultyQuestion =
    /\b(dr|prof|professor|sir|mam|miss|ms|engr|faculty)\b/i.test(rawQuery) ||
    /\b(who is|tell me about|profile of|kaun hain|k baare mein|research area)\b/i.test(rawQuery);

  if (!isFacultyQuestion) {
    return { status: 'none' };
  }

  const profs = await getProfessors();
  const cleanedQuery = cleanNameForMatching(rawQuery);
  const queryTokens = cleanedQuery.split(/\s+/).filter((t) => t.length >= 2);

  // Score each professor
  interface ScoredProf {
    prof: ProfessorRecord;
    score: number;
    matchType: 'exact_name' | 'token_subset' | 'fuzzy';
  }

  const scored: ScoredProf[] = [];

  for (const p of profs) {
    const profClean = cleanNameForMatching(p.name);
    const profTokens = profClean.split(/\s+/).filter(Boolean);

    // A. Check exact substring in query
    if (cleanedQuery.includes(profClean) || profClean.includes(cleanedQuery)) {
      scored.push({ prof: p, score: 0.95, matchType: 'exact_name' });
      continue;
    }

    // B. Token overlap
    const matchedTokens = profTokens.filter((pt) =>
      queryTokens.some((qt) => {
        if (pt === qt) return true;
        // Minor phonetic/spelling tolerance (e.g. fakra -> fakhra, arfin -> arfeen, hamiza -> hameeza)
        if (stringSimilarity(pt, qt) >= 0.8) return true;
        return false;
      })
    );

    if (matchedTokens.length > 0) {
      const ratio = matchedTokens.length / profTokens.length;
      // If query was just a single short common token like "ali", penalize score to trigger ambiguity check
      const isShortCommonToken = queryTokens.length === 1 && ['ali', 'ahmed', 'khan', 'syed', 'muhammad'].includes(queryTokens[0]);
      const finalScore = isShortCommonToken ? 0.75 : 0.6 + ratio * 0.35;

      scored.push({ prof: p, score: finalScore, matchType: 'token_subset' });
      continue;
    }

    // C. Whole-string fuzzy similarity
    const sim = stringSimilarity(cleanedQuery, profClean);
    if (sim >= 0.75) {
      scored.push({ prof: p, score: sim, matchType: 'fuzzy' });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0 || scored[0].score < 0.65) {
    // If user explicitly asked about a Dr./Professor by name but they are not in NED directory
    const extractedDrName = rawQuery.match(/(?:dr|prof(?:essor)?|engr|mr|ms)\.?\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
    if (extractedDrName && extractedDrName[1]) {
      const askedName = extractedDrName[0].trim();
      const answer =
        lang === 'ru'
          ? `Mere paas "${askedName}" ka koi faculty profile NED CISE directory mein nahi mila. Aap poori list Professor Directory mein dekh sakte hain.`
          : `I don't have a faculty profile for "${askedName}" in the NED CISE directory. You can browse the full faculty list in the Professor Directory.`;
      return {
        status: 'not_found',
        answer,
        logUnanswered: true,
      };
    }
    return { status: 'none' };
  }

  const top = scored[0];
  const second = scored[1];

  // Ambiguity check: if 2nd candidate exists and scores within 0.1 of top, or both match a shared token (e.g. "Dr. Ali")
  if (second && (top.score - second.score < 0.1 || (top.score < 0.85 && second.score >= 0.7))) {
    const candidates = scored.slice(0, 3).map((s) => s.prof);
    const candidateNames = candidates.map((c) => c.name).join(lang === 'ru' ? ' ya ' : ' or ');
    const answer =
      lang === 'ru'
        ? `Aap ka matlab ${candidateNames} se hai? Barah-e-karam poora naam likhein taake sahi profile mil sake.`
        : `Did you mean ${candidateNames}? Please provide the full name so I can share the correct profile.`;
    return {
      status: 'ambiguous',
      answer,
      candidates,
    };
  }

  // Unique high-confidence match
  if (top.score >= 0.7) {
    const answer = formatFacultyProfileSentence(top.prof, lang);
    return {
      status: 'matched',
      answer,
      matchedProfessor: top.prof,
    };
  }

  return { status: 'none' };
}
