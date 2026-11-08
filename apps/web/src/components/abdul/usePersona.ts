'use client';

import { useCallback, useRef } from 'react';
import personaData from '../../lib/persona/abdul-bari.persona.json';

type Lang = 'en' | 'ru';
type LineBank = { en: string[]; ru: string[] };

// ── Roman Urdu keyword markers ────────────────────────────────────────────────
const RU_MARKERS = [
  'kya', 'hai', 'hain', 'nahi', 'kaise', 'kab', 'kahan', 'aap', 'tum',
  'mujhe', 'batao', 'chahiye', 'parhna', 'theek', 'chalo', 'dekhte',
  'mera', 'tera', 'uska', 'humara', 'tumhara', 'yeh', 'woh', 'tha', 'thi',
  'hona', 'salam', 'zaroor', 'bilkul', 'kaafi', 'zyada', 'thoda',
];

// ── Persona intent keywords ───────────────────────────────────────────────────
const MYSTERY_PATTERNS: Record<string, RegExp> = {
  'P-GRAD': /graduat|pass.?out|degre|finish.?degree|alumnu|still.?student|graduate.?kab|degree.?ho.?gayi|kab.?pass/i,
  'P-BATCH': /which.?batch|what.?batch|kis.?batch|kaun.?se.?batch|kaun.?se.?year|kaun.?se.?semester|when.?did.?you.?join|kab.?join/i,
  'P-TIME': /how.?long|how.?many.?year|kitne.?saal|kitne.?arse|how.?old|age.?kitni|kab.?se.?ned/i,
  'P-ROLE': /are.?you.?a?.?student|are.?you.?(a.?)?staff|are.?you.?teacher|do.?you.?work|are.?you.?faculty|student.?ho.?ya|teacher.?ho|yahan.?kaam/i,
  'P-HOME': /where.?do.?you.?live|do.?you.?live.?on.?campus|kahan.?rehte|campus.?mein.?rehte|kamra.?kahan/i,
  'P-GRADES': /your.?cgpa|did.?you.?(ever.?)?fail|backlog|were.?you.?a?.?topper|did.?you.?get.?offer|aapka.?cgpa|kabhi.?fail|topper.?the|aapko.?offer/i,
  'P-ID': /your.?real.?name|roll.?number|who.?are.?you.?really|asli.?naam|roll.?numb/i,
};

const SMALLTALK_PATTERNS: Record<string, RegExp> = {
  'S-GREET': /^(hi|hello|hey|salam|assalam|salaam|hy|helo)\b/i,
  'S-THANKS': /^(thanks|thank.?you|shukriya|shukria|thanks.?yaar|thx)\b/i,
  'S-WHO': /who.?are.?you|what.?are.?you|aap.?kaun.?ho|kaun.?hai.?tu/i,
  'S-CAN': /what.?can.?you.?do|help.?me.?with|kya.?kar.?sakte|kya.?madad/i,
  'S-OFFICIAL': /are.?you.?official|aap.?official|kya.?official/i,
  'S-FAV': /favourite.?course|best.?teacher|pasand.?course|acha.?teacher/i,
  'S-PRAISE': /you.?re.?great|zabardast|so.?helpful|bahut.?acha|behtareen/i,
  'S-RUDE': /useless|bekaar|galat.?bataya|wrong.?answer|chutiya|bewaqoof/i,
  'S-BYE': /^(bye|goodbye|see.?you|allah.?hafiz|khuda.?hafiz|ttyl|cya)\b/i,
  'S-JOKE': /tell.?me.?a.?joke|koi.?joke|mazaak|funny.?something/i,
  'S-STRESS': /i.?m.?stressed|i.?m.?failing|scared|dar.?lag.?raha|backlog.?ho.?gaya|fail.?ho.?gaya|depressed|anxious/i,
  'S-OOS': /weather|cricket|news|politics|movie|song|music/i,
};

const SINCERITY_PATTERN = /are.?you.?(ai|a.?bot|real|human|actual.?person)|aap.?insaan|robot.?ho|aap.?ai|kya.?aap.?asli/i;
const DISTRESS_PATTERN = /want.?to.?die|kill.?myself|suicid|self.?harm|hurt.?myself|marna.?chahta|zindagi.?nahi.?chahiye/i;
const SECOND_PERSON = /\b(you|your|aap|tum|tumhara|aapka|aapki)\b/i;

export type PersonaIntent =
  | 'P-GRAD' | 'P-BATCH' | 'P-TIME' | 'P-ROLE' | 'P-HOME' | 'P-GRADES' | 'P-ID'
  | 'S-GREET' | 'S-THANKS' | 'S-WHO' | 'S-CAN' | 'S-OFFICIAL' | 'S-FAV'
  | 'S-PRAISE' | 'S-RUDE' | 'S-BYE' | 'S-JOKE' | 'S-STRESS' | 'S-OOS'
  | 'SINCERITY' | 'DISTRESS'
  | null;

/** Detect language from query */
export function detectLanguage(query: string): Lang {
  const lower = query.toLowerCase();
  const ruCount = RU_MARKERS.filter((m) => lower.includes(m)).length;
  return ruCount >= 2 ? 'ru' : 'en';
}

/** Detect persona intent (P-* or S-*) or null for normal engine */
export function detectPersonaIntent(query: string): PersonaIntent {
  // Safety first
  if (DISTRESS_PATTERN.test(query)) return 'DISTRESS';
  // Sincerity check
  if (SINCERITY_PATTERN.test(query)) return 'SINCERITY';

  // Mystery intents — P-BATCH, P-TIME, P-ROLE, P-HOME require second-person marker
  // so "Which batch is EduCompass built for?" doesn't get hijacked
  for (const [id, pat] of Object.entries(MYSTERY_PATTERNS)) {
    if (pat.test(query)) {
      const needsSecondPerson = ['P-BATCH', 'P-TIME', 'P-ROLE', 'P-HOME'].includes(id);
      if (!needsSecondPerson || SECOND_PERSON.test(query)) {
        return id as PersonaIntent;
      }
    }
  }

  // Small-talk intents
  for (const [id, pat] of Object.entries(SMALLTALK_PATTERNS)) {
    if (pat.test(query)) return id as PersonaIntent;
  }

  return null;
}

