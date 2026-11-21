/**
 * EduCompass Academic Direct Entity Resolver (Phase 4 & Phase 7)
 * Source of truth: EDUCOMPASS_KB_EXPANSION_SPEC.md (Section 4.4, Section 10, Section 12)
 * 
 * Directly resolves:
 * 1. Course code lookups (e.g. "CS-218", "CS-222") in EN & RU
 * 2. Semester course lists (e.g. "courses in semester 3", "3rd semester courses") in EN & RU
 * 3. Career tracks overview (G10) in EN & RU
 * 4. Recognised-but-unanswered topic redirects (§12.1 / §12.2) in EN & RU
 * 5. Works fully offline without LLM.
 */

import { detectLanguage, normalizeQuery } from '@educompass/shared';
import { buildDefaultCurriculumGraph } from '../routes/prereq';
import { supabaseAdmin } from './supabase';

export interface AcademicResolveResult {
  status: 'matched' | 'redirect' | 'none';
  answer?: string;
  sourceType?: string;
  topic?: string;
  logUnanswered?: boolean;
}

// ─── Recognized Unanswered Topics Lookup (§12.1 / §12.2) ────────────────────────

interface RedirectTopic {
  id: string;
  topicEn: string;
  topicRu: string;
  patterns: RegExp[];
}

const REDIRECT_TOPICS: RedirectTopic[] = [
  {
    id: 'R01',
    topicEn: 'attendance requirements',
    topicRu: 'attendance requirements',
    patterns: [/\battendance\b/i, /\bhaziri\b/i, /\bshortage of attendance\b/i, /\battendance short\b/i],
  },
  {
    id: 'R02',
    topicEn: 'fees and payments',
    topicRu: 'fees aur payments',
    patterns: [/\bfees?\b/i, /\bchallan\b/i, /\btuition fee\b/i, /\bfee deadline\b/i, /\bhostel fee\b/i],
  },
  {
    id: 'R03',
    topicEn: 'scholarships and financial aid',
    topicRu: 'scholarships aur financial aid',
    patterns: [/\bscholarships?\b/i, /\bfinancial aid\b/i, /\bhec scholarship\b/i, /\bwazifa\b/i],
  },
  {
    id: 'R04',
    topicEn: 'hostel accommodation',
    topicRu: 'hostel accommodation',
    patterns: [/\bhostels?\b/i, /\ballotment\b/i, /\bhostel mess\b/i],
  },
  {
    id: 'R05',
    topicEn: 'exam schedule',
    topicRu: 'exam schedule',
    patterns: [
      /\bwhen (?:are|is) (?:the )?exams?\b/i,
      /\bdatesheet\b/i,
      /\bdate sheet\b/i,
      /\bexam schedule\b/i,
      /\bmidterm dates?\b/i,
      /\bfinal exam dates?\b/i,
      /\bexams? kab\b/i,
    ],
  },
  {
    id: 'R06',
    topicEn: 'registration and enrollment dates',
    topicRu: 'registration aur enrollment ki dates',
    patterns: [/\benrollment deadline\b/i, /\bdate to register\b/i, /\bregistration dates?\b/i, /\bregistration kab\b/i],
  },
  {
    id: 'R07',
    topicEn: 'add/drop dates',
    topicRu: 'add/drop ki dates',
    patterns: [/\badd\s*\/?\s*drop\b/i, /\bwithdraw(?:al)?\b/i, /\bcourse drop\b/i],
  },
  {
    id: 'R08',
    topicEn: 'semester freeze and leave',
    topicRu: 'semester freeze aur leave',
    patterns: [/\bsemester freeze\b/i, /\bfreeze semester\b/i, /\bsemester leave\b/i, /\bdeferment\b/i],
  },
  {
    id: 'R09',
    topicEn: 'transcript and degree requests',
    topicRu: 'transcript aur degree requests',
    patterns: [/\btranscripts?\b/i, /\bprovisional certificate\b/i, /\bdegree certificate\b/i, /\bduplicate degree\b/i],
  },
  {
    id: 'R10',
    topicEn: 'grade recheck and appeals',
    topicRu: 'grade recheck aur appeals',
    patterns: [/\brecheck(?:ing)?\b/i, /\bpaper recheck\b/i, /\bgrade appeal\b/i],
  },
  {
    id: 'R11',
    topicEn: 'section change',
    topicRu: 'section change',
    patterns: [/\bsection change\b/i, /\bswap section\b/i, /\bchange my section\b/i],
  },
  {
    id: 'R12',
    topicEn: 'timetable and class schedule',
    topicRu: 'timetable aur class schedule',
    patterns: [/\btimetable\b/i, /\btime table\b/i, /\bclass schedule\b/i, /\bclass timings?\b/i],
  },
  {
    id: 'R13',
    topicEn: 'internship requirements',
    topicRu: 'internship requirements',
    patterns: [/\binternships?\b/i, /\binternship credits?\b/i, /\binternee\b/i],
  },
  {
    id: 'R14',
    topicEn: 'library and lab timings',
    topicRu: 'library aur lab timings',
    patterns: [/\blibrary timings?\b/i, /\blab timings?\b/i, /\bbook issue\b/i],
  },
  {
    id: 'R15',
    topicEn: 'university transport and bus routes',
    topicRu: 'university transport aur bus routes',
    patterns: [/\bpoint bus\b/i, /\bbus route\b/i, /\btransport\b/i, /\bshuttle\b/i],
  },
  {
    id: 'R16',
    topicEn: 'student ID cards',
    topicRu: 'student ID card',
    patterns: [/\bid card\b/i, /\bstudent card\b/i, /\blost card\b/i],
  },
  {
    id: 'R17',
    topicEn: 'course instructor assignments',
    topicRu: 'course instructor assignments',
    patterns: [/\bwho teaches\b/i, /\bwho is teaching\b/i, /\binstructor for\b/i, /\bkaun parhata hai\b/i, /\bteacher kaun\b/i],
  },
  {
    id: 'R18',
    topicEn: 'faculty contact information and office hours',
    topicRu: 'faculty contact aur office hours',
    patterns: [/\boffice hours\b/i, /\bphone number\b/i, /\bpersonal email\b/i, /\bwhatsapp\b/i],
  },
  {
    id: 'R19',
    topicEn: 'detailed syllabus content',
    topicRu: 'detailed syllabus content',
    patterns: [/\bdetailed syllabus\b/i, /\bcourse outline pdf\b/i, /\bweekly breakdown\b/i],
  },
  {
    id: 'R20',
    topicEn: 'admissions and entry test',
    topicRu: 'admissions aur entry test',
    patterns: [/\badmission test\b/i, /\bentry test\b/i, /\bmerit list\b/i, /\beligibility criteria for admission\b/i],
  },
];

