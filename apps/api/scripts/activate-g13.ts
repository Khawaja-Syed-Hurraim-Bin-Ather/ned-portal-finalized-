import { supabaseAdmin } from '../src/lib/supabase';

async function activateG13() {
  console.log('Activating G13 with approved wording in Supabase chatbot_answers...');

  // EN
  const enAnswer = 'For batch 2018 onwards, the BE(CS) degree is a 4-year program over 8 regular semesters, with 136 credit hours in total.';
  const enPatterns = 'how many semesters, degree duration, program duration, how long is the degree, semesters in degree, is degree 4 years, 8 semesters';

  const { error: errEn } = await supabaseAdmin
    .from('chatbot_answers')
    .update({
      answer_text: enAnswer,
      question_pattern: enPatterns,
      is_active: true,
      review_status: 'approved',
    })
    .eq('intent_id', 'G13')
    .eq('language', 'en');

  if (errEn) {
    console.error('Failed to update G13 EN:', errEn);
  } else {
    console.log('✅ G13 (EN) activated successfully.');
  }

  // RU
  const ruAnswer = 'Batch 2018 aur uske baad ke liye BE(CS) degree 4 saal ka program hai jo 8 regular semesters par mushtamil hai, aur is mein kul 136 credit hours hain.';
  const ruPatterns = 'kitne semesters, degree kitne saal, degree duration kya hai, program kitne saal ka hai, kitne semesters hote hain, 8 semesters';

  const { error: errRu } = await supabaseAdmin
    .from('chatbot_answers')
    .update({
      answer_text: ruAnswer,
      question_pattern: ruPatterns,
      is_active: true,
      review_status: 'approved',
    })
    .eq('intent_id', 'G13')
    .eq('language', 'ru');

  if (errRu) {
    console.error('Failed to update G13 RU:', errRu);
  } else {
    console.log('✅ G13 (RU) activated successfully.');
  }

  // Verify DB state
  const { data: rows } = await supabaseAdmin
    .from('chatbot_answers')
    .select('intent_id, language, is_active, review_status, answer_text')
    .in('intent_id', ['G13', 'G14', 'G15', 'G16', 'U01', 'U02', 'U03']);

  console.log('\nVerification of intent states in Supabase:');
  console.table(rows);
}

activateG13();