/** Pick a random line, never the same as last. */
function pickLine(bank: string[], lastLine: string): string {
  if (bank.length === 0) return '';
  if (bank.length === 1) return bank[0];
  const filtered = bank.filter((l) => l !== lastLine);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/** Get a reply for a given persona intent */
function getPersonaReply(intent: PersonaIntent, lang: Lang, lastLines: Record<string, string>): string {
  if (intent === 'DISTRESS') {
    return lang === 'ru'
      ? 'Yaar, sun lo — agar sach mein mushkil ho rahi hai, to kisi apne se baat karo. Main sirf ek AI guide hoon. Apne advisor, dost ya family ko batao.'
      : 'Hey — if things are really hard right now, please talk to someone you trust. I\'m just an AI guide. Reach out to your advisor, a friend, or family.';
  }

  if (intent === 'SINCERITY') {
    return lang === 'ru' ? personaData.sincerity.ru : personaData.sincerity.en;
  }

  if (intent?.startsWith('P-')) {
    const family = intent as keyof typeof personaData.mystery;
    const bank = personaData.mystery[family]?.[lang] ?? [];
    const reply = pickLine(bank, lastLines[intent] ?? '');
    lastLines[intent] = reply;
    // Optionally add a pivot ~50% of the time
    if (Math.random() < 0.5) {
      const pivot = lang === 'ru'
        ? 'Waise, aapko kis course mein help chahiye?'
        : 'Anyway, what can I help you with?';
      return `${reply} ${pivot}`;
    }
    return reply;
  }

  if (intent?.startsWith('S-')) {
    const key = intent as keyof typeof personaData.smalltalk;
    const bank = personaData.smalltalk[key]?.[lang] ?? [];
    const reply = pickLine(bank, lastLines[intent] ?? '');
    lastLines[intent] = reply;
    return reply;
  }

  return '';
}

export interface PersonaContext {
  detectLanguage: (q: string) => Lang;
  detectIntent: (q: string) => PersonaIntent;
  getPersonaReply: (intent: PersonaIntent, lang: Lang) => string;
  getThinkingLine: (layer: 1 | 2 | 3 | null | undefined, lang: Lang) => string;
  getStateOneLiner: (state: 'happy' | 'confused' | 'sad' | 'sorry', variant: 'error' | 'quota' | null, lang: Lang) => string;
  hearsayUsed: () => boolean;
  markHearsayUsed: () => void;
}

/** Hook: encapsulates persona engine state (line rotation, session counters). */
export function usePersona(): PersonaContext {
  const lastLines = useRef<Record<string, string>>({});
  const hearsayUsedRef = useRef(false);
  const lastCatchphraseAt = useRef(-99);
  const turnCount = useRef(0);

  const getLang = useCallback((q: string) => detectLanguage(q), []);
  const getIntent = useCallback((q: string) => detectPersonaIntent(q), []);

  const getReply = useCallback((intent: PersonaIntent, lang: Lang) => {
    return getPersonaReply(intent, lang, lastLines.current);
  }, []);

  const getThinkingLine = useCallback((layer: 1 | 2 | 3 | null | undefined, lang: Lang): string => {
    turnCount.current += 1;
    let bank: string[] = [];
    if (layer === 1) bank = personaData.states.thinking.L1[lang];
    else if (layer === 2) bank = personaData.states.thinking.L2[lang];
    else if (layer === 3) bank = personaData.states.thinking.L3[lang];
    else bank = personaData.states.thinking.neutral[lang];

    const key = `thinking-${layer ?? 'neutral'}`;
    const line = pickLine(bank, lastLines.current[key] ?? '');
    lastLines.current[key] = line;

    // Optionally attach a catchphrase (max 1 per reply, min 3 turns gap)
    const gap = turnCount.current - lastCatchphraseAt.current;
    if (gap >= personaData.limits.catchphrase_min_gap_turns && Math.random() < 0.25) {
      const cp = personaData.catchphrases[Math.floor(Math.random() * personaData.catchphrases.length)];
      if (cp) {
        lastCatchphraseAt.current = turnCount.current;
        return `${cp.en} ${line}`;
      }
    }
    return line;
  }, []);

  const getStateOneLiner = useCallback((
    s: 'happy' | 'confused' | 'sad' | 'sorry',
    variant: 'error' | 'quota' | null,
    lang: Lang,
  ): string => {
    if (s === 'sorry') {
      const v = variant === 'quota' ? 'quota' : 'error';
      const bank = personaData.states.sorry[v][lang];
      const key = `sorry-${v}`;
      const line = pickLine(bank, lastLines.current[key] ?? '');
      lastLines.current[key] = line;
      return line;
    }
    const bank = (personaData.states as unknown as Record<string, { en: string[]; ru: string[] }>)[s]?.[lang] ?? [];
    const key = `state-${s}`;
    const line = pickLine(bank, lastLines.current[key] ?? '');
    lastLines.current[key] = line;
    return line;
  }, []);

  return {
    detectLanguage: getLang,
    detectIntent: getIntent,
    getPersonaReply: getReply,
    getThinkingLine,
    getStateOneLiner,
    hearsayUsed: () => hearsayUsedRef.current,
    markHearsayUsed: () => { hearsayUsedRef.current = true; },
  };
}
