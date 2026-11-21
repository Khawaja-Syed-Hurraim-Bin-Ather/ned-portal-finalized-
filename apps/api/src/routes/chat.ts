import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError, detectLanguage } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { generateChatResponse, LLM_CONFIG } from '../lib/llm-gateway';
import { faqMatcher } from '../lib/faq-matcher';
import { matchLayer1 } from '../lib/kb-matcher';
import { resolveFacultyQuery } from '../lib/faculty-resolver';
import {
  checkCourseCodeLookup,
  checkSemesterCoursesLookup,
  checkCareerTracksLookup,
  checkRecognizedUnanswered,
  checkDynamicStatsLookup,
} from '../lib/academic-resolver';

export const chatRouter = Router();

// ─── Input Validation ─────────────────────────────────────────────────────────

const ChatMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(300, 'Message cannot exceed 300 characters'),
  preferOffline: z.boolean().optional().default(false),
  lang: z.enum(['en', 'ru']).optional(),
  emotion: z.string().optional(),
});

// ─── Distress Safety Handler (Rule #9 & SRS 5.5) ──────────────────────────────

const DISTRESS_PATTERNS = [
  /\b(kill myself|want to die|suicide|end my life|end it all)\b/i,
  /\b(marna chahta hoon|jaan de doon|zindagi khatam|mar jaoon|khudkushi)\b/i,
];

function checkDistress(message: string, lang: 'en' | 'ru'): string | null {
  for (const re of DISTRESS_PATTERNS) {
    if (re.test(message)) {
      if (lang === 'ru') {
        return (
          'Please yeh mat socho — tumhari zindagi bohat qeemti hai. Barah-e-karam foran kisi se baat karo:\n\n' +
          '• Umang Pakistan Helpline: 0311-7786264 (24/7)\n' +
          '• Rozan Counselling Helpline: 0800-22444\n' +
          '• Apne department advisor ya family se foran rabta karo. Tum akele nahi ho.'
        );
      }
      return (
        'Please do not go through this alone — your life has immense value. Please reach out to someone who can help right now:\n\n' +
        '• Umang Pakistan Mental Health Helpline: 0311-7786264 (24/7 free & confidential)\n' +
        '• Rozan Counselling Helpline: 0800-22444\n' +
        '• Please talk to your academic advisor or a family member immediately.'
      );
    }
  }
  return null;
}

// ─── Motivation Pool for Emotional Support (§7.5) ─────────────────────────────

interface MotivationItem {
  en: string;
  ru: string;
}

const MOTIVATION_POOL: Record<string, MotivationItem[]> = {
  'E-FAIL': [
    { en: 'A backlog is a hurdle, not a verdict — let\'s look at the next step.', ru: 'Yeh rukawat hai, anjaam nahi — chalo agla step dekhte hain.' },
    { en: 'Failing a course is tough, but it doesn\'t define your degree — we can plan a clear recovery.', ru: 'Paper reh jana mushkil zaroor hai par degree khatam nahi hui — aasan hal nikaal lete hain.' },
  ],
  'E-LOWCGPA': [
    { en: 'A CGPA can be rebuilt one semester at a time — let\'s look at the facts first.', ru: 'CGPA ek semester mein nahi banta bigarta — pehle facts dekh lete hain.' },
    { en: 'Grades can always be improved with steady planning — you have time to bring it up.', ru: 'Sahi planning se GPA behtar ho sakta hai — abhi tumhare paas waqt hai.' },
  ],
  'E-EXAM': [
    { en: 'Even a small, focused revision session today helps — you can do this.', ru: 'Aaj ki chhoti si focused revision bhi kaam aati hai — tum kar sakte ho.' },
    { en: 'Take a deep breath — breaking revision into 25-minute blocks makes it manageable.', ru: 'Gehri saans lo — thoda thoda karke parhoge to sab cover ho jayega.' },
  ],
  'E-DEMOTIVATED': [
    { en: 'Feeling this way is common, and it\'s worth talking through before making any big decision.', ru: 'Aisa lagna aam baat hai, bara faisla karne se pehle thoda baat kar lete hain.' },
    { en: 'Engineering journeys have tough phases — take a pause, you don\'t have to figure it all out today.', ru: 'Parhai mein aisi rukawatein aati rehti hain — thoda sa saans lo, sab theek ho jayega.' },
  ],
  'E-HOPELESS': [
    { en: 'I\'m glad you said it out loud — you don\'t have to carry this alone.', ru: 'Achha kiya ke tumne bata diya — yeh sab akele uthana zaroori nahi.' },
    { en: 'It feels overwhelming right now, but there is always a way forward — let\'s take it one step at a time.', ru: 'Bohat mushkil lag raha hoga abhi, lekin rasta hamesha nikalta hai — ek step karke dekhte hain.' },
  ],
  'E-STRESS': [
    { en: 'Take a steady breath — we can break this down one step at a time.', ru: 'Gehri saans lo — hum isay aahista aahista ek ek step karke hal kar sakte hain.' },
    { en: 'Pressure is real, but you\'ve handled tough semesters before — let\'s address this calmly.', ru: 'Tension samajh aati hai, par tum pehle bhi mushkil waqt nikaal chuke ho — aaraam se dekhte hain.' },
  ],
};

