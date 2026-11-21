import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { chatRouter } from './chat';
import { clearProfessorCache } from '../lib/faculty-resolver';
import { clearKBCache } from '../lib/kb-matcher';

// ─── Test Professor Fixtures (matches professors.json) ────────────────────────
const TEST_PROFESSORS = [
  {
    slug: 'fakhra-aftab',
    name: 'Dr. Fakhra Aftab',
    title: 'Dr.',
    rank: 'Assistant Professor',
    department: 'Department of Computer & Information Systems Engineering',
    qualification: 'PhD Computer Systems',
    research_areas: 'Computer vision; Web semantics; Software engineering; Deep learning; Embedded systems design',
    domain_tags: ['computer-vision', 'ai-ml', 'embedded', 'web'],
    highlights: 'Gold Medal and First Class First Position (B.E.)',
    review_status: 'extracted',
  },
  {
    slug: 'muhammad-asad-arfeen',
    name: 'Dr. Muhammad Asad Arfeen',
    title: 'Dr.',
    rank: 'Professor',
    department: 'Department of Computer & Information Systems Engineering',
    qualification: 'PhD',
    research_areas: 'Cybersecurity; Malware/ransomware detection; Digital forensics; Internet traffic modelling; Quantum key distribution',
    domain_tags: ['cybersecurity', 'networking'],
    highlights: 'Director ISL',
    review_status: 'extracted',
  },
  {
    slug: 'ali-akhtar',
    name: 'Mr. Engr. Ali Akhtar',
    title: 'Mr. Engr.',
    rank: null,
    department: 'Department of Computer & Information Systems Engineering',
    qualification: 'PhD in progress',
    research_areas: 'Health information systems; Web and software development; Augmented and virtual reality; Machine learning',
    domain_tags: ['web', 'healthcare-tech', 'ar-vr', 'ai-ml'],
    highlights: 'Industry liaison representative',
    review_status: 'extracted',
  },
  {
    slug: 'syeda-hafsa-ahmed',
    name: 'Ms. Syeda Hafsa Ahmed',
    title: 'Ms.',
    rank: 'Lecturer',
    department: 'Department of Computer & Information Systems Engineering',
    qualification: 'PhD in progress',
    research_areas: 'Deep learning; Embedded computing; Approximate computing; Computer vision',
    domain_tags: ['ai-ml', 'computer-vision', 'embedded'],
    highlights: null,
    review_status: 'flagged',
  },
  {
    slug: 'muhammad-ali-ismail',
    name: 'Dr. Muhammad Ali Ismail',
    title: 'Dr.',
    rank: 'Associate Professor',
    department: 'Department of Computer & Information Systems Engineering',
    qualification: 'PhD',
    research_areas: 'Machine learning; Natural language processing; Information retrieval',
    domain_tags: ['ai-ml', 'nlp'],
    highlights: 'Director RCAI',
    review_status: 'extracted',
  },
];

// Mock Supabase admin calls — returns professors when querying professors table (Rule #15)
vi.mock('../lib/supabase', () => {
  const createChainable = (tableName: string) => {
    // Determine what data to return based on the table
    let resultData: any[] = [];
    if (tableName === 'professors') {
      resultData = TEST_PROFESSORS;
    }

    const chain: any = {
      select: vi.fn().mockImplementation(() => chain),
      in: vi.fn().mockImplementation(() => chain),
      or: vi.fn().mockImplementation(() => chain),
      ilike: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => chain),
      limit: vi.fn().mockImplementation(() => chain),
      single: vi.fn().mockImplementation(() => chain),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: resultData, error: null }),
    };
    return chain;
  };

  return {
    supabaseAdmin: {
      from: vi.fn((tableName: string) => createChainable(tableName)),
    },
  };
});

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/chat', chatRouter);
  return app;
}

