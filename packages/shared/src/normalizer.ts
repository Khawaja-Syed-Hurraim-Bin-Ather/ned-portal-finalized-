/**
 * EduCompass Roman Urdu Normalizer & Language Detector
 * Shared module for client gate (usePersona) and backend matcher (chat / faq-matcher)
 * Source of truth: EDUCOMPASS_KB_EXPANSION_SPEC.md (Phase 2 & Phase 3)
 */

export const RU_CANONICAL_MAP: Record<string, string> = {
  // Common question words & auxiliary verbs
  'kia': 'kya',
  'kyaa': 'kya',
  'hay': 'hai',
  'hy': 'hai',
  'hen': 'hain',
  'hyn': 'hain',
  'nahin': 'nahi',
  'nai': 'nahi',
  'nhi': 'nahi',
  'nae': 'nahi',
  'nahe': 'nahi',
  'kese': 'kaise',
  'kaisay': 'kaise',
  'kesay': 'kaise',
  'kaisy': 'kaise',
  'kub': 'kab',
  'kahaan': 'kahan',
  'kaha': 'kahan',
  'kidhar': 'kahan',
  'kon': 'kaun',
  'kaon': 'kaun',
  'kitnay': 'kitne',
  'kitny': 'kitne',
  'kitna': 'kitne',
  'kyun': 'kyun',
  'kyon': 'kyun',
  'kyunke': 'kyun',
  'mujhy': 'mujhe',
  'mjhe': 'mujhe',
  'mujhay': 'mujhe',
  'bataao': 'batao',
  'btao': 'batao',
  'batado': 'batao',
  'batain': 'batao',
  'bataein': 'batao',
  'bataiye': 'batao',
  'bata': 'batao',
  'chahye': 'chahiye',
  'chaiye': 'chahiye',
  'chahiyay': 'chahiye',
  'krna': 'karna',
  'karni': 'karna',
  'karnay': 'karna',
  'kardo': 'karna',
  'karo': 'karna',
  'parna': 'parhna',
  'padhna': 'parhna',
  'parhni': 'parhna',
  'parhai': 'parhna',
  'hogaya': 'ho gaya',
  'hogya': 'ho gaya',
  'honi': 'hona',
  'hoga': 'hona',
  'ap': 'aap',
  'tm': 'tum',
  'fel': 'fail',
  'pepar': 'paper',
  'sem': 'semester',
  'semister': 'semester',
  'cpga': 'cgpa',
  'bohot': 'bohat',
  'bahut': 'bohat',
  'boht': 'bohat',
  'bht': 'bohat',
  'pareshaan': 'pareshan',
  'preshan': 'pareshan',
  'ghabrana': 'ghabra',
  'ghabrahat': 'ghabra',
  'shukria': 'shukriya',
  'pta': 'pata',
  'samjhao': 'samajh',
  'dekho': 'dekhte',
};

// Strong Roman Urdu markers for language detection
export const STRONG_RU_MARKERS = new Set([
  'kya', 'hai', 'hain', 'nahi', 'kaise', 'kab', 'kahan', 'kaun', 'kitne',
  'kyun', 'mujhe', 'batao', 'chahiye', 'karna', 'parhna', 'hona', 'aap',
  'tum', 'mera', 'tera', 'uska', 'humara', 'tumhara', 'yeh', 'woh', 'tha',
  'thi', 'bohat', 'pareshan', 'ghabra', 'tension', 'masla', 'mushkil', 'asaan',
  'pata', 'samajh', 'madad', 'imtihan', 'paper', 'shukriya', 'sahi', 'ghalat',
  'zaroor', 'bilkul', 'kaafi', 'zyada', 'thoda', 'theek', 'chalo', 'dekhte',
  'karun', 'karo', 'karu', 'gaya', 'gayi', 'gaye', 'raha', 'rahi', 'rahe',
  'hua', 'hui', 'hue', 'wala', 'wali', 'wale', 'chhor', 'parhai'
]);

// Weak / context-dependent markers (only counted if at least one strong marker is present)
export const WEAK_RU_MARKERS = new Set([
  'ke', 'ki', 'ka', 'ko', 'se', 'me', 'mein', 'par', 'pe', 'to', 'bhi', 'ab', 'phir', 'aur'
]);

export const HONORIFICS = new Set([
  'dr', 'doctor', 'prof', 'professor', 'ms', 'mr', 'mrs', 'miss', 'engr', 'sir', 'madam', 'maam', 'mam'
]);

/**
 * Collapse 3 or more repeated characters down to 2 (e.g. 'sooooo' -> 'soo', 'bhaaaai' -> 'bhaai')
 */
export function collapseRepeatedLetters(str: string): string {
  return str.replace(/(.)\1{2,}/g, '$1$1');
}

/**
 * Normalise a single word token
 */
export function normalizeRUToken(token: string): string {
  const clean = collapseRepeatedLetters(token.toLowerCase().trim());
  return RU_CANONICAL_MAP[clean] || clean;
}

/**
 * Normalise a full query string
 */
export function normalizeQuery(query: string): string {
  if (!query) return '';
  const collapsed = collapseRepeatedLetters(query.toLowerCase());
  // Replace punctuation with spaces while preserving hyphens in course codes like CS-115
  const sanitized = collapsed
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = sanitized.split(' ').filter(Boolean);
  const normalized = tokens.map(normalizeRUToken);

  // Handle multi-word canonical mapping like 'ho gya' -> 'ho gaya'
  return normalized.join(' ')
    .replace(/\bho gya\b/g, 'ho gaya')
    .replace(/\bho gia\b/g, 'ho gaya');
}

/**
 * Token-based language detector (fixes F1 substring bug)
 * "is this the one that works", "chair", "snapshot" will correctly return 'en'.
 */
export function detectLanguage(query: string): 'en' | 'ru' {
  if (!query) return 'en';
  // Strip punctuation and split into clean word tokens
  const clean = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const rawTokens = clean.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return 'en';

  const tokens = rawTokens.map(normalizeRUToken);
  let strongHits = 0;
  let weakHits = 0;

  for (const t of tokens) {
    if (STRONG_RU_MARKERS.has(t)) {
      strongHits++;
    } else if (WEAK_RU_MARKERS.has(t)) {
      weakHits++;
    }
  }

  // Short queries (<= 4 words) with >= 1 strong marker (e.g. "kya haal hai", "cgpa kitna") -> 'ru'
  if (rawTokens.length <= 4 && strongHits >= 1) {
    return 'ru';
  }

  // General queries: >= 2 strong markers, or 1 strong + >= 1 weak marker -> 'ru'
  if (strongHits >= 2 || (strongHits >= 1 && weakHits >= 1)) {
    return 'ru';
  }

  return 'en';
}

/**
 * Strip honorifics from a name string (e.g. "Dr. Fakhra Aftab" -> "fakhra aftab")
 */
export function stripHonorifics(name: string): string {
  const tokens = name.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  const filtered = tokens.filter(t => !HONORIFICS.has(t));
  return filtered.join(' ');
}
