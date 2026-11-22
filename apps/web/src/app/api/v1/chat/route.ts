import { NextRequest, NextResponse } from 'next/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatRequest {
  message: string;
  preferOffline?: boolean;
  lang?: 'en' | 'ru';
}

const DISCLAIMER = 'Guidance estimates, not official university decisions.';

// ─── Distress Safety Handler ──────────────────────────────────────────────────

const DISTRESS_PATTERNS = [
  /\b(kill myself|want to die|suicide|end my life|end it all)\b/i,
  /\b(marna chahta hoon|jaan de doon|zindagi khatam|mar jaoon|khudkushi)\b/i,
];

function checkDistress(message: string, isRu: boolean): string | null {
  for (const re of DISTRESS_PATTERNS) {
    if (re.test(message)) {
      if (isRu) {
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

// ─── Layer 1 Verified Static Fallbacks ───────────────────────────────────────

interface StaticIntent {
  intentId: string;
  enPatterns: string[];
  ruPatterns: string[];
  enAnswer: string;
  ruAnswer: string;
}

const STATIC_INTENTS: StaticIntent[] = [
  {
    intentId: 'G00',
    enPatterns: [
      'hi', 'hello', 'hey', 'salam', 'assalam', 'aoa', 'greetings', 'help',
      'who are you', 'what can you do', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'how are you doing', 'how r u', 'how are u', 'whats up', 'what is up'
    ],
    ruPatterns: [
      'salam', 'assalam o alaikum', 'assalam alaikum', 'kya haal hai', 'aap kaun ho', 'abdul bari',
      'kaise ho', 'kese ho', 'kaise hain', 'kese hain', 'aap kaise ho', 'aap kaise hain',
      'ap kaise ho', 'ap kese ho', 'kya haal', 'haal chaal', 'sab theek', 'kya chal raha hai',
      'kaise ho abdul bari', 'abdul bari kaise ho'
    ],
    enAnswer: 'Hello! I am doing well, thank you! I am the EduCompass Academic Assistant Abdul Bari for NED University Computer & Information Systems Engineering. You can ask me about degree requirements, course prerequisites, grading scales, FYP rules & archive, faculty research domains, and career roadmaps.',
    ruAnswer: 'Salam! Main theek hoon, shukriya! Main EduCompass ka Academic Assistant Abdul Bari hoon, NED CISE department ke liye. Aap mujhse degree requirements, courses, prerequisites, grading scale, FYP rules aur faculty research ke baare mein pooch sakte hain.',
  },
  {
    intentId: 'G01',
    enPatterns: [
      'minimum cgpa', 'cgpa to graduate', 'passing cgpa', 'required cgpa',
      'cgpa needed', 'graduation cgpa', 'what cgpa do i need', 'how much cgpa to graduate', 'lowest cgpa'
    ],
    ruPatterns: [
      'graduate hone ke liye kitna cgpa', 'kam az kam cgpa kitna', 'minimum cgpa kitna hai',
      'degree ke liye cgpa kitna chahiye', 'cgpa kitna hona chahiye', 'pass hone ke liye cgpa',
      'cgpa kitna', 'kam az kam cgpa', 'cgpa chahiye'
    ],
    enAnswer: 'To graduate from NED University CISE, you need a minimum CGPA of 2.00.',
    ruAnswer: 'Graduate hone ke liye kam az kam 2.00 CGPA chahiye.',
  },
  {
    intentId: 'G02',
    enPatterns: [
      'passing grade', 'minimum passing grade', 'pass mark', 'minimum grade to pass',
      'pass marks', 'what grade is fail'
    ],
    ruPatterns: [
      'passing grade kya hai', 'pass hone ke liye kya chahiye', 'minimum grade kya hai',
      'pass marks kitne hain', 'kitne marks pe pass'
    ],
    enAnswer: 'The minimum passing grade is D (1.0 grade point, 50% marks).',
    ruAnswer: 'Minimum passing grade D hai (1.0 grade point, yaani 50% marks).',
  },
  {
    intentId: 'G03',
    enPatterns: [
      'retake course', 'repeat course', 'which grade counts', 'improve grade',
      'grade improvement', 'repeat a failed course', 'retake a course'
    ],
    ruPatterns: [
      'course dobara parhna', 'repeat karna', 'kaun sa grade count hoga',
      'grade improve kaise', 'fail course dobara', 'retake kaise', 'course repeat'
    ],
    enAnswer: 'If you repeat a course, the higher grade replaces the earlier grade in your CGPA calculation.',
    ruAnswer: 'Course repeat karo to CGPA mein higher grade purane grade ki jagah count hota hai.',
  },
  {
    intentId: 'G04',
    enPatterns: [
      'max credits', 'credit limit', 'maximum credit hours', 'credit ceiling',
      'how many credits can i take', 'overload', '21 credits', 'credit overload'
    ],
    ruPatterns: [
      'ek semester mein kitne credit hours', 'zyada se zyada credit hours',
      'credit limit kitni hai', 'overload kaise', '21 credit hours', 'credit limit'
    ],
    enAnswer: 'The regular maximum is 18 credit hours per semester. An overload of up to 21 credit hours is possible with the Chairman\'s approval.',
    ruAnswer: 'Aam taur par ek semester mein zyada se zyada 18 credit hours le sakte ho. 21 credit hours tak overload Chairman ki manzoori se mumkin hai.',
  },
  {
    intentId: 'G05',
    enPatterns: [
      'total credit hours', 'degree credit hours', 'how many credits in degree',
      'total credits', 'credits to graduate', 'how many semesters is the be cs program'
    ],
    ruPatterns: [
      'degree mein kul kitne credit hours', 'total credit hours kitne',
      'graduate hone ke liye kitne credits', 'total credit hours', 'be cs kitne semester'
    ],
    enAnswer: 'For batch 2018 onwards, the BE(CS) degree is a 4-year program over 8 regular semesters, with 136 credit hours in total.',
    ruAnswer: 'Degree 136 credit hours ki hai, jo 8 regular semesters (4 saal) mein hoti hai.',
  },
  {
    intentId: 'G06',
    enPatterns: [
      'how many courses', 'total courses', 'number of courses', 'how many subjects'
    ],
    ruPatterns: [
      'kitne courses hain', 'kul kitne subjects', 'total courses kitne', 'kitne courses'
    ],
    enAnswer: 'The program has 53 courses in total, including theory courses and practical labs.',
    ruAnswer: 'Program mein kul 53 courses hain, jin mein theory aur practical labs shamil hain.',
  },
  {
    intentId: 'G07',
    enPatterns: [
      'failed prereq', 'fail prerequisite', 'failed prerequisite', 'locked course',
      'cannot register course', 'why is my course locked', 'prerequisite failed what happens',
      'fail a prerequisite', 'fail a prerequisite course', 'if i fail a prerequisite',
      'what happens if i fail a prerequisite', 'what happens if i fail a prerequisite course'
    ],
    ruPatterns: [
      'prerequisite fail ho gaya', 'prereq fail', 'course lock kyun',
      'agla course kyun nahi mil raha', 'prerequisite fail to kya hoga',
      'agar prerequisite fail', 'prereq fail ho jaye'
    ],
    enAnswer: 'If you fail a prerequisite, the courses that depend on it stay locked until you pass the prerequisite.',
    ruAnswer: 'Agar prerequisite fail ho jaye to jo courses us par depend karte hain woh us waqt tak lock rehte hain jab tak tum prerequisite pass nahi kar lete.',
  },
  {
    intentId: 'G08',
    enPatterns: [
      'when fyp starts', 'fyp start', '7th semester fyp', 'fyp semester',
      'fyp timing', 'when do i start fyp', 'fyp duration', 'fyp guidelines'
    ],
    ruPatterns: [
      'fyp kab shuru hota hai', 'fyp kis semester mein', 'fyp kab start',
      'fyp kitne semester ka', 'fyp kab shuru', 'fyp rules'
    ],
    enAnswer: 'To start your FYP at NED University: 1. Explore past approved projects in the FYP Portal. 2. Shortlist domains and supervisors. The Final Year Project is CS-406: Part I runs in Semester 7 and Part II in Semester 8, 3 credit hours each.',
    ruAnswer: 'Final Year Project CS-406 hai: Part I Semester 7 mein aur Part II Semester 8 mein hota hai, har part 3 credit hours ka.',
  },
  {
    intentId: 'G09',
    enPatterns: [
      'how to get supervisor', 'find supervisor', 'contact professor',
      'who can supervise my fyp', 'fyp supervisor', 'supervisor fyp'
    ],
    ruPatterns: [
      'supervisor kaise milega', 'supervisor kaise dhoondun', 'fyp ke liye professor',
      'kis professor se fyp', 'supervisor kaise'
    ],
    enAnswer: 'Explore faculty members in the Professor Directory to find matching research areas. Reach out via email with your CV and a 2-line project abstract.',
    ruAnswer: 'Professor Directory mein faculty ki research areas dekho aur apne project idea se match karo. Phir apna CV aur 2 line ka project idea email kar do.',
  },
];

// ─── Course Code Catalog ──────────────────────────────────────────────────────

const COURSE_CATALOG: Record<string, string> = {
  'cs-301': 'CS-301 (Microprocessor Based System Design) is a 4 credit hour course (Semester 6). Category: core computing. Prerequisite: CS-221.',
  'cs-221': 'CS-221 (Computer Organization & Architecture) is a 4 credit hour course (Semester 4). Category: core computing. Prerequisite: CS-111.',
  'cs-111': 'CS-111 (Computer Programming) is a 4 credit hour course (Semester 1). Category: core computing. Prerequisite: None.',
  'cs-212': 'CS-212 (Data Structures and Algorithms) is a 4 credit hour course (Semester 3). Category: core computing. Prerequisite: CS-111.',
  'cs-311': 'CS-311 (Operating Systems) is a 4 credit hour course (Semester 5). Category: core computing. Prerequisite: CS-212.',
  'cs-406': 'CS-406 (Final Year Project) is a 6 credit hour capstone course across Semester 7 (Part I) and Semester 8 (Part II).',
};

// ─── Faculty Catalog ─────────────────────────────────────────────────────────

const FACULTY_CATALOG: Record<string, string> = {
  'fakhra': 'Dr. Fakhra Aftab is Assistant Professor in the Department of Computer & Information Systems Engineering. Research areas: Computer vision, Web technologies, and AI.',
  'fakra': 'Dr. Fakhra Aftab is Assistant Professor in the Department of Computer & Information Systems Engineering. Research areas: Computer vision, Web technologies, and AI.',
  'sheikh': 'Dr. Muhammad Ali Ismail is Professor and Chairman of Computer & Information Systems Engineering at NED University.',
  'ismail': 'Dr. Muhammad Ali Ismail is Professor and Chairman of Computer & Information Systems Engineering at NED University.',
};

// ─── POST /api/v1/chat Handler ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const rawMessage = (body.message || '').trim();

    if (!rawMessage) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Message cannot be empty' } },
        { status: 400 }
      );
    }

    const lower = rawMessage.toLowerCase();

    // 1. Distress Check
    const isRomanUrdu = body.lang === 'ru' || /\b(kaise|kese|kya|hai|hain|ho|mein|ap|aap|bhi|kar|chahiye|shukriya|theek)\b/i.test(lower);
    const distressAnswer = checkDistress(rawMessage, isRomanUrdu);
    if (distressAnswer) {
      return NextResponse.json({
        data: {
          answer: distressAnswer,
          layer: 1,
          source: 'distress_protocol',
          source_type: 'safety',
          sources: [],
          disclaimer: DISCLAIMER,
          avatarState: 'distress',
        },
      });
    }

    // 2. Layer 1 Static Intent Matching
    for (const intent of STATIC_INTENTS) {
      const patterns = isRomanUrdu ? intent.ruPatterns : intent.enPatterns;
      for (const pat of patterns) {
        if (lower === pat || lower.includes(pat)) {
          return NextResponse.json({
            data: {
              answer: isRomanUrdu ? intent.ruAnswer : intent.enAnswer,
              layer: 1,
              source: 'preloaded_official',
              source_type: 'static_verified',
              sources: [],
              disclaimer: DISCLAIMER,
              avatarState: 'happy',
            },
          });
        }
      }
    }

    // 2B. Smart Intent Keyword Combinations
    if ((lower.includes('fail') || lower.includes('failed')) && (lower.includes('prereq') || lower.includes('prerequisite'))) {
      const g07 = STATIC_INTENTS.find(i => i.intentId === 'G07')!;
      return NextResponse.json({
        data: {
          answer: isRomanUrdu ? g07.ruAnswer : g07.enAnswer,
          layer: 1,
          source: 'preloaded_official',
          source_type: 'static_verified',
          sources: [],
          disclaimer: DISCLAIMER,
          avatarState: 'happy',
        },
      });
    }

    if ((lower.includes('cgpa') || lower.includes('gpa')) && (lower.includes('graduate') || lower.includes('minimum') || lower.includes('need') || lower.includes('pass'))) {
      const g01 = STATIC_INTENTS.find(i => i.intentId === 'G01')!;
      return NextResponse.json({
        data: {
          answer: isRomanUrdu ? g01.ruAnswer : g01.enAnswer,
          layer: 1,
          source: 'preloaded_official',
          source_type: 'static_verified',
          sources: [],
          disclaimer: DISCLAIMER,
          avatarState: 'happy',
        },
      });
    }

    if (lower.includes('fyp') && (lower.includes('start') || lower.includes('when') || lower.includes('guide') || lower.includes('rule') || lower.includes('semester'))) {
      const g08 = STATIC_INTENTS.find(i => i.intentId === 'G08')!;
      return NextResponse.json({
        data: {
          answer: isRomanUrdu ? g08.ruAnswer : g08.enAnswer,
          layer: 1,
          source: 'preloaded_official',
          source_type: 'static_verified',
          sources: [],
          disclaimer: DISCLAIMER,
          avatarState: 'happy',
        },
      });
    }

    // 3. Course Code Lookup
    for (const [code, desc] of Object.entries(COURSE_CATALOG)) {
      const normalizedCode = code.replace('-', '');
      if (lower.includes(code) || lower.includes(normalizedCode)) {
        return NextResponse.json({
          data: {
            answer: desc,
            layer: 2,
            source: 'course_catalog',
            source_type: 'database',
            sources: [],
            disclaimer: DISCLAIMER,
            avatarState: 'idle',
          },
        });
      }
    }

    // 4. Faculty Lookup
    for (const [name, profile] of Object.entries(FACULTY_CATALOG)) {
      if (lower.includes(name)) {
        return NextResponse.json({
          data: {
            answer: profile,
            layer: 2,
            source: 'faculty_profile',
            source_type: 'database',
            sources: [],
            disclaimer: DISCLAIMER,
            avatarState: 'idle',
          },
        });
      }
    }

    // 5. Live Gemini API Fallback if configured
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && !body.preferOffline) {
      try {
        const promptText = `You are Abdul Bari, the friendly and authoritative academic advisor for NED University Department of Computer & Information Systems Engineering (CISE).
Answer the student's question accurately, concisely, and helpfully.
Rules:
- If you do not have verified information, answer: "I do not have that information based on the official NED CISE resources available. Please consult the CISE department or your academic advisor."
- Keep your answer under 100 words.
- If asked in Roman Urdu, reply in Roman Urdu. Otherwise reply in clear English.
Student question: ${rawMessage.slice(0, 300)}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: { maxOutputTokens: 250, temperature: 0.3 },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer) {
            return NextResponse.json({
              data: {
                answer: answer.trim(),
                layer: 3,
                source: 'gemini_gateway',
                source_type: 'ai_grounded',
                sources: [],
                disclaimer: DISCLAIMER,
                avatarState: 'idle',
              },
            });
          }
        }
      } catch (_) {
        // Fall through to offline fallback
      }
    }

    // 6. Graceful Fallback
    const fallbackAnswer = isRomanUrdu
      ? 'Mujhe is baare mein verified official information nahi mili. Barah-e-karam CISE department office ya apne academic advisor se ruju karein.'
      : 'I do not have that information based on the official NED CISE resources available. Please consult the CISE department or your academic advisor.';

    return NextResponse.json({
      data: {
        answer: fallbackAnswer,
        layer: 4,
        source: 'fallback',
        source_type: 'static_verified',
        sources: [],
        disclaimer: DISCLAIMER,
        avatarState: 'thinking',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while processing your request.',
        },
      },
      { status: 500 }
    );
  }
}
