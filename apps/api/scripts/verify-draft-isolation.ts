import { supabaseAdmin } from '../src/lib/supabase';
import { matchLayer1, clearKBCache } from '../src/lib/kb-matcher';

async function check() {
  const { data: allRows } = await supabaseAdmin
    .from('chatbot_answers')
    .select('id, intent_id, is_active, review_status, language');

  console.log('Total rows in chatbot_answers:', allRows?.length);
  const activeCount = allRows?.filter((r) => r.is_active === true).length;
  const draftCount = allRows?.filter((r) => r.is_active === false).length;
  console.log('Active (live) rows count:', activeCount);
  console.log('Draft (inactive) rows count:', draftCount);

  clearKBCache();

  // 1. Query for U03 (hardware sequence) which ONLY exists in draft rows in the DB
  const draftMatch = await matchLayer1('hardware sequence path', 'en');
  console.log('Match for draft-only intent (U03):', draftMatch.matched ? 'MATCHED' : 'UNMATCHED (CORRECT)');
  console.log('Result source:', draftMatch.source);

  // 2. Query for live intent (prerequisite) which exists in live DB
  const liveMatch = await matchLayer1('prerequisite', 'en');
  console.log('Match for live intent:', liveMatch.matched ? 'MATCHED (CORRECT)' : 'UNMATCHED');
  console.log('Live answer source:', liveMatch.source);
}

check();