describe('EduCompass Chat & Abdul Bari Knowledge Base Expansion (§11 Test Suite)', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    clearProfessorCache();
    clearKBCache();
  });

  const sendPost = async (body: any) => {
    let statusCode = 200;
    let jsonBody: any = null;

    const mockReq: any = { body };
    const mockRes: any = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        jsonBody = data;
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postHandler: any = chatRouter.stack.find((l: any) => l.route?.path === '/' && l.route?.methods?.post)?.route?.stack?.[0]?.handle;
    await postHandler(mockReq, mockRes, vi.fn());
    return { status: statusCode, body: jsonBody };
  };

  describe('11.1 Regression Cases', () => {
    it('handles greetings', async () => {
      const res = await sendPost({ message: 'salam' });
      expect(res.status).toBe(200);
      expect(res.body.data.answer.toLowerCase()).toContain('educompass');
      expect(res.body.data.layer).toBe(1);
    });

    it('rejects input exceeding 300 characters per Rule 4', async () => {
      const res = await sendPost({ message: 'A'.repeat(301) });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('handles distress immediately with emergency numbers (Rule #9 & SRS 5.5)', async () => {
      const resEn = await sendPost({ message: 'i want to kill myself' });
      expect(resEn.body.data.layer).toBe(1);
      expect(resEn.body.data.avatarState).toBe('sad');
      expect(resEn.body.data.answer).toContain('0311-7786264');

      const resRu = await sendPost({ message: 'marna chahta hoon' });
      expect(resRu.body.data.avatarState).toBe('sad');
      expect(resRu.body.data.answer).toContain('0311-7786264');
      expect(resRu.body.data.answer).toContain('Umang');
    });
  });

  describe('11.2 New Behaviour & Language Routing', () => {
    it('answers "minimum cgpa to graduate" via Layer 1 G01', async () => {
      const res = await sendPost({ message: 'minimum cgpa to graduate' });
      expect(res.body.data.layer).toBe(1);
      expect(res.body.data.answer).toContain('2.00');
    });

    it('answers "kya failed prerequisite se course lock hota hai" in Roman Urdu (G07)', async () => {
      const res = await sendPost({ message: 'kya failed prerequisite se course lock hota hai' });
      expect(res.body.data.layer).toBe(1);
      expect(res.body.data.answer).toContain('lock');
      expect(res.body.data.answer).toContain('prerequisite');
    });

    it('resolves Dr. Fakhra Aftab with a pronoun-free profile sentence', async () => {
      const res = await sendPost({ message: 'who is Dr. Fakra Aftab' });
      expect(res.body.data.layer).toBe(2);
      expect(res.body.data.answer).toContain('Fakhra Aftab');
      expect(res.body.data.answer).toContain('Department of Computer & Information Systems Engineering');
      expect(res.body.data.answer).not.toMatch(/\b(he|she|his|her)\b/i);
    });

    it('resolves Dr. Fakhra Aftab in Roman Urdu when asked in Roman Urdu', async () => {
      const res = await sendPost({ message: 'fakhra aftab kaun hain' });
      expect(res.body.data.layer).toBe(2);
      expect(res.body.data.answer).toContain('Fakhra Aftab');
      expect(res.body.data.answer).toContain('department mein');
      expect(res.body.data.answer).not.toMatch(/\b(he|she|his|her)\b/i);
    });

    it('resolves unique nickname "dr fakhra"', async () => {
      const res = await sendPost({ message: 'dr fakhra' });
      expect(res.body.data.layer).toBe(2);
      expect(res.body.data.answer).toContain('Fakhra Aftab');
    });

    it('triggers ambiguity clarification for shared name "tell me about Dr. Ali"', async () => {
      const res = await sendPost({ message: 'tell me about Dr. Ali' });
      expect(res.body.data.layer).toBe(2);
      expect(res.body.data.avatarState).toBe('confused');
      expect(res.body.data.answer).toMatch(/Did you mean|Please provide/);
      expect(res.body.data.sources.length).toBeGreaterThanOrEqual(1);
    });

    it('returns honest not found for unknown professor "who is Dr. Zorbax"', async () => {
      const res = await sendPost({ message: 'who is Dr. Zorbax' });
      expect(res.body.data.layer).toBe(4);
      expect(res.body.data.avatarState).toBe('confused');
      expect(res.body.data.answer).toContain('don\'t have a faculty profile');
    });

    it('resolves domain search "who works on cybersecurity"', async () => {
      const res = await sendPost({ message: 'who works on cybersecurity' });
      expect(res.body.data.layer).toBe(2);
      expect(res.body.data.answer).toContain('Muhammad Asad Arfeen');
    });

    it('resolves course code lookup "CS-218 kya hai" in Roman Urdu', async () => {
      const res = await sendPost({ message: 'CS-218 kya hai' });
      expect(res.body.data.layer).toBe(2);
      expect(res.body.data.answer).toContain('CS-218');
      expect(res.body.data.answer).toContain('Data Structures & Algorithms');
      expect(res.body.data.answer).toContain('credit hours ka course hai');
    });

    it('handles emotional messages by prepending motivation line and setting avatar to sad', async () => {
      const res = await sendPost({ message: 'i am panicking, i failed CS-218' });
      expect(res.body.data.avatarState).toBe('sad');
      expect(res.body.data.answer).toContain('CS-218');
      expect(res.body.data.answer).toMatch(/(hurdle|breath|tough|verdict|step)/i);
    });

    it('handles Roman Urdu tension with Roman Urdu motivation and academic answer', async () => {
      const res = await sendPost({ message: 'bohat tension hai, cgpa kam hai' });
      expect(res.body.data.avatarState).toBe('sad');
      // Should have a motivation line and a CGPA answer
      expect(res.body.data.answer).toMatch(/(2\.00|CGPA|semester|facts)/i);
    });

    it('handles pure hopelessness "mujhse nahi hoga"', async () => {
      const res = await sendPost({ message: 'mujhse nahi hoga' });
      expect(res.body.data.avatarState).toBe('sad');
      expect(res.body.data.answer).toMatch(/(tumne bata diya|akela|akele|rasta|mushkil)/i);
    });

    it('returns honest redirect for recognized unknown topic "when are the exams"', async () => {
      const res = await sendPost({ message: 'when are the exams' });
      expect(res.body.data.layer).toBe(4);
      expect(res.body.data.avatarState).toBe('confused');
      expect(res.body.data.answer).toContain('exam schedule');
      expect(res.body.data.answer).toContain('notice board');
    });

    it('returns Roman Urdu honest redirect for "hostel fees kitni hain"', async () => {
      const res = await sendPost({ message: 'hostel fees kitni hain' });
      expect(res.body.data.layer).toBe(4);
      expect(res.body.data.avatarState).toBe('confused');
      expect(res.body.data.answer).toContain('notice board');
      expect(res.body.data.answer).toContain('verified record nahi hai');
    });

    it('resolves semester courses "courses in semester 3"', async () => {
      const res = await sendPost({ message: 'courses in semester 3' });
      expect(res.body.data.layer).toBe(2);
      expect(res.body.data.answer).toContain('CS-218');
      expect(res.body.data.answer).toContain('CS-220');
    });
  });
});