/**
 * Check for recognized-unanswered topics (§12.1 / §12.2)
 */
export function checkRecognizedUnanswered(
  query: string,
  lang: 'en' | 'ru' = 'en'
): AcademicResolveResult | null {
  for (const topic of REDIRECT_TOPICS) {
    if (topic.patterns.some((re) => re.test(query))) {
      const topicName = lang === 'ru' ? topic.topicRu : topic.topicEn;
      const answer =
        lang === 'ru'
          ? `${topicName} ke baare mein mere paas verified record nahi hai. Department ka notice board ya academic advisor confirm kar sakta hai — aur maine tumhara sawal note kar liya hai taake isay add kiya ja sake.`
          : `I don't have verified records for ${topicName}. The departmental notice board or the academic advisor can confirm this — and I've noted your question so it can be added.`;

      return {
        status: 'redirect',
        answer,
        sourceType: 'redirect_unanswered',
        topic: topicName,
        logUnanswered: true,
      };
    }
  }

  return null;
}

/**
 * Check for course code lookup (e.g. "CS-218", "CS-222")
 */
export function checkCourseCodeLookup(
  query: string,
  lang: 'en' | 'ru' = 'en'
): AcademicResolveResult | null {
  // Match standard NED course code like CS-218 or CS218, EE-120, MT-224
  const codeMatch = query.match(/\b([A-Z]{2}-?\d{3})\b/i);
  if (!codeMatch) return null;

  let rawCode = codeMatch[1].toUpperCase();
  if (!rawCode.includes('-')) {
    rawCode = `${rawCode.slice(0, 2)}-${rawCode.slice(2)}`;
  }

  const g = buildDefaultCurriculumGraph();
  const course = g.courses.get(rawCode);
  if (!course) return null;

  // Prerequisite resolution
  let prereqText = 'None';
  let prereqTextRu = 'Koi nahi';
  const rule = g.rules.get(rawCode);
  if (rule) {
    if (rule.type === 'course' && rule.courseCode) {
      prereqText = rule.courseCode;
      prereqTextRu = rule.courseCode;
    } else if (rule.type === 'and' && rule.children) {
      const pCodes = rule.children
        .filter((c) => c.type === 'course' && c.courseCode)
        .map((c) => c.courseCode!);
      if (pCodes.length > 0) {
        prereqText = pCodes.join(' and ');
        prereqTextRu = pCodes.join(' aur ');
      }
    }
  }

  const categoryLabel = course.category?.replace(/_/g, ' ') || 'core';

  let answer: string;
  if (lang === 'ru') {
    answer = `${course.code} (${course.title}) ${course.credits} credit hours ka course hai (Semester ${course.semester}). Category: ${categoryLabel}. Prerequisite: ${prereqTextRu}.`;
  } else {
    answer = `${course.code} (${course.title}) is a ${course.credits} credit hour course (Semester ${course.semester}). Category: ${categoryLabel}. Prerequisite: ${prereqText}.`;
  }

  return {
    status: 'matched',
    answer,
    sourceType: 'course_catalog',
  };
}

