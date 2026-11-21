import { supabaseAdmin } from '../src/lib/supabase';

async function checkLiveCounts() {
  console.log('================================================================');
  console.log(' Live Database Counts for Dynamic Intents G14, G15, G16        ');
  console.log('================================================================');

  // G14: Professors
  const { data: profs, count: profCount } = await supabaseAdmin
    .from('professors')
    .select('id, name, rank', { count: 'exact' })
    .in('review_status', ['approved', 'published', 'extracted']);

  console.log(`G14 Faculty Count (approved/published/extracted): ${profCount || profs?.length || 0}`);

  // G15: FYP Projects
  const { data: fyps, count: fypCount } = await supabaseAdmin
    .from('fyp_projects')
    .select('id, title, year, supervisor', { count: 'exact' })
    .in('review_status', ['approved', 'published']);

  console.log(`G15 FYP Projects Count (approved/published): ${fypCount || fyps?.length || 0}`);

  // G16: FYP Examples (Recent titles)
  const { data: sampleFyps } = await supabaseAdmin
    .from('fyp_projects')
    .select('title, year, supervisor')
    .in('review_status', ['approved', 'published'])
    .order('year', { ascending: false })
    .limit(3);

  console.log('\nG16 Sample FYP Titles for Dynamic Template:');
  sampleFyps?.forEach((f: any, idx: number) => {
    console.log(`${idx + 1}. "${f.title}" (${f.year}, Supervisor: ${f.supervisor || 'Department Faculty'})`);
  });
  console.log('================================================================');
}

checkLiveCounts();