let lastMotivationIdx = 0;

function getMotivationLine(emotionKey: string, lang: 'en' | 'ru'): string {
  const pool = MOTIVATION_POOL[emotionKey] || MOTIVATION_POOL['E-STRESS'];
  lastMotivationIdx = (lastMotivationIdx + 1) % pool.length;
  const item = pool[lastMotivationIdx] || pool[0];
  return lang === 'ru' ? item.ru : item.en;
}

function detectEmotionKey(text: string): string | null {
  const lower = text.toLowerCase();
  const hasStress = /\b(panic|panicking|stressed|stress|tension|ghabrahat|ghabra|bohat pareshan|pareshan|dar lag raha|dar|frightened|worried)\b/i.test(lower);
  if (/\b(hopeless|give up|quitting|chhor doon|mujhse nahi hoga|khatam ho gaya)\b/i.test(lower)) return 'E-HOPELESS';
  if (/\b(demotivated|exhausted|burnout|himmat nahi|dil nahi kar raha)\b/i.test(lower)) return 'E-DEMOTIVATED';
  if (hasStress && /\b(fail|failed|backlog|f grade)\b/i.test(lower)) return 'E-FAIL';
  if (hasStress && /\b(cgpa|gpa|kam cgpa|cgpa kam)\b/i.test(lower)) return 'E-LOWCGPA';
  if (hasStress && /\b(exam|exams|paper|midterm|final|viva|test)\b/i.test(lower)) return 'E-EXAM';
  if (hasStress) return 'E-STRESS';
  return null;
}

// ─── Layer 2: Knowledge Base & Course/FYP Retrieval ───────────────────────────

interface RetrievalSource {
  title: string;
  type: 'course' | 'fyp' | 'track' | 'kb' | 'professor';
  detail: string;
}

const STOP_WORDS = new Set([
  'what', 'how', 'when', 'where', 'which', 'who', 'why', 'can', 'could', 'would', 'should',
  'is', 'are', 'was', 'were', 'do', 'does', 'did', 'the', 'a', 'an', 'and', 'or', 'in', 'on',
  'at', 'to', 'for', 'of', 'with', 'by', 'about', 'tell', 'me', 'please', 'i', 'my', 'you',
  'your', 'we', 'our', 'need', 'want', 'know', 'give', 'any', 'some', 'there', 'have', 'has',
  'course', 'courses', 'subject', 'subjects',
]);