/**
 * Check for semester courses list (e.g. "courses in semester 3", "3rd semester courses")
 */
export function checkSemesterCoursesLookup(
  query: string,
  lang: 'en' | 'ru' = 'en'
): AcademicResolveResult | null {
  const semMatch = query.match(
    /(?:semester|sem)\s*([1-8])\b|\b([1-8])(?:st|nd|rd|th)?\s*(?:semester|sem)\b/i
  );
  if (!semMatch) return null;

  const semNum = Number(semMatch[1] || semMatch[2]);
  if (isNaN(semNum) || semNum < 1 || semNum > 8) return null;

  const g = buildDefaultCurriculumGraph();
  const semCourses = Array.from(g.courses.values()).filter((c) => c.semester === semNum);
  if (semCourses.length === 0) return null;

  const courseList = semCourses.map((c) => `${c.code} (${c.title}, ${c.credits} Cr)`).join(', ');

  let answer: string;
  if (lang === 'ru') {
    answer = `Semester ${semNum} ke courses yeh hain: ${courseList}.`;
  } else {
    answer = `Semester ${semNum} courses at NED CISE are: ${courseList}.`;
  }

  return {
    status: 'matched',
    answer,
    sourceType: 'semester_catalog',
  };
}

/**
 * Check for career tracks overview (G10)
 */
export async function checkCareerTracksLookup(
  query: string,
  lang: 'en' | 'ru' = 'en'
): Promise<AcademicResolveResult | null> {
  const isTrackQuery =
    /\b(career tracks?|tracks ki list|career paths?|kaun sa track|which track)\b/i.test(query);

  if (!isTrackQuery) return null;

  // Try fetching live career tracks from DB
  let trackTitles: string[] = [];
  try {
    const { data } = await supabaseAdmin.from('career_tracks').select('title');
    if (data && data.length > 0) {
      trackTitles = data.map((t: any) => t.title);
    }
  } catch {
    // Fall back to default 12 tracks
  }

  if (trackTitles.length === 0) {
    trackTitles = [
      'AI & Machine Learning',
      'Data Science & Big Data',
      'Full-Stack Web Development',
      'Cybersecurity & Digital Forensics',
      'Embedded Systems & IoT',
      'Cloud Architecture & DevOps',
      'Mobile App Engineering',
      'Blockchain & Smart Contracts',
      'Computer Vision & Graphics',
      'Bioinformatics & Health Tech',
      'AR/VR & Game Engineering',
      'Software Quality Assurance & Testing',
    ];
  }

  const trackList = trackTitles.join(', ');
  let answer: string;
  if (lang === 'ru') {
    answer = `Career tracks ${trackTitles.length} hain: ${trackList}.`;
  } else {
    answer = `There are ${trackTitles.length} career tracks: ${trackList}.`;
  }

  return {
    status: 'matched',
    answer,
    sourceType: 'career_tracks',
  };
}