async function retrieveContext(query: string): Promise<{ contextText: string; sources: RetrievalSource[] }> {
  const allWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const keywords = allWords.filter((w) => !STOP_WORDS.has(w) && w.length >= 3);
  const searchTerms = keywords.length > 0 ? keywords : allWords.filter((w) => w.length >= 3);

  const sources: RetrievalSource[] = [];
  const snippets: string[] = [];

  if (searchTerms.length === 0) {
    return { contextText: '', sources: [] };
  }

  try {
    for (const term of searchTerms.slice(0, 3)) {
      // 1. Search Courses
      const { data: courses } = await supabaseAdmin
        .from('courses')
        .select('code, title, credits, semester, category')
        .or(`title.ilike.%${term}%,code.ilike.%${term}%`)
        .limit(3);

      if (courses && courses.length > 0) {
        for (const c of courses) {
          if (!sources.some((s) => s.title.includes(c.code))) {
            sources.push({
              title: `${c.code}: ${c.title}`,
              type: 'course',
              detail: `Semester ${c.semester}, ${c.credits} credit hours (${c.category})`,
            });
            snippets.push(`Course: ${c.code} - ${c.title} (${c.credits} Cr, Semester ${c.semester}, Category: ${c.category})`);
          }
        }
      }

      // 2. Search Published FYP Projects (Rule #2)
      const { data: fyps } = await supabaseAdmin
        .from('fyp_projects')
        .select('title, year, supervisor, domain_tags')
        .in('review_status', ['approved', 'published'])
        .or(`title.ilike.%${term}%,supervisor.ilike.%${term}%`)
        .limit(3);

      if (fyps && fyps.length > 0) {
        for (const f of fyps) {
          if (!sources.some((s) => s.title === f.title)) {
            sources.push({
              title: f.title,
              type: 'fyp',
              detail: `Year ${f.year}, Supervisor: ${f.supervisor || 'N/A'}`,
            });
            snippets.push(`FYP Project: "${f.title}" (${f.year}, Supervisor: ${f.supervisor || 'Department Faculty'}, Domains: ${(f.domain_tags || []).join(', ')})`);
          }
        }
      }

      // 3. Search Career Tracks
      const { data: tracks } = await supabaseAdmin
        .from('career_tracks')
        .select('title, slug, description')
        .ilike('title', `%${term}%`)
        .limit(2);

      if (tracks && tracks.length > 0) {
        for (const t of tracks) {
          if (!sources.some((s) => s.title === t.title)) {
            sources.push({
              title: t.title,
              type: 'track',
              detail: t.description || 'Career roadmap track',
            });
            snippets.push(`Career Track: ${t.title} - ${t.description || ''}`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Chat-Route] Retrieval error:', err);
  }

  return {
    contextText: snippets.join('\n\n'),
    sources: sources.slice(0, 6),
  };
}

// ─── Layer 4: Record Unanswered Questions ─────────────────────────────────────

async function recordUnanswered(question: string): Promise<void> {
  try {
    await supabaseAdmin.from('chatbot_unanswered').insert({
      question,
      asked_at: new Date().toISOString(),
      resolved: false,
    });
  } catch (err) {
    console.warn('[Chat-Route] Error logging unanswered question:', err);
  }
}

// ─── Route: GET /api/v1/chat/suggestions ──────────────────────────────────────

chatRouter.get('/suggestions', (_req: Request, res: Response) => {
  res.json({
    data: [
      { text: 'What is the minimum CGPA required to graduate?', category: 'Academics' },
      { text: 'When does the Final Year Project start and what are the rules?', category: 'FYP' },
      { text: 'What happens if I fail a prerequisite course?', category: 'Prerequisites' },
      { text: 'What is the passing grade and grading scale at NED?', category: 'Grading' },
      { text: 'How do I contact a faculty member for project supervision?', category: 'Supervision' },
      { text: 'What is the maximum allowed credit hours per semester?', category: 'Regulations' },
    ],
  });
});

// ─── Route: POST /api/v1/chat ─────────────────────────────────────────────────

chatRouter.post('/', async (req: Request, res: Response) => {
  const parsed = ChatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', parsed.error.errors[0]?.message || 'Invalid chat message', parsed.error.errors));
    return;
  }

  const { message, preferOffline } = parsed.data;
  const lang: 'en' | 'ru' = parsed.data.lang || detectLanguage(message);
  const detectedEmotion = parsed.data.emotion || detectEmotionKey(message);
  const userId = req.user?.id || null;
  const disclaimer = 'Guidance estimates, not official university decisions.';

  // Helper to attach motivation if emotion was detected
  const wrapAnswer = (rawAnswer: string, isEmotionPure = false): { answer: string; avatarState?: string } => {
    if (detectedEmotion) {
      const motivation = getMotivationLine(detectedEmotion, lang);
      if (isEmotionPure) {
        return { answer: motivation, avatarState: 'sad' };
      }
      return { answer: `${motivation}\n\n${rawAnswer}`, avatarState: 'sad' };
    }
    return { answer: rawAnswer };
  };

  // ─── 0. DISTRESS SAFETY CHECK (Rule #9 & SRS 5.5) ───────────────────────────
  const distressReply = checkDistress(message, lang);
  if (distressReply) {
    res.json({
      data: {
        answer: distressReply,
        layer: 1,
        source: 'safety_distress',
        source_type: 'protocol',
        sources: [],
        disclaimer,
        avatarState: 'sad',
      },
    });
    return;
  }

  // ─── 0B. Live Database Dynamic Stats Lookup: G14 (Faculty count), G15 (FYP count), G16 (FYP examples)
  const statsRes = await checkDynamicStatsLookup(message, lang);
  if (statsRes && statsRes.answer) {
    const wrapped = wrapAnswer(statsRes.answer);
    res.json({
      data: {
        answer: wrapped.answer,
        layer: 2,
        source: statsRes.sourceType || 'dynamic_db_stats',
        source_type: 'database',
        sources: [],
        disclaimer,
        avatarState: wrapped.avatarState || 'idle',
      },
    });
    return;
  }

  // ─── LAYER 1: Preloaded Verified Answers (Instant, 0 latency, 0 tokens) ─────
  const kbResult = await matchLayer1(message, lang);
  if (kbResult.matched && kbResult.answer) {
    const wrapped = wrapAnswer(kbResult.answer);
    res.json({
      data: {
        answer: wrapped.answer,
        layer: 1,
        source: 'preloaded_official',
        source_type: kbResult.source,
        sources: [],
        disclaimer,
        avatarState: wrapped.avatarState || 'happy',
      },
    });
    return;
  }

  // ─── LAYER 2: Direct Academic & Faculty Entity Resolvers ────────────────────

  // 2A. Faculty Resolver (Exact profile, ambiguity clarification, or domain search)
  const facultyRes = await resolveFacultyQuery(message, lang);
  if (facultyRes.status === 'matched' && facultyRes.answer) {
    const wrapped = wrapAnswer(facultyRes.answer);
    res.json({
      data: {
        answer: wrapped.answer,
        layer: 2,
        source: 'faculty_profile',
        source_type: 'database',
        sources: [{ title: facultyRes.matchedProfessor?.name || 'Faculty', type: 'professor', detail: facultyRes.matchedProfessor?.rank || 'Faculty' }],
        disclaimer,
        avatarState: wrapped.avatarState || 'idle',
      },
    });
    return;
  }

  if (facultyRes.status === 'ambiguous' && facultyRes.answer) {
    res.json({
      data: {
        answer: facultyRes.answer,
        layer: 2,
        source: 'faculty_clarification',
        source_type: 'database',
        sources: (facultyRes.candidates || []).map((c) => ({ title: c.name, type: 'professor', detail: c.rank || '' })),
        disclaimer,
        avatarState: 'confused',
      },
    });
    return;
  }

  if (facultyRes.status === 'domain_search' && facultyRes.answer) {
    const wrapped = wrapAnswer(facultyRes.answer);
    res.json({
      data: {
        answer: wrapped.answer,
        layer: 2,
        source: 'faculty_domain_search',
        source_type: 'database',
        sources: (facultyRes.candidates || []).map((c) => ({ title: c.name, type: 'professor', detail: c.rank || '' })),
        disclaimer,
        avatarState: wrapped.avatarState || 'idle',
      },
    });
    return;
  }

  if (facultyRes.status === 'not_found' && facultyRes.answer) {
    if (facultyRes.logUnanswered) await recordUnanswered(message);
    res.json({
      data: {
        answer: facultyRes.answer,
        layer: 4,
        source: 'faculty_not_found',
        source_type: 'database',
        sources: [],
        disclaimer,
        reason: 'not_found',
        avatarState: 'confused',
      },
    });
    return;
  }

  // 2B. Recognised Unanswered Topics (§12.1 / §12.2)
  const redirectRes = checkRecognizedUnanswered(message, lang);
  if (redirectRes && redirectRes.answer) {
    if (redirectRes.logUnanswered) await recordUnanswered(message);
    res.json({
      data: {
        answer: redirectRes.answer,
        layer: 4,
        source: 'redirect_unanswered',
        source_type: 'database',
        sources: [],
        disclaimer,
        reason: 'not_found',
        avatarState: 'confused',
      },
    });
    return;
  }

  // 2C. Course Code Direct Lookup (e.g. CS-218, CS-222)
  const courseRes = checkCourseCodeLookup(message, lang);
  if (courseRes && courseRes.answer) {
    const wrapped = wrapAnswer(courseRes.answer);
    res.json({
      data: {
        answer: wrapped.answer,
        layer: 2,
        source: 'course_catalog',
        source_type: 'database',
        sources: [],
        disclaimer,
        avatarState: wrapped.avatarState || 'idle',
      },
    });
    return;
  }

  // 2D. Semester Courses Lookup (e.g. "courses in semester 3")
  const semRes = checkSemesterCoursesLookup(message, lang);
  if (semRes && semRes.answer) {
    const wrapped = wrapAnswer(semRes.answer);
    res.json({
      data: {
        answer: wrapped.answer,
        layer: 2,
        source: 'semester_catalog',
        source_type: 'database',
        sources: [],
        disclaimer,
        avatarState: wrapped.avatarState || 'idle',
      },
    });
    return;
  }

  // 2E. Career Tracks Direct Lookup (G10)
  const trackRes = await checkCareerTracksLookup(message, lang);
  if (trackRes && trackRes.answer) {
    const wrapped = wrapAnswer(trackRes.answer);
    res.json({
      data: {
        answer: wrapped.answer,
        layer: 2,
        source: 'career_tracks',
        source_type: 'database',
        sources: [],
        disclaimer,
        avatarState: wrapped.avatarState || 'idle',
      },
    });
    return;
  }


  // ─── FAQ MATCHER (Legacy preloaded intents) ───────────────────────────────────
  const userRole = (req.user?.role as 'public' | 'enrolled' | 'admin') || 'public';
  const faqResult = faqMatcher.match(message, userRole);

  if (faqResult.status === 'direct_match' && faqResult.renderedAnswer) {
    const wrapped = wrapAnswer(faqResult.renderedAnswer);
    res.json({
      data: {
        answer: wrapped.answer,
        layer: 1,
        source: 'preloaded_official',
        source_type: faqResult.sourceLabel || 'database',
        sources: [],
        disclaimer,
        related: faqResult.relatedChips || [],
        publicBehaviour: faqResult.publicBehaviour || 'answer',
        avatarState: wrapped.avatarState || 'happy',
      },
    });
    return;
  }

  if (faqResult.status === 'clarification' && faqResult.renderedAnswer && !preferOffline) {
    res.json({
      data: {
        answer: faqResult.renderedAnswer,
        layer: 1,
        source: 'clarification',
        sources: [],
        disclaimer,
        suggestions: faqResult.suggestions || [],
        related: faqResult.relatedChips || [],
        avatarState: 'confused',
      },
    });
    return;
  }

  // ─── LAYER 2: Retrieval ─────────────────────────────────────────────────────
  const { contextText, sources } = await retrieveContext(message);

  // If user requested offline mode or LLM is explicitly disabled (Rule #5)
  if (preferOffline || LLM_CONFIG.provider === 'off' || !process.env.GEMINI_API_KEY) {
    if (sources.length > 0) {
      const summaryPrefix =
        lang === 'ru'
          ? 'NED CISE ke records ke mutabiq yeh maloomat mili hain:\n\n'
          : 'Based on NED CISE departmental records, here are the matching resources:\n\n';
      const summary = summaryPrefix + sources.map((s, idx) => `${idx + 1}. **${s.title}** (${s.type}): ${s.detail}`).join('\n');
      const wrapped = wrapAnswer(summary);

      res.json({
        data: {
          answer: wrapped.answer,
          layer: 2,
          source: 'retrieval_offline',
          sources,
          disclaimer,
          avatarState: wrapped.avatarState || 'idle',
        },
      });
      return;
    }

    // No retrieval match in offline mode -> Layer 4
    await recordUnanswered(message);
    const offlineFallback =
      lang === 'ru'
        ? 'Mere paas yeh maloomat official NED CISE records mein maujood nahi hain. Meherbani karke department ka notice board dekh lo ya academic advisor se pooch lo.'
        : 'I do not have that information based on the official NED CISE resources available. Please consult the CISE department or your academic advisor.';
    const wrapped = wrapAnswer(offlineFallback, true);

    res.json({
      data: {
        answer: wrapped.answer,
        layer: 4,
        source: 'fallback',
        sources: [],
        disclaimer,
        reason: 'not_found',
        avatarState: wrapped.avatarState || 'confused',
      },
    });
    return;
  }

  // ─── LAYER 3: LLM Generation ────────────────────────────────────────────────
  if (contextText.length > 0) {
    try {
      const llmResult = await generateChatResponse({
        userId,
        question: message,
        context: contextText,
        lang,
      });

      const wrapped = wrapAnswer(llmResult.answer);
      res.json({
        data: {
          answer: wrapped.answer,
          layer: 3,
          source: `llm_${llmResult.provider}`,
          sources,
          disclaimer,
          avatarState: wrapped.avatarState || 'idle',
        },
      });
      return;
    } catch (err: unknown) {
      console.warn('[Chat-Route] LLM generation failed, falling back:', err);
      // Fallback: If retrieval context exists, return Layer 2 composed direct summary
      if (sources.length > 0) {
        const summaryPrefix =
          lang === 'ru'
            ? 'NED CISE ke records ke mutabiq yeh maloomat mili hain:\n\n'
            : 'Here are the matching NED CISE department records:\n\n';
        const summary = summaryPrefix + sources.map((s, idx) => `${idx + 1}. **${s.title}** (${s.type}): ${s.detail}`).join('\n');
        const wrapped = wrapAnswer(summary);

        res.json({
          data: {
            answer: wrapped.answer,
            layer: 2,
            source: 'retrieval_fallback',
            sources,
            disclaimer,
            avatarState: wrapped.avatarState || 'sorry',
          },
        });
        return;
      }
    }
  }

  // ─── LAYER 4: Fallback (Rule #6 & Section 9.3) ──────────────────────────────
  await recordUnanswered(message);
  const notFoundText =
    lang === 'ru'
      ? 'Mere paas yeh maloomat official NED CISE records mein maujood nahi hain. Meherbani karke department ka notice board dekh lo ya academic advisor se pooch lo.'
      : 'I do not have that information based on the official NED CISE resources available. Please consult the CISE department or your academic advisor.';
  const wrapped = wrapAnswer(notFoundText, Boolean(detectedEmotion));

  res.json({
    data: {
      answer: wrapped.answer,
      layer: 4,
      source: 'fallback',
      sources: [],
      disclaimer,
      reason: 'not_found',
      avatarState: wrapped.avatarState || 'confused',
    },
  });
});
